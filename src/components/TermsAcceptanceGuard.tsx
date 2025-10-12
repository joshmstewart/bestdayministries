import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "./TermsAcceptanceDialog";

export const TermsAcceptanceGuard = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [checkComplete, setCheckComplete] = useState(false);
  const { needsAcceptance, loading, recordAcceptance } = useTermsCheck(userId);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
      setCheckComplete(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);
      setCheckComplete(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAccepted = async () => {
    // 🚀 PRODUCTION FIX: Just clear flags, let React re-render naturally
    // No page reload needed since TermsAcceptanceDialog now handles recording reliably
    localStorage.removeItem('pendingTermsAcceptance');
    localStorage.removeItem('signupTimestamp');
    
    // Force a re-check of terms status
    window.location.href = '/community';
  };

  // Don't show dialog on auth pages or terms/privacy pages
  const publicPages = ['/auth', '/auth/vendor', '/terms', '/privacy', '/'];
  const isPublicPage = publicPages.includes(location.pathname);

  // Check if user just signed up (within last 30 seconds)
  const signupTimestamp = localStorage.getItem('signupTimestamp');
  const isRecentSignup = signupTimestamp && (Date.now() - parseInt(signupTimestamp)) < 30000;

  // Wait for initial check to complete
  if (!checkComplete || loading) {
    return <>{children}</>;
  }

  // Give newly signed up users a brief grace period before showing dialog
  if (isRecentSignup && needsAcceptance) {
    const gracePeriod = 2000; // 2 seconds
    const elapsed = Date.now() - parseInt(signupTimestamp || '0');
    
    if (elapsed < gracePeriod) {
      // Still within grace period, show children without dialog
      setTimeout(() => {
        // Force a re-check after grace period
        window.location.reload();
      }, gracePeriod - elapsed);
      return <>{children}</>;
    }
  }

  // Only show dialog if user is logged in, not on a public page, and needs acceptance
  const shouldShowDialog = userId && !isPublicPage && needsAcceptance;

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
