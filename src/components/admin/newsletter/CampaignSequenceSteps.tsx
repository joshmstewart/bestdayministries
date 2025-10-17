import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface SequenceStep {
  id: string;
  step_number: number;
  delay_value: number;
  delay_unit: string;
  campaign_id: string | null;
  subject_line: string;
}

interface CampaignSequenceStepsProps {
  steps: SequenceStep[];
  onChange: (steps: SequenceStep[]) => void;
  availableCampaigns?: Array<{ id: string; title: string }>;
}

export const CampaignSequenceSteps = ({
  steps,
  onChange,
  availableCampaigns = [],
}: CampaignSequenceStepsProps) => {
  const addStep = () => {
    const newStep: SequenceStep = {
      id: `temp-${Date.now()}`,
      step_number: steps.length + 1,
      delay_value: 1,
      delay_unit: "days",
      campaign_id: null,
      subject_line: "",
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onChange(newSteps.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onChange(newSteps);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Label className="text-base">Sequence Steps</Label>
          <p className="text-sm text-muted-foreground">
            Add follow-up emails sent after delays
          </p>
        </div>
        <Button onClick={addStep} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No sequence steps yet</p>
          <Button onClick={addStep} variant="outline">
            Add First Step
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <Card key={step.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Step {step.step_number}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`delay-value-${index}`}>Wait</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`delay-value-${index}`}
                          type="number"
                          min="1"
                          value={step.delay_value}
                          onChange={(e) =>
                            updateStep(index, { delay_value: parseInt(e.target.value) })
                          }
                          className="w-20"
                        />
                        <Select
                          value={step.delay_unit}
                          onValueChange={(value) =>
                            updateStep(index, { delay_unit: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`campaign-${index}`}>Campaign</Label>
                      <Select
                        value={step.campaign_id || ""}
                        onValueChange={(value) =>
                          updateStep(index, { campaign_id: value })
                        }
                      >
                        <SelectTrigger id={`campaign-${index}`}>
                          <SelectValue placeholder="Select campaign..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCampaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`subject-${index}`}>Subject Override (Optional)</Label>
                    <Input
                      id={`subject-${index}`}
                      value={step.subject_line}
                      onChange={(e) =>
                        updateStep(index, { subject_line: e.target.value })
                      }
                      placeholder="Leave empty to use campaign subject"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(index)}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
