import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditDisplayNameDialogProps {
  campaign: { id: string; title: string; display_name?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditDisplayNameDialog = ({ campaign, open, onOpenChange }: EditDisplayNameDialogProps) => {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(campaign?.display_name || "");

  // Sync state when campaign changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (campaign && campaign.id !== lastId) {
    setLastId(campaign.id);
    setDisplayName(campaign.display_name || "");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("newsletter_campaigns")
        .update({ display_name: displayName || null } as any)
        .eq("id", campaign!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Display name updated");
      queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-archive"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to update display name"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Display Name</DialogTitle>
          <DialogDescription>
            Set a public-facing name for "{campaign?.title}". This appears on the newsletter archive instead of the internal title.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Public-facing title..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
