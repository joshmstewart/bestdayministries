import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export function WelcomeRedirectModal() {
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if ?welcome=true is in the URL
    if (searchParams.get("welcome") === "true") {
      setOpen(true);
    }
  }, [searchParams]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to Our New Home!
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p>
              We're excited to share that Best Day Ministries has a brand new website! 
              You've been redirected from our old URL.
            </p>
            <p>
              Please update your bookmarks to <strong>bestdayministries.org</strong> 
              to visit us directly next time.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={() => setOpen(false)} className="px-8">
            Explore the New Site
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
