import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound, PartyPopper } from "lucide-react";
import { PicturePasswordDisplay } from "./PicturePasswordDisplay";

interface BestieCreatedCodeNotificationProps {
  open: boolean;
  onClose: () => void;
  bestieName: string | null;
  pictureSequence: string[] | null;
}

export function BestieCreatedCodeNotification({
  open,
  onClose,
  bestieName,
  pictureSequence
}: BestieCreatedCodeNotificationProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            {bestieName} Set Up Picture Login!
          </DialogTitle>
          <DialogDescription>
            Great news! {bestieName} created their own picture login code. 
            Here it is in case you need to help them remember:
          </DialogDescription>
        </DialogHeader>

        {pictureSequence && pictureSequence.length > 0 && (
          <div className="py-4">
            <PicturePasswordDisplay sequence={pictureSequence} size="lg" />
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            How it works:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li>{bestieName} can now use this code to sign in</li>
            <li>The code is shown in order from left to right</li>
            <li>You can always view this code in your Guardian Links page</li>
          </ul>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
