import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  /**
   * Keep the "standard" Supabase client (localStorage-backed) in sync with the
   * IndexedDB-backed persistent auth client.
   *
   * Why: many parts of the app (including TermsAcceptanceGuard/useTermsCheck) use
   * the standard client for queries/functions. If only the persistent client has
   * a session, those queries become unauthenticated and can cause a Terms loop.
   */
  const syncStandardClientSession = async (newSession: Session | null) => {
    try {
      if (newSession?.access_token && newSession?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
        });

        if (error) {
          console.warn("Auth sync: failed to mirror session to standard client", error);
        }
        return;
      }

      // No session: clear ONLY local auth state in the standard client to avoid "ghost" users
      // without revoking sessions elsewhere.
      const { error } = await supabase.auth.signOut({ scope: "local" as any });
      if (error) {
        console.warn("Auth sync: failed to clear standard client session", error);
      }
    } catch (error) {
      console.warn("Auth sync: unexpected error", error);
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
        // Try persistent storage first (IndexedDB), fall back to regular client
        let session = null;
        try {
          const { data } = await supabasePersistent.auth.getSession();
          session = data.session;
        } catch {
          // Fallback to regular client
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }

        // Always mirror whichever session we ended up with into the standard client
        // so DB queries/functions that use it remain authenticated.
        await syncStandardClientSession(session);
        
        if (!mounted) return;

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setUserId(session.user.id); // Set GA user ID for returning users
          await fetchUserData(session.user);
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

    // Listen for auth changes - use persistent client
    const { data: { subscription } } = supabasePersistent.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // Mirror session changes to the standard client (used across the app)
        await syncStandardClientSession(newSession);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            if (mounted) {
              fetchUserData(newSession.user);
            }
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setUserId(null); // Clear GA user ID on logout
        }

        if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
