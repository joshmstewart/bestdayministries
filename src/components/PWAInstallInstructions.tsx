import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus, Check } from "lucide-react";

interface PWAInstallInstructionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
}

export function PWAInstallInstructions({
  open,
  onOpenChange,
  onDismiss,
}: PWAInstallInstructionsProps) {
  const handleDontShowAgain = () => {
    onDismiss?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
          <DialogDescription>
            Follow these steps to install our app on your iPhone or iPad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Share className="h-5 w-5 text-primary" />
                <p className="font-semibold">Tap the Share button</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Look for the Share icon in the Safari toolbar at the bottom of your screen
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-5 w-5 text-primary" />
                <p className="font-semibold">Scroll and tap "Add to Home Screen"</p>
              </div>
              <p className="text-sm text-muted-foreground">
                You may need to scroll down in the Share menu to find this option
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-primary" />
                <p className="font-semibold">Tap "Add" to confirm</p>
              </div>
              <p className="text-sm text-muted-foreground">
                The app will appear on your home screen like any other app
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => onOpenChange(false)}>
            Got It
          </Button>
          <Button
            variant="ghost"
            onClick={handleDontShowAgain}
            className="text-sm"
          >
            Don't show again for 7 days
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
