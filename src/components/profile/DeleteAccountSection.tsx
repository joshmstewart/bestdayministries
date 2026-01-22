import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
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

export const DeleteAccountSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: 'Please type "DELETE" to confirm account deletion.',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to delete your account.");
      }

      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Sign out after successful deletion
      await supabase.auth.signOut();

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted. We're sorry to see you go.",
      });

      // Redirect to home page
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error deleting account",
        description: error.message || "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDialogOpen(false);
      setConfirmText("");
    }
  };

  return (
    <Card className="border-destructive/50 shadow-warm">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-destructive">Warning: This action cannot be undone!</p>
          <p className="text-muted-foreground">
            Deleting your account will permanently remove:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Your profile and personal information</li>
            <li>Your posts, comments, and contributions</li>
            <li>Your notification preferences and settings</li>
            <li>Any linked bestie or sponsor relationships</li>
          </ul>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full gap-2">
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  This action is <strong>permanent and cannot be undone</strong>. Your account 
                  and all associated data will be permanently deleted.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Type <strong>DELETE</strong> to confirm:
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type DELETE to confirm"
                    disabled={isDeleting}
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteAccount();
                }}
                disabled={confirmText !== "DELETE" || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
