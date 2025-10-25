import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "./TermsAcceptanceDialog";

export const TermsAcceptanceGuard = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [checkComplete, setCheckComplete] = useState(false);
  const { needsAcceptance, loading, recordAcceptance } = useTermsCheck(userId);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
      setUserCreatedAt(session?.user?.created_at || null);
      setCheckComplete(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);
      setUserCreatedAt(session?.user?.created_at || null);
      setCheckComplete(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAccepted = async () => {
    // Force a re-check of terms status after acceptance
    window.location.href = '/community';
  };

  // Helper function to check if user is newly created (< 60 seconds old)
  const isNewUser = (createdAt: string | null): boolean => {
    if (!createdAt) return false;
    const accountAge = Date.now() - new Date(createdAt).getTime();
    return accountAge < 60000; // Less than 60 seconds old
  };

  // Don't show dialog on auth pages or terms/privacy pages
  const publicPages = ['/auth', '/auth/vendor', '/terms', '/privacy', '/', '/newsletter'];
  const isPublicPage = publicPages.includes(location.pathname);

  // Wait for initial check to complete
  if (!checkComplete || loading) {
    return <>{children}</>;
  }

  // Only show dialog if user is logged in, not on a public page, needs acceptance,
  // AND is not a brand new user (give edge function time to complete)
  const shouldShowDialog = userId && !isPublicPage && needsAcceptance && !isNewUser(userCreatedAt);

  return (
    <>
      {shouldShowDialog && (
        <TermsAcceptanceDialog 
          isOpen={true} 
          onAccepted={handleAccepted}
        />
      )}
      {children}
    </>
  );
};
