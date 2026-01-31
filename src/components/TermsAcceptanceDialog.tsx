import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/hooks/useTermsCheck";

interface TermsAcceptanceDialogProps {
  isOpen: boolean;
  onAccepted: () => void;
}

export const TermsAcceptanceDialog = ({ isOpen, onAccepted }: TermsAcceptanceDialogProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Use persistent client for consistency with the rest of auth
      const { data: { session }, error: sessionError } = await supabasePersistent.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Session not available. Please try logging in again.");
      }

      // Retry logic with exponential backoff (3 attempts)
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const { error } = await supabasePersistent.functions.invoke("record-terms-acceptance", {
            body: {
              termsVersion: CURRENT_TERMS_VERSION,
              privacyVersion: CURRENT_PRIVACY_VERSION,
            },
          });

          if (error) throw error;

          // Success!
          toast({
            title: "Terms Accepted",
            description: "Thank you for accepting our updated terms.",
          });
          
          onAccepted();
          return; // Exit successfully
          
        } catch (error) {
          lastError = error;
          
          // If not the last attempt, wait before retrying
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
      
      // All retries failed
      throw lastError;
      
    } catch (error) {
      console.error("Error recording acceptance:", error);
      toast({
        title: "Failed to Record Acceptance",
        description: "Please try again. If the problem persists, contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Updated Terms & Privacy Policy</DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p>
              We've updated our Terms of Service and Privacy Policy. Please review and accept them to continue using Best Day Ministries.
            </p>
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="terms-acceptance" 
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <label
                htmlFor="terms-acceptance"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{" "}
                <Link 
                  to="/terms" 
                  target="_blank" 
                  className="text-primary hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link 
                  to="/privacy" 
                  target="_blank" 
                  className="text-primary hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            onClick={handleAccept} 
            disabled={!acceptedTerms || loading}
            className="w-full"
          >
            {loading ? "Accepting..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
