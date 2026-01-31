import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { User, Session } from "@supabase/supabase-js";
import { setUserId } from "@/lib/analytics";

type UserRole = "supporter" | "bestie" | "caregiver" | "moderator" | "admin" | "owner";

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

  /**
   * Keep the "standard" client (localStorage-backed) and the persistent client (IndexedDB)
   * synchronized.
   *
   * IMPORTANT: Do NOT auto-signOut() as part of sync. In practice, a signOut(scope:"local")
   * still hits the /logout endpoint and can invalidate a freshly-issued session.
   * That was causing: "login success" → immediate logout → Terms dialog loop + stuck on /auth.
   */
  const reconcileAuthSessions = async (): Promise<Session | null> => {
    if (syncInProgressRef.current) return session;
    syncInProgressRef.current = true;

    try {
      const [standardResult, persistentResult] = await Promise.all([
        supabase.auth.getSession(),
        supabasePersistent.auth.getSession(),
      ]);

      const standardSession = standardResult.data.session;
      const persistentSession = persistentResult.data.session;

      // Pick a "winner" session. Prefer whichever has the later expires_at.
      const winner = (() => {
        if (!standardSession) return persistentSession;
        if (!persistentSession) return standardSession;
        const a = standardSession.expires_at ?? 0;
        const b = persistentSession.expires_at ?? 0;
        return a >= b ? standardSession : persistentSession;
      })();

      // Mirror winner into whichever client is missing OR mismatched user.
      if (winner?.access_token && winner?.refresh_token) {
        if (!standardSession || standardSession.user.id !== winner.user.id) {
          const { error } = await supabase.auth.setSession({
            access_token: winner.access_token,
            refresh_token: winner.refresh_token,
          });
          if (error) {
            console.warn("Auth sync: failed to mirror session to standard client", error);
          }
        }

        if (!persistentSession || persistentSession.user.id !== winner.user.id) {
          const { error } = await supabasePersistent.auth.setSession({
            access_token: winner.access_token,
            refresh_token: winner.refresh_token,
          });
          if (error) {
            console.warn("Auth sync: failed to mirror session to persistent client", error);
          }
        }
      }

      return winner ?? null;
    } catch (error) {
      console.warn("Auth sync: unexpected error", error);
      return session;
    } finally {
      syncInProgressRef.current = false;
    }
  };

  const fetchUserData = async (currentUser: User) => {
    try {
      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        supabase
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

    // Get initial session - use persistent client for better iOS PWA support
    const initAuth = async () => {
      try {
        // Ensure both clients converge on the same session before we fetch user data.
        const resolvedSession = await reconcileAuthSessions();
        
        if (!mounted) return;

        if (resolvedSession?.user) {
          setSession(resolvedSession);
          setUser(resolvedSession.user);
          setUserId(resolvedSession.user.id); // Set GA user ID for returning users
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

    const handleAuthChange = async () => {
      if (!mounted) return;
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

    // Listen for auth changes on BOTH clients (email/password uses persistent; picture-password uses standard)
    const {
      data: { subscription: persistentSub },
    } = supabasePersistent.auth.onAuthStateChange(async () => {
      await handleAuthChange();
    });

    const {
      data: { subscription: standardSub },
    } = supabase.auth.onAuthStateChange(async () => {
      await handleAuthChange();
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
