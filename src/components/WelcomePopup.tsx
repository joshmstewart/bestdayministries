import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WelcomePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WelcomePopup = ({ open, onOpenChange }: WelcomePopupProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Best Day Ministries!</DialogTitle>
          <DialogDescription className="text-base pt-2 space-y-3">
            <p>
              We're excited to have you here! Our organization has evolved and grown, 
              and this is our new home on the web.
            </p>
            <p>
              Explore our community, learn about our mission, and discover how you 
              can be part of spreading joy, hope, and purpose.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Explore the Site
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
