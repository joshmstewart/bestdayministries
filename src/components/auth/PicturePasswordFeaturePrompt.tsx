import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound, UserCircle } from "lucide-react";
import { PicturePasswordManager } from "./PicturePasswordManager";
import { PICTURE_PASSWORD_IMAGES } from "@/lib/picturePasswordImages";
import { TextToSpeech } from "@/components/TextToSpeech";

interface LinkedBestie {
  id: string;
  display_name: string;
  hasPicturePassword: boolean;
}

interface PicturePasswordFeaturePromptProps {
  open: boolean;
  onClose: () => void;
  onMaybeLater: () => void;
  onDontShowAgain: () => void;
  isGuardian: boolean;
  isBestie: boolean;
  linkedBesties: LinkedBestie[];
  userId: string;
  userHasPicturePassword?: boolean;
}

export function PicturePasswordFeaturePrompt({
  open,
  onClose,
  onMaybeLater,
  onDontShowAgain,
  isGuardian,
  isBestie,
  linkedBesties,
  userId,
  userHasPicturePassword = false
}: PicturePasswordFeaturePromptProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [selectedBestieId, setSelectedBestieId] = useState<string | null>(null);
  const [setupForSelf, setSetupForSelf] = useState(false);

  // Get sample images for preview (4 pictures)
  const sampleImages = PICTURE_PASSWORD_IMAGES.slice(0, 4);

  const handleSetupForBestie = (bestieId: string) => {
    setSelectedBestieId(bestieId);
    setSetupForSelf(false);
    setShowSetup(true);
  };

  const handleSetupForSelf = () => {
    setSelectedBestieId(null);
    setSetupForSelf(true);
    setShowSetup(true);
  };

  const handleComplete = () => {
    setShowSetup(false);
    setSelectedBestieId(null);
    setSetupForSelf(false);
    onClose();
  };

  const bestiesWithoutPassword = linkedBesties.filter(b => !b.hasPicturePassword);

  if (showSetup) {
    const targetUserId = selectedBestieId || userId;
    const targetName = selectedBestieId 
      ? linkedBesties.find(b => b.id === selectedBestieId)?.display_name 
      : "yourself";

    return (
      <Dialog open={open} onOpenChange={() => handleComplete()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Set Up Picture Login for {targetName}
            </DialogTitle>
          </DialogHeader>
          <PicturePasswordManager
            userId={targetUserId}
            isGuardianManaging={!!selectedBestieId}
            bestieName={selectedBestieId ? linkedBesties.find(b => b.id === selectedBestieId)?.display_name : undefined}
            compact
          />
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={handleComplete}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const ttsText = isGuardian 
    ? "New Feature: Picture Login! Make signing in easier for your besties with a simple 4-picture code! Just remember 4 pictures, it's that easy!"
    : "New Feature: Picture Login! Sign in faster with a fun 4-picture code instead of typing a password! Just remember 4 pictures, it's that easy!";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            New Feature: Picture Login! 🎉
            <TextToSpeech text={ttsText} size="icon" />
          </DialogTitle>
          <DialogDescription>
            {isGuardian 
              ? "Make signing in easier for your besties with a simple 4-picture code!"
              : "Sign in faster with a fun 4-picture code instead of typing a password!"}
          </DialogDescription>
        </DialogHeader>

        {/* Preview of picture icons */}
        <div className="flex justify-center gap-3 py-4">
          {sampleImages.map((img, index) => {
            const Icon = img.icon;
            return (
              <div
                key={img.id}
                className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-primary/20"
              >
                <Icon className={`w-8 h-8 ${img.color}`} />
              </div>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Just remember 4 pictures - it's that easy!
        </p>

        <div className="space-y-3 mt-4">
          {isGuardian && bestiesWithoutPassword.length > 0 && (
            <>
              <p className="text-sm font-medium">Set up for your besties:</p>
              {bestiesWithoutPassword.map(bestie => (
                <Button
                  key={bestie.id}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleSetupForBestie(bestie.id)}
                >
                  <UserCircle className="h-4 w-4" />
                  Set up for {bestie.display_name}
                </Button>
              ))}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
            </>
          )}

          {isBestie && (
            <Button
              className="w-full"
              onClick={handleSetupForSelf}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Set Up My Picture Login
            </Button>
          )}

          {isGuardian && !userHasPicturePassword && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSetupForSelf}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Set up for myself
            </Button>
          )}

          {isGuardian && userHasPicturePassword && bestiesWithoutPassword.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              ✓ You already have Picture Login set up!
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={onMaybeLater}>
            Maybe Later
          </Button>
          <button
            onClick={onDontShowAgain}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Don't show this again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
