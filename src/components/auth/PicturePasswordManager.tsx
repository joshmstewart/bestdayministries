import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PicturePasswordDisplay } from "./PicturePasswordDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trash2, Sparkles, Download } from "lucide-react";
import { generateRandomSequence } from "@/lib/picturePasswordImages";
import { useCodeImageDownload } from "@/hooks/useCodeImageDownload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PicturePasswordManagerProps {
  userId: string;
  isGuardianManaging?: boolean;
  bestieName?: string;
  compact?: boolean;
}

export const PicturePasswordManager = ({
  userId,
  isGuardianManaging = false,
  bestieName,
  compact = false,
}: PicturePasswordManagerProps) => {
  const { toast } = useToast();
  const { downloadPictureCode } = useCodeImageDownload();
  const [currentSequence, setCurrentSequence] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCurrentPassword = async () => {
    try {
      const { data, error } = await supabase
        .from("picture_passwords")
        .select("picture_sequence")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setCurrentSequence(data?.picture_sequence || null);
    } catch (error) {
      console.error("Error loading picture password:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentPassword();
  }, [userId]);

  const generateNewPassword = async () => {
    setIsGenerating(true);
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const newSequence = generateRandomSequence();
      
      try {
        // Check if sequence already exists
        const { data: existing } = await supabase
          .from("picture_passwords")
          .select("id")
          .eq("picture_sequence", newSequence)
          .maybeSingle();

        if (!existing) {
          // Sequence is unique, save it
          if (currentSequence) {
            // Update existing
            const { error } = await supabase
              .from("picture_passwords")
              .update({ 
                picture_sequence: newSequence, 
                updated_at: new Date().toISOString() 
              })
              .eq("user_id", userId);

            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabase
              .from("picture_passwords")
              .insert({
                user_id: userId,
                picture_sequence: newSequence,
                created_by: (await supabase.auth.getUser()).data.user?.id,
              });

            if (error) throw error;
          }

          setCurrentSequence(newSequence);
          toast({
            title: currentSequence ? "Code updated!" : "Code generated!",
            description: isGuardianManaging 
              ? `Remember to tell ${bestieName || "them"} their new picture code.`
              : "Your new picture password is ready.",
          });
          break;
        }
        
        attempts++;
      } catch (error: any) {
        console.error("Error generating picture password:", error);
        
        // Handle unique constraint violation
        if (error.code === "23505") {
          attempts++;
          continue;
        }
        
        toast({
          title: "Error",
          description: "Failed to generate picture password. Please try again.",
          variant: "destructive",
        });
        break;
      }
    }

    if (attempts >= maxAttempts) {
      toast({
        title: "Please try again",
        description: "Couldn't find a unique code. This is rare - please try again.",
        variant: "destructive",
      });
    }

    setIsGenerating(false);
  };

  const deletePassword = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("picture_passwords")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setCurrentSequence(null);
      toast({
        title: "Picture password removed",
        description: isGuardianManaging 
          ? `${bestieName || "They"} can no longer sign in with pictures.`
          : "You can no longer sign in with pictures.",
      });
    } catch (error) {
      console.error("Error deleting picture password:", error);
      toast({
        title: "Error",
        description: "Failed to remove picture password.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    if (isGuardianManaging) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className="space-y-4">
      {currentSequence ? (
        <>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-3 text-center">
              {isGuardianManaging ? "Their current code:" : "Your current code:"}
            </p>
            <PicturePasswordDisplay sequence={currentSequence} size="md" />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={generateNewPassword}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate New Code
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => downloadPictureCode(currentSequence, bestieName)}
              title="Download code as image"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Picture Password?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isGuardianManaging
                      ? `${bestieName || "They"} will no longer be able to sign in with pictures.`
                      : "You will no longer be able to sign in with pictures."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deletePassword}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground text-center py-4">
            {isGuardianManaging
              ? `${bestieName || "They"} don't have a picture password yet.`
              : "You don't have a picture password yet."}
          </p>
          <Button
            onClick={generateNewPassword}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Picture Password
          </Button>
        </>
      )}
    </div>
  );

  // When used inside an accordion (guardian managing), don't wrap in Card
  if (isGuardianManaging) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Picture Password
        </CardTitle>
        <CardDescription>
          Sign in using 4 pictures instead of email and password
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};
