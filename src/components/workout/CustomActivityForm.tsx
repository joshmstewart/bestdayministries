import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";

// Common activity emojis to choose from
const EMOJI_OPTIONS = [
  "🏃", "🚴", "🏊", "🧘", "💪", "🏋️", "⚽", "🏀", "🎾", "🏓",
  "⛳", "🎳", "🥊", "🤸", "🚶", "🧗", "🛹", "⛷️", "🏄", "🤾",
  "🎯", "🏇", "🥋", "🤺", "🏸", "🥅", "🤿", "🎿", "⛸️", "🛷",
];

interface CustomActivityFormProps {
  userId: string;
  onSuccess: (activity: { id: string; name: string }) => void;
  onCancel: () => void;
}

export function CustomActivityForm({ userId, onSuccess, onCancel }: CustomActivityFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏃");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workout_activities")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedEmoji,
          category: "Custom",
          user_id: userId,
          is_active: true,
          display_order: 999,
        })
        .select("id, name")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Custom activity created!");
      queryClient.invalidateQueries({ queryKey: ["all-workout-activities"] });
      queryClient.invalidateQueries({ queryKey: ["workout-activities"] });
      onSuccess({ id: data.id, name: data.name });
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to create activity", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an activity name");
      return;
    }
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="emoji">Choose an Icon</Label>
        <div className="flex flex-wrap gap-2 p-2 border rounded-lg max-h-32 overflow-y-auto">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`text-2xl p-1 rounded hover:bg-muted transition-colors ${
                selectedEmoji === emoji ? "bg-primary/20 ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Activity Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Morning Stretches"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Add details about this activity..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={200}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="flex-1"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            "Create & Log"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Custom activities are private to you
      </p>
    </form>
  );
}
