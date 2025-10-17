import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface DripStepEditorProps {
  sequenceId: string;
}

export const DripStepEditor = ({ sequenceId }: DripStepEditorProps) => {
  const queryClient = useQueryClient();
  const [campaignId, setCampaignId] = useState("");
  const [delayValue, setDelayValue] = useState("1");
  const [delayUnit, setDelayUnit] = useState("days");

  const { data: steps, isLoading } = useQuery({
    queryKey: ["drip-steps", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_drip_steps")
        .select("*, newsletter_campaigns(title)")
        .eq("sequence_id", sequenceId)
        .order("step_number");

      if (error) throw error;
      return data;
    },
  });

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

  const addStepMutation = useMutation({
    mutationFn: async () => {
      const stepNumber = (steps?.length || 0) + 1;
      
      const { error } = await supabase
        .from("newsletter_drip_steps")
        .insert({
          sequence_id: sequenceId,
          step_number: stepNumber,
          campaign_id: campaignId,
          delay_value: parseInt(delayValue),
          delay_unit: delayUnit,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Step added");
      queryClient.invalidateQueries({ queryKey: ["drip-steps", sequenceId] });
      setCampaignId("");
      setDelayValue("1");
      setDelayUnit("days");
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from("newsletter_drip_steps")
        .delete()
        .eq("id", stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Step deleted");
      queryClient.invalidateQueries({ queryKey: ["drip-steps", sequenceId] });
    },
  });

  const handleAddStep = () => {
    if (!campaignId) {
      toast.error("Please select a campaign");
      return;
    }
    addStepMutation.mutate();
  };

  const getDelayLabel = (step: any) => {
    const delay = `${step.delay_value} ${step.delay_unit}`;
    if (step.step_number === 1) {
      return `Immediately`;
    }
    return `Wait ${delay} after previous step`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold mb-2">Sequence Steps</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Add campaigns to your sequence with delays between each step
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground">Loading steps...</div>
      ) : (
        <div className="space-y-2">
          {steps?.map((step, index) => (
            <Card key={step.id} className="p-4">
              <div className="flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">
                    Step {step.step_number}: {step.newsletter_campaigns?.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getDelayLabel(step)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteStepMutation.mutate(step.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label>Add New Step</Label>
          </div>

          <div>
            <Label htmlFor="campaign">Campaign</Label>
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

          {(steps?.length || 0) > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="delay">Delay</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  value={delayValue}
                  onChange={(e) => setDelayValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={delayUnit} onValueChange={setDelayUnit}>
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button
            onClick={handleAddStep}
            disabled={addStepMutation.isPending}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </div>
      </Card>
    </div>
  );
};
