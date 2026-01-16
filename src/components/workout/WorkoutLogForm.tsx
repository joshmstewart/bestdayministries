import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkoutImageGeneration } from "@/hooks/useWorkoutImageGeneration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Dumbbell, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACTIVITY_OPTIONS = ["Walking", "Running", "Cycling", "Swimming", "Yoga", "Strength Training", "Dancing", "Hiking", "Stretching", "Sports", "Other"];

interface WorkoutLogFormProps { onLogComplete?: () => void; }

export function WorkoutLogForm({ onLogComplete }: WorkoutLogFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationImage, setCelebrationImage] = useState<string | null>(null);

  const { selectedAvatar, isGenerating, generateActivityImage, weeklyProgress, celebrationGenerated } = useWorkoutImageGeneration(user?.id);

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !activity) throw new Error("Missing required fields");
      const { data: log, error } = await supabase
        .from("user_workout_logs")
        .insert({ user_id: user.id, workout_type: activity, notes: notes || null })
        .select().single();
      if (error) throw error;
      return log;
    },
    onSuccess: async (log) => {
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-workout-count"] });
      queryClient.invalidateQueries({ queryKey: ["workout-weekly-progress"] });
      toast.success("Workout logged! 💪");

      if (selectedAvatar?.id) {
        await generateActivityImage(activity, log.id);
      }

      setActivity(""); setDuration(""); setNotes("");
      onLogComplete?.();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to log workout"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) { toast.error("Please select an activity"); return; }
    logMutation.mutate();
  };

  const isLoading = logMutation.isPending || isGenerating;

  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Dumbbell className="h-5 w-5" />Log Workout</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Activity *</Label>
              <Select value={activity} onValueChange={setActivity}><SelectTrigger><SelectValue placeholder="What did you do?" /></SelectTrigger><SelectContent>{ACTIVITY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" placeholder="30" value={duration} onChange={(e) => setDuration(e.target.value)} min={1} max={480} /></div>
            <div className="space-y-2"><Label>Notes (optional)</Label><Input placeholder="How did it feel?" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            {selectedAvatar && <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm"><Sparkles className="h-4 w-4 text-primary" /><span>AI image will be generated with <strong>{selectedAvatar.name}</strong></span></div>}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isGenerating ? "Generating Image..." : "Logging..."}</> : <><Check className="h-4 w-4 mr-2" />Log Workout</>}</Button>
          </form>
        </CardContent>
      </Card>
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="text-center text-2xl">🎉 Weekly Goal Achieved! 🎉</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">{celebrationImage && <img src={celebrationImage} alt="Celebration" className="w-full max-w-xs rounded-lg shadow-lg" />}<p className="text-center text-muted-foreground">Amazing work! You crushed your weekly goal! 💪</p><Button onClick={() => setShowCelebration(false)}>Keep Going!</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
