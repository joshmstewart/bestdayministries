import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, MoveUp, MoveDown } from "lucide-react";
import { Step } from "react-joyride";

interface TourStep {
  target: string;
  content: string;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center" | "auto";
  disableBeacon?: boolean;
}

interface TourStepBuilderProps {
  steps: TourStep[];
  onChange: (steps: TourStep[]) => void;
}

export function TourStepBuilder({ steps, onChange }: TourStepBuilderProps) {
  const addStep = () => {
    onChange([
      ...steps,
      {
        target: "",
        content: "",
        placement: "bottom",
        disableBeacon: false,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof TourStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    onChange(newSteps);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </p>
        <Button onClick={addStep} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No steps yet. Click "Add Step" to create your first tour step.
          </CardContent>
        </Card>
      )}

      {steps.map((step, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                Step {index + 1}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveStep(index, "up")}
                  disabled={index === 0}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveStep(index, "down")}
                  disabled={index === steps.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`target-${index}`}>
                Target (CSS Selector) *
              </Label>
              <Input
                id={`target-${index}`}
                value={step.target}
                onChange={(e) => updateStep(index, "target", e.target.value)}
                placeholder="e.g., .community-button, #profile-link"
              />
              <p className="text-xs text-muted-foreground mt-1">
                CSS selector for the element to highlight
              </p>
            </div>

            <div>
              <Label htmlFor={`title-${index}`}>Title (Optional)</Label>
              <Input
                id={`title-${index}`}
                value={step.title || ""}
                onChange={(e) => updateStep(index, "title", e.target.value)}
                placeholder="Step title"
              />
            </div>

            <div>
              <Label htmlFor={`content-${index}`}>Content *</Label>
              <Textarea
                id={`content-${index}`}
                value={step.content}
                onChange={(e) => updateStep(index, "content", e.target.value)}
                placeholder="Describe what this step does..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`placement-${index}`}>Placement</Label>
                <Select
                  value={step.placement || "bottom"}
                  onValueChange={(value) => updateStep(index, "placement", value)}
                >
                  <SelectTrigger id={`placement-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.disableBeacon || false}
                    onChange={(e) =>
                      updateStep(index, "disableBeacon", e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Disable beacon</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
