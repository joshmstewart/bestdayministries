import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { idbAuthStorage } from "@/lib/idbAuthStorage";
import { User, Session } from "@supabase/supabase-js";
import { setUserId } from "@/lib/analytics";

type UserRole = "supporter" | "bestie" | "caregiver" | "moderator" | "admin" | "owner";

// Storage key used by Supabase clients
const AUTH_STORAGE_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;

interface Profile {
  id: string;
  display_name: string | null;
  avatar_number: number | null;
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

  /**
   * Validates a session by calling getUser() on the server.
   * Returns null if the session is invalid (e.g., "session_not_found").
   */
  const validateSession = async (
    client: typeof supabase | typeof supabasePersistent,
    candidateSession: Session | null
  ): Promise<Session | null> => {
    if (!candidateSession?.access_token) return null;

    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) {
        console.log("[AuthContext] Session validation failed:", error?.message);
        return null;
      }
      return candidateSession;
    } catch (e) {
      console.log("[AuthContext] Session validation exception:", e);
      return null;
    }
  };

  /**
   * Clears invalid auth tokens from storage without calling signOut endpoints.
   * This prevents the "fresh session invalidated" bug while still cleaning up stale tokens.
   */
  const clearInvalidStorageEntry = async (storage: "localStorage" | "indexedDB") => {
    console.log(`[AuthContext] Clearing invalid session from ${storage}`);
    try {
      if (storage === "localStorage") {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        await idbAuthStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn(`[AuthContext] Failed to clear ${storage}:`, e);
    }
  };

  /**
   * Reconciles auth sessions between localStorage (standard) and IndexedDB (persistent).
   * Validates each session server-side and clears invalid ones.
   * Returns the valid session to use, or null if none.
   */
  const reconcileAuthSessions = async (): Promise<Session | null> => {
    if (syncInProgressRef.current) return session;
    syncInProgressRef.current = true;

    try {
      // Read both sessions in parallel
      const [standardResult, persistentResult] = await Promise.all([
        supabase.auth.getSession(),
        supabasePersistent.auth.getSession(),
      ]);

      const standardSession = standardResult.data.session;
      const persistentSession = persistentResult.data.session;

      // Validate both sessions server-side
      const [validStandard, validPersistent] = await Promise.all([
        validateSession(supabase, standardSession),
        validateSession(supabasePersistent, persistentSession),
      ]);

      // Clear invalid sessions from storage
      if (standardSession && !validStandard) {
        await clearInvalidStorageEntry("localStorage");
      }
      if (persistentSession && !validPersistent) {
        await clearInvalidStorageEntry("indexedDB");
      }

      // Pick the winner among valid sessions (prefer persistent as source of truth)
      const winner = validPersistent ?? validStandard ?? null;

      // Mirror winner to the client that's missing it
      if (winner?.access_token && winner?.refresh_token) {
        if (!validStandard || validStandard.user.id !== winner.user.id) {
          try {
            await supabase.auth.setSession({
              access_token: winner.access_token,
              refresh_token: winner.refresh_token,
            });
            console.log("[AuthContext] Mirrored session to standard client");
          } catch (e) {
            console.warn("[AuthContext] Failed to mirror to standard client:", e);
          }
        }

        if (!validPersistent || validPersistent.user.id !== winner.user.id) {
          try {
            await supabasePersistent.auth.setSession({
              access_token: winner.access_token,
              refresh_token: winner.refresh_token,
            });
            console.log("[AuthContext] Mirrored session to persistent client");
          } catch (e) {
            console.warn("[AuthContext] Failed to mirror to persistent client:", e);
          }
        }
      }

      return winner;
    } catch (error) {
      console.warn("[AuthContext] Reconciliation error:", error);
      return session;
    } finally {
      syncInProgressRef.current = false;
    }
  };

  const fetchUserData = async (currentUser: User) => {
    try {
      // Fetch role and profile in parallel using persistent client
      const [roleResult, profileResult] = await Promise.all([
        supabasePersistent
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        supabasePersistent
          .from("profiles")
          .select("id, display_name, avatar_number, coins")
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
        const resolvedSession = await reconcileAuthSessions();
        
        if (!mounted) return;

        if (resolvedSession?.user) {
          setSession(resolvedSession);
          setUser(resolvedSession.user);
          setUserId(resolvedSession.user.id);
          await fetchUserData(resolvedSession.user);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    /**
     * Handles auth state changes from either client.
     * For SIGNED_IN events, treats the event's session as authoritative.
     */
    const handleAuthChange = async (
      source: "persistent" | "standard",
      event: string,
      eventSession: Session | null
    ) => {
      if (!mounted) return;
      
      // Skip if we're currently mirroring (to prevent infinite loops)
      if (mirroringInProgressRef.current) {
        console.log("[AuthContext] Skipping auth change - mirroring in progress");
        return;
      }

      // Skip if we already processed this exact session (by session_id)
      const sessionId = eventSession?.user?.id ? `${eventSession.user.id}-${eventSession.expires_at}` : null;
      if (sessionId && sessionId === lastProcessedSessionIdRef.current) {
        console.log("[AuthContext] Skipping auth change - already processed this session");
        return;
      }

      // For SIGNED_IN events, the event session is authoritative - use it directly
      // This prevents old sessions with later expires_at from "winning"
      if (event === "SIGNED_IN" && eventSession?.access_token) {
        console.log("[AuthContext] SIGNED_IN event - using event session as authoritative");
        
        // Mark the session as processed to avoid duplicates
        lastProcessedSessionIdRef.current = sessionId;
        
        // Mirror ONLY to the other client (never call setSession on the emitting client)
        // Calling setSession on both clients here can cause event storms and UI hangs.
        mirroringInProgressRef.current = true;
        try {
          if (source === "persistent") {
            await supabase.auth.setSession({
              access_token: eventSession.access_token,
              refresh_token: eventSession.refresh_token,
            });
            console.log("[AuthContext] Mirrored SIGNED_IN session to standard client");
          } else {
            await supabasePersistent.auth.setSession({
              access_token: eventSession.access_token,
              refresh_token: eventSession.refresh_token,
            });
            console.log("[AuthContext] Mirrored SIGNED_IN session to persistent client");
          }
        } catch (e) {
          console.warn("[AuthContext] Failed to mirror SIGNED_IN session:", e);
        } finally {
          mirroringInProgressRef.current = false;
        }

        setSession(eventSession);
        setUser(eventSession.user);
        setUserId(eventSession.user.id);
        setTimeout(() => {
          if (mounted) fetchUserData(eventSession.user);
        }, 0);
        return;
      }

      // For other events, reconcile normally
      const resolvedSession = await reconcileAuthSessions();
      if (!mounted) return;

      setSession(resolvedSession);
      setUser(resolvedSession?.user ?? null);

      if (resolvedSession?.user) {
        setUserId(resolvedSession.user.id);
        setTimeout(() => {
          if (mounted) fetchUserData(resolvedSession.user);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setUserId(null);
      }
    };

    // Listen for auth changes on BOTH clients
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
