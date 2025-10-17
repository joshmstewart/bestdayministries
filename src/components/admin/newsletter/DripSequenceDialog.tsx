import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DripStepEditor } from "./DripStepEditor";

interface DripSequenceDialogProps {
  sequence?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DripSequenceDialog = ({ sequence, open, onOpenChange }: DripSequenceDialogProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentTrigger, setEnrollmentTrigger] = useState("");
  const [sequenceId, setSequenceId] = useState<string | null>(null);

  useEffect(() => {
    if (sequence) {
      setName(sequence.name || "");
      setDescription(sequence.description || "");
      setEnrollmentTrigger(sequence.enrollment_trigger || "");
      setSequenceId(sequence.id);
    } else {
      setName("");
      setDescription("");
      setEnrollmentTrigger("");
      setSequenceId(null);
    }
  }, [sequence, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const sequenceData = {
        name,
        description,
        enrollment_trigger: enrollmentTrigger,
        status: "draft",
        created_by: user.id,
      };

      if (sequence) {
        const { error } = await supabase
          .from("newsletter_drip_sequences")
          .update(sequenceData)
          .eq("id", sequence.id);
        if (error) throw error;
        setSequenceId(sequence.id);
      } else {
        const { data, error } = await supabase
          .from("newsletter_drip_sequences")
          .insert(sequenceData)
          .select()
          .single();
        if (error) throw error;
        setSequenceId(data.id);
      }
    },
    onSuccess: () => {
      toast.success(sequence ? "Sequence updated" : "Sequence created");
      queryClient.invalidateQueries({ queryKey: ["newsletter-drip-sequences"] });
      if (!sequence) {
        toast.info("Now add steps to your sequence");
      }
    },
    onError: (error) => {
      toast.error("Failed to save sequence");
      console.error(error);
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!enrollmentTrigger) {
      toast.error("Please select an enrollment trigger");
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sequence ? "Edit" : "Create"} Drip Sequence</DialogTitle>
          <DialogDescription>
            Create a multi-step email campaign with delays between each email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Sequence Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Onboarding Sequence"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this sequence does..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="enrollment-trigger">Enrollment Trigger</Label>
              <Select value={enrollmentTrigger} onValueChange={setEnrollmentTrigger}>
                <SelectTrigger id="enrollment-trigger">
                  <SelectValue placeholder="Select trigger..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_signup">User Signup</SelectItem>
                  <SelectItem value="subscription_start">Subscription Started</SelectItem>
                  <SelectItem value="trial_started">Trial Started</SelectItem>
                  <SelectItem value="purchase">First Purchase</SelectItem>
                  <SelectItem value="manual">Manual Enrollment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Sequence"}
              </Button>
            </div>
          </div>

          {sequenceId && (
            <div className="border-t pt-6">
              <DripStepEditor sequenceId={sequenceId} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
