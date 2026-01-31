import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "./TermsAcceptanceDialog";

export const TermsAcceptanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const userCreatedAt = user?.created_at || null;
  
  const { needsAcceptance, loading: termsLoading } = useTermsCheck(userId);
  const location = useLocation();

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

  // Wait for auth and terms check to complete
  if (authLoading || termsLoading) {
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
