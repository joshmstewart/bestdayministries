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
    dismissMaybeLater,
    dismissDontShowAgain,
    markBestieNotificationRead,
    closeFeaturePrompt
  } = usePicturePasswordNotifications();

  if (loading || !user) return null;

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
        onClose={closeFeaturePrompt}
        onMaybeLater={dismissMaybeLater}
        onDontShowAgain={dismissDontShowAgain}
        isGuardian={isGuardian}
        isBestie={isBestie}
        linkedBesties={linkedBesties}
        userId={user.id}
      />
    );
  }

  return null;
}
