import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { idbAuthStorage } from "@/lib/idbAuthStorage";
import { User, Session } from "@supabase/supabase-js";
import { setUserId } from "@/lib/analytics";
import {
  PERSISTENT_AUTH_STORAGE_KEY,
  STANDARD_AUTH_STORAGE_KEY,
} from "@/lib/authStorageKeys";
import {
  clearAllCaches,
  forceCacheBustingReload,
  hasExceededRecoveryAttempts,
  incrementRecoveryAttempts,
  resetRecoveryAttempts,
} from "@/lib/cacheManager";

type UserRole = "supporter" | "bestie" | "caregiver" | "moderator" | "admin" | "owner";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_number: number | null;
  profile_avatar_id: string | null;
  coins: number;
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isGuardian: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const syncInProgressRef = useRef(false);
  const mirroringInProgressRef = useRef(false);
  const lastProcessedSessionIdRef = useRef<string | null>(null);
  const initCompletedRef = useRef(false);
  const authChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAuthChangeRef = useRef<{ source: "persistent" | "standard"; event: string; session: Session | null } | null>(null);

  /**
   * Clears invalid auth tokens from storage without calling signOut endpoints.
   */
  const clearInvalidStorageEntry = async (
    storage: "localStorage" | "indexedDB",
    storageKey: string
  ) => {
    console.log(`[AuthContext] Clearing invalid session from ${storage}`);
    try {
      if (storage === "localStorage") {
        localStorage.removeItem(storageKey);
      } else {
        await idbAuthStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn(`[AuthContext] Failed to clear ${storage}:`, e);
    }
  };

  /**
   * Simplified reconciliation: only validate persistent client (source of truth),
   * then mirror to standard client. 2 network calls instead of 4.
   */
  const reconcileAuthSessions = async (): Promise<Session | null> => {
    if (syncInProgressRef.current) return session;
    syncInProgressRef.current = true;

    try {
      // Step 1: Get session from persistent client (source of truth)
      const { data: { session: persistentSession } } = await supabasePersistent.auth.getSession();

      // Step 2: Validate the persistent session server-side (1 getUser call)
      let validSession: Session | null = null;
      if (persistentSession?.access_token) {
        try {
          const { data: { user }, error } = await supabasePersistent.auth.getUser();
          if (!error && user) {
            validSession = persistentSession;
          } else {
            console.log("[AuthContext] Persistent session invalid:", error?.message);
            await clearInvalidStorageEntry("indexedDB", PERSISTENT_AUTH_STORAGE_KEY);
          }
        } catch (e) {
          console.log("[AuthContext] Persistent session validation exception:", e);
        }
      }

      // Step 3: If persistent has no valid session, try standard as fallback
      if (!validSession) {
        const { data: { session: standardSession } } = await supabase.auth.getSession();
        if (standardSession?.access_token) {
          try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (!error && user) {
              validSession = standardSession;
              // Mirror to persistent
              mirroringInProgressRef.current = true;
              try {
                await supabasePersistent.auth.setSession({
                  access_token: standardSession.access_token,
                  refresh_token: standardSession.refresh_token,
                });
              } catch { /* ignore */ } finally {
                mirroringInProgressRef.current = false;
              }
            } else {
              await clearInvalidStorageEntry("localStorage", STANDARD_AUTH_STORAGE_KEY);
            }
          } catch { /* ignore */ }
        }
      }

      // Step 4: Mirror valid session to standard client if needed
      if (validSession?.access_token && validSession?.refresh_token) {
        mirroringInProgressRef.current = true;
        try {
          await supabase.auth.setSession({
            access_token: validSession.access_token,
            refresh_token: validSession.refresh_token,
          });
        } catch { /* ignore */ } finally {
          mirroringInProgressRef.current = false;
        }
      }

      return validSession;
    } catch (error) {
      console.warn("[AuthContext] Reconciliation error:", error);
      return session;
    } finally {
      syncInProgressRef.current = false;
    }
  };

  const fetchUserData = async (currentUser: User) => {
    try {
      const [roleResult, profileResult] = await Promise.all([
        supabasePersistent
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        supabasePersistent
          .from("profiles")
          .select("id, display_name, avatar_number, profile_avatar_id, coins")
          .eq("id", currentUser.id)
          .maybeSingle()
      ]);

      if (roleResult.data) {
        setRole(roleResult.data.role as UserRole);
      }

      if (profileResult.data) {
        const profileData = profileResult.data;
        setProfile({
          id: profileData.id,
          display_name: profileData.display_name,
          avatar_number: profileData.avatar_number,
          profile_avatar_id: profileData.profile_avatar_id,
          coins: profileData.coins,
          role: roleResult.data?.role as UserRole
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refetchProfile = async () => {
    if (!user) return;
    await fetchUserData(user);
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        initCompletedRef.current = false;

        // Watchdog: 15s safety net for genuinely stuck init (e.g., Safari IndexedDB corruption).
        const alreadyRecovering = window.location.search.includes('__reason=auth_init_timeout');
        const watchdog = alreadyRecovering ? null : window.setTimeout(async () => {
          if (!mounted) return;
          if (initCompletedRef.current) return;
          if (hasExceededRecoveryAttempts()) return;

          const attempt = incrementRecoveryAttempts();
          console.warn(`[AuthContext] Auth init watchdog triggered (attempt ${attempt})`);
          try {
            await clearAllCaches();
          } catch {
            // ignore
          }
          forceCacheBustingReload("auth_init_timeout");
        }, 15000);

        const resolvedSession = await reconcileAuthSessions();

        if (watchdog) window.clearTimeout(watchdog);
        
        if (!mounted) return;

        if (resolvedSession?.user) {
          setSession(resolvedSession);
          setUser(resolvedSession.user);
          setUserId(resolvedSession.user.id);
          await fetchUserData(resolvedSession.user);
          // Auth succeeded — reset stale recovery counter
          resetRecoveryAttempts();
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          initCompletedRef.current = true;
          setLoading(false);
        }
      }
    };

    initAuth();

    /**
     * Core auth change handler — called after debounce.
     */
    const processAuthChange = async (
      source: "persistent" | "standard",
      event: string,
      eventSession: Session | null
    ) => {
      if (!mounted) return;
      
      if (mirroringInProgressRef.current) return;

      const sessionId = eventSession?.user?.id ? `${eventSession.user.id}-${eventSession.expires_at}` : null;
      if (sessionId && sessionId === lastProcessedSessionIdRef.current) return;

      if (event === "SIGNED_IN" && eventSession?.access_token) {
        lastProcessedSessionIdRef.current = sessionId;
        
        mirroringInProgressRef.current = true;
        try {
          if (source === "persistent") {
            await supabase.auth.setSession({
              access_token: eventSession.access_token,
              refresh_token: eventSession.refresh_token,
            });
          } else {
            await supabasePersistent.auth.setSession({
              access_token: eventSession.access_token,
              refresh_token: eventSession.refresh_token,
            });
          }
        } catch { /* ignore */ } finally {
          mirroringInProgressRef.current = false;
        }

        setSession(eventSession);
        setUser(eventSession.user);
        setUserId(eventSession.user.id);
        resetRecoveryAttempts();
        setTimeout(() => {
          if (mounted) fetchUserData(eventSession.user);
        }, 0);
        return;
      }

      const resolvedSession = await reconcileAuthSessions();
      if (!mounted) return;

      setSession(resolvedSession);
      setUser(resolvedSession?.user ?? null);

      if (resolvedSession?.user) {
        setUserId(resolvedSession.user.id);
        resetRecoveryAttempts();
        setTimeout(() => {
          if (mounted) fetchUserData(resolvedSession.user);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setUserId(null);
      }
    };

    /**
     * Debounced auth change handler — collapses rapid-fire events (e.g., from mirroring)
     * into a single state update after 200ms of quiet.
     */
    const handleAuthChange = (
      source: "persistent" | "standard",
      event: string,
      eventSession: Session | null
    ) => {
      pendingAuthChangeRef.current = { source, event, session: eventSession };
      
      if (authChangeTimerRef.current) {
        clearTimeout(authChangeTimerRef.current);
      }
      
      authChangeTimerRef.current = setTimeout(() => {
        const pending = pendingAuthChangeRef.current;
        if (pending) {
          processAuthChange(pending.source, pending.event, pending.session);
          pendingAuthChangeRef.current = null;
        }
      }, 200);
    };

    const {
      data: { subscription: persistentSub },
    } = supabasePersistent.auth.onAuthStateChange((event, session) => {
      handleAuthChange("persistent", event, session);
    });

    const {
      data: { subscription: standardSub },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange("standard", event, session);
    });

    return () => {
      mounted = false;
      persistentSub.unsubscribe();
      standardSub.unsubscribe();
      if (authChangeTimerRef.current) {
        clearTimeout(authChangeTimerRef.current);
      }
    };
  }, []);

  const isAdmin = role === "admin" || role === "owner";
  const isOwner = role === "owner";
  const isGuardian = role === "caregiver";
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isOwner,
        isGuardian,
        isAuthenticated,
        loading,
        refetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
