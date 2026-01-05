import { useAuth } from "@/contexts/AuthContext";
import { usePicturePasswordNotifications } from "@/hooks/usePicturePasswordNotifications";
import { PicturePasswordFeaturePrompt } from "./PicturePasswordFeaturePrompt";
import { BestieCreatedCodeNotification } from "./BestieCreatedCodeNotification";

export function PicturePasswordNotificationManager() {
  const { user } = useAuth();
  const {
    loading,
    showFeaturePrompt,
    showBestieCreatedCode,
    currentBestieNotification,
    linkedBesties,
    isGuardian,
    isBestie,
    userHasPicturePassword,
    dismissMaybeLater,
    dismissDontShowAgain,
    markBestieNotificationRead,
    closeFeaturePrompt,
    refreshCheck
  } = usePicturePasswordNotifications();

  if (loading || !user) return null;

  // Handle simple close (click outside or X) - just close, will show again next login
  const handleClose = () => {
    closeFeaturePrompt();
  };

  // Handle close after setup completion - refresh to check if prompt should still show
  const handleSetupComplete = async () => {
    await refreshCheck();
  };

  // Priority: Show bestie created code notification first
  if (showBestieCreatedCode && currentBestieNotification) {
    return (
      <BestieCreatedCodeNotification
        open={showBestieCreatedCode}
        onClose={markBestieNotificationRead}
        bestieName={currentBestieNotification.related_bestie_name}
        pictureSequence={currentBestieNotification.picture_sequence}
      />
    );
  }

  // Then show feature prompt if applicable
  if (showFeaturePrompt && (isGuardian || isBestie)) {
    return (
      <PicturePasswordFeaturePrompt
        open={showFeaturePrompt}
        onClose={handleClose}
        onSetupComplete={handleSetupComplete}
        onMaybeLater={dismissMaybeLater}
        onDontShowAgain={dismissDontShowAgain}
        isGuardian={isGuardian}
        isBestie={isBestie}
        linkedBesties={linkedBesties}
        userId={user.id}
        userHasPicturePassword={userHasPicturePassword}
      />
    );
  }

  return null;
}
