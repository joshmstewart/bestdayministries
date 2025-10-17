import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface AutomationDialogProps {
  automation?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AutomationDialog = ({ automation, open, onOpenChange }: AutomationDialogProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"event" | "drip">("event");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [sequenceId, setSequenceId] = useState("");

  const { data: campaigns } = useQuery({
    queryKey: ["newsletter-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sequences } = useQuery({
    queryKey: ["newsletter-drip-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_drip_sequences")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (automation) {
      setName(automation.name || "");
      setDescription(automation.description || "");
      setTriggerType(automation.trigger_type || "event");
      setTriggerEvent(automation.trigger_event || "");
      setCampaignId(automation.campaign_id || "");
      setSequenceId(automation.drip_sequence_id || "");
    } else {
      setName("");
      setDescription("");
      setTriggerType("event");
      setTriggerEvent("");
      setCampaignId("");
      setSequenceId("");
    }
  }, [automation, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const automationData = {
        name,
        description,
        trigger_type: triggerType,
        trigger_event: triggerType === "event" ? triggerEvent : null,
        campaign_id: triggerType === "event" ? campaignId : null,
        drip_sequence_id: triggerType === "drip" ? sequenceId : null,
        status: "draft",
        created_by: user.id,
      };

      if (automation) {
        const { error } = await supabase
          .from("newsletter_automations")
          .update(automationData)
          .eq("id", automation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("newsletter_automations")
          .insert(automationData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(automation ? "Automation updated" : "Automation created");
      queryClient.invalidateQueries({ queryKey: ["newsletter-automations"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save automation");
      console.error(error);
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (triggerType === "event" && !triggerEvent) {
      toast.error("Please select a trigger event");
      return;
    }

    if (triggerType === "event" && !campaignId) {
      toast.error("Please select a campaign");
      return;
    }

    if (triggerType === "drip" && !sequenceId) {
      toast.error("Please select a drip sequence");
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{automation ? "Edit" : "Create"} Automation</DialogTitle>
          <DialogDescription>
            Set up event-triggered or drip campaign automations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Automation Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome Series"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this automation does..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="trigger-type">Trigger Type</Label>
            <Select value={triggerType} onValueChange={(value: "event" | "drip") => setTriggerType(value)}>
              <SelectTrigger id="trigger-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event-Triggered</SelectItem>
                <SelectItem value="drip">Drip Sequence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === "event" ? (
            <>
              <div>
                <Label htmlFor="trigger-event">Trigger Event</Label>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger id="trigger-event">
                    <SelectValue placeholder="Select event..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_signup">User Signup</SelectItem>
                    <SelectItem value="subscription_start">Subscription Started</SelectItem>
                    <SelectItem value="subscription_cancelled">Subscription Cancelled</SelectItem>
                    <SelectItem value="purchase">Purchase Made</SelectItem>
                    <SelectItem value="cart_abandoned">Cart Abandoned</SelectItem>
                    <SelectItem value="inactive_30_days">30 Days Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="campaign">Campaign to Send</Label>
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger id="campaign">
                    <SelectValue placeholder="Select campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="sequence">Drip Sequence</Label>
              <Select value={sequenceId} onValueChange={setSequenceId}>
                <SelectTrigger id="sequence">
                  <SelectValue placeholder="Select sequence..." />
                </SelectTrigger>
                <SelectContent>
                  {sequences?.map((sequence) => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      {sequence.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Automation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
