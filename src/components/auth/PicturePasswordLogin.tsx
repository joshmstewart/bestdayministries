import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PicturePasswordGrid } from "./PicturePasswordGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { useToast } from "@/hooks/use-toast";
import { getPostLoginRedirect } from "@/lib/authRedirect";
export const PicturePasswordLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);

  const handleSelect = (pictureId: string) => {
    if (selectedSequence.length < 4) {
      setSelectedSequence([...selectedSequence, pictureId]);
    }
  };

  const handleClear = () => {
    setSelectedSequence([]);
  };

  const handleLogin = async () => {
    if (selectedSequence.length !== 4) return;
    
    if (isLockedOut && lockoutEndTime && new Date() < lockoutEndTime) {
      const remainingSeconds = Math.ceil((lockoutEndTime.getTime() - Date.now()) / 1000);
      toast({
        title: "Too many attempts",
        description: `Please wait ${remainingSeconds} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("picture-password-login", {
        body: { pictureSequence: selectedSequence },
      });

      if (error) throw error;

      if (data.success && data.session) {
        // Set the session on the persistent client (source of truth for the app).
        // AuthContext will reconcile/mirror into the standard client.
        await supabasePersistent.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });

        // Use shared redirect logic (same as email/password login)
        // Derive userId from the persisted session (edge function response does not include user).
        const {
          data: { user },
          error: userError,
        } = await supabasePersistent.auth.getUser();

        if (userError || !user) {
          throw new Error("Signed in, but user session could not be loaded. Please try again.");
        }

        const redirectPath = searchParams.get("redirect");
        const bestieId = searchParams.get("bestieId");
        const destination = await getPostLoginRedirect(user.id, {
          redirectPath: redirectPath || undefined,
          bestieId: bestieId || undefined,
        });
        navigate(destination);
      } else {
        // Failed attempt
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          const lockoutEnd = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
          setIsLockedOut(true);
          setLockoutEndTime(lockoutEnd);
          
          toast({
            title: "Too many attempts",
            description: "Please wait 5 minutes before trying again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Code not found",
            description: `That combination doesn't match. ${5 - newAttempts} attempts remaining.`,
            variant: "destructive",
          });
        }
        
        setSelectedSequence([]);
      }
    } catch (error: any) {
      console.error("Picture password login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setSelectedSequence([]);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = selectedSequence.length === 4 && !isLoading && !isLockedOut;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <CardTitle className="text-2xl">Sign in with Pictures</CardTitle>
          <CardDescription>
            Tap 4 pictures in order to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PicturePasswordGrid
            selectedSequence={selectedSequence}
            onSelect={handleSelect}
            onClear={handleClear}
            disabled={isLoading || isLockedOut}
          />

          <Button
            onClick={handleLogin}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </Button>

          {isLockedOut && lockoutEndTime && (
            <p className="text-center text-sm text-destructive">
              Too many failed attempts. Please wait 5 minutes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
