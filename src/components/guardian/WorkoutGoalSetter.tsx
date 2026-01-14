import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Target, Loader2, Save } from "lucide-react";

interface WorkoutGoalSetterProps {
  bestieId: string;
  bestieName: string;
}

export const WorkoutGoalSetter = ({ bestieId, bestieName }: WorkoutGoalSetterProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(5);
  const [existingGoalId, setExistingGoalId] = useState<string | null>(null);

  useEffect(() => {
    loadGoal();
  }, [bestieId]);

  const loadGoal = async () => {
    try {
      const { data, error } = await supabase
        .from("user_workout_goals")
        .select("*")
        .eq("user_id", bestieId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setWeeklyGoal((data as any).weekly_goal ?? 5);
        setExistingGoalId((data as any).id);
      }
    } catch (error: any) {
      console.error("Error loading workout goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existingGoalId) {
        const { error } = await supabase
          .from("user_workout_goals")
          .update({ 
            weekly_goal: weeklyGoal,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingGoalId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("user_workout_goals")
          .insert({
            user_id: bestieId,
            weekly_goal: weeklyGoal
          })
          .select("id")
          .single();

        if (error) throw error;
        setExistingGoalId(data.id);
      }

      toast({
        title: "Goal saved",
        description: `Weekly workout goal for ${bestieName} set to ${weeklyGoal} activities`,
      });
    } catch (error: any) {
      toast({
        title: "Error saving goal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading goal...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Weekly Workout Goal
        </CardTitle>
        <CardDescription>
          Set how many activities {bestieName} should complete each week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor={`goal-${bestieId}`} className="sr-only">
              Weekly Goal
            </Label>
            <Input
              id={`goal-${bestieId}`}
              type="number"
              min={1}
              max={50}
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-24"
            />
          </div>
          <span className="text-sm text-muted-foreground pb-2">activities per week</span>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-2">Save</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
