import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, PenLine, Share2, Edit } from "lucide-react";
import { VoiceInput } from "@/components/VoiceInput";
import { TextToSpeech } from "@/components/TextToSpeech";
import { useQuery } from "@tanstack/react-query";
interface CreateJokeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onJokeCreated: () => void;
  editingJoke?: {
    id: string;
    question: string;
    answer: string;
    category: string;
    is_public: boolean;
  } | null;
}

export function CreateJokeDialog({
  open,
  onOpenChange,
  userId,
  onJokeCreated,
  editingJoke,
}: CreateJokeDialogProps) {
  const isEditing = !!editingJoke;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("mixed");
  const [shareWithCommunity, setShareWithCommunity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs to accumulate voice transcripts
  const questionTranscriptRef = useRef("");
  const answerTranscriptRef = useRef("");

  // Populate form when editing
  useEffect(() => {
    if (editingJoke && open) {
      setQuestion(editingJoke.question);
      setAnswer(editingJoke.answer);
      setCategory(editingJoke.category || "mixed");
      setShareWithCommunity(editingJoke.is_public);
      questionTranscriptRef.current = editingJoke.question;
      answerTranscriptRef.current = editingJoke.answer;
    } else if (!open) {
      // Reset form when dialog closes
      setQuestion("");
      setAnswer("");
      setCategory("mixed");
      setShareWithCommunity(false);
      questionTranscriptRef.current = "";
      answerTranscriptRef.current = "";
    }
  }, [editingJoke, open]);

  const { data: categories = [] } = useQuery({
    queryKey: ["joke-categories-for-create"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("joke_categories")
        .select("id, name, emoji")
        .eq("is_active", true)
        .neq("name", "random")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Voice transcript handlers for question
  const handleQuestionTranscript = (text: string) => {
    questionTranscriptRef.current = questionTranscriptRef.current
      ? `${questionTranscriptRef.current} ${text}`
      : text;
    setQuestion(questionTranscriptRef.current);
  };

  // Voice transcript handlers for answer
  const handleAnswerTranscript = (text: string) => {
    answerTranscriptRef.current = answerTranscriptRef.current
      ? `${answerTranscriptRef.current} ${text}`
      : text;
    setAnswer(answerTranscriptRef.current);
  };

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("Please fill in both question and answer");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && editingJoke) {
        // Update existing joke
        // Set shared_at when newly sharing, keep existing if already shared
        const updateData: Record<string, unknown> = {
          question: question.trim(),
          answer: answer.trim(),
          category: category,
          is_public: shareWithCommunity,
        };
        // Only set shared_at if sharing for the first time (wasn't public before but is now)
        if (shareWithCommunity && !editingJoke.is_public) {
          updateData.shared_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from("saved_jokes")
          .update(updateData)
          .eq("id", editingJoke.id);

        if (error) throw error;
        toast.success("Joke updated! ✨");
      } else {
        // Create new joke
        const { error } = await supabase.from("saved_jokes").insert({
          user_id: userId,
          question: question.trim(),
          answer: answer.trim(),
          category: category,
          is_public: shareWithCommunity,
          shared_at: shareWithCommunity ? new Date().toISOString() : null,
          is_user_created: true,
        });

        if (error) throw error;
        toast.success(
          shareWithCommunity
            ? "Joke created and shared with the community! 🎉"
            : "Joke saved to your collection!"
        );
      }

      onOpenChange(false);
      onJokeCreated();
    } catch (error) {
      console.error("Error saving joke:", error);
      toast.error(isEditing ? "Failed to update joke" : "Failed to create joke");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <Edit className="w-5 h-5 text-primary" />
            ) : (
              <PenLine className="w-5 h-5 text-primary" />
            )}
            {isEditing ? "Edit Your Joke" : "Create Your Own Joke"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your joke below"
              : "Write your own joke and share it with the community!"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <div className="flex gap-2 items-start">
              <Textarea
                id="question"
                placeholder="Why did the chicken cross the road?"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  questionTranscriptRef.current = e.target.value;
                }}
                className="resize-none flex-1"
                rows={2}
              />
              <div className="flex flex-col gap-1">
                <VoiceInput
                  onTranscript={handleQuestionTranscript}
                  showTranscript={false}
                  buttonSize="icon"
                  autoStop={true}
                  silenceStopSeconds={5}
                  maxDuration={30}
                />
                {question.trim() && (
                  <TextToSpeech text={question} size="icon" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Answer (Punchline)</Label>
            <div className="flex gap-2 items-start">
              <Textarea
                id="answer"
                placeholder="To get to the other side!"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  answerTranscriptRef.current = e.target.value;
                }}
                className="resize-none flex-1"
                rows={2}
              />
              <div className="flex flex-col gap-1">
                <VoiceInput
                  onTranscript={handleAnswerTranscript}
                  showTranscript={false}
                  buttonSize="icon"
                  autoStop={true}
                  silenceStopSeconds={5}
                  maxDuration={30}
                />
                {answer.trim() && (
                  <TextToSpeech text={answer} size="icon" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">🎲 Mixed</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.emoji || "🎲"} {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="share" className="text-sm font-medium">
                Share with Community
              </Label>
              <p className="text-xs text-muted-foreground">
                Let others see and enjoy your joke
              </p>
            </div>
            <Switch
              id="share"
              checked={shareWithCommunity}
              onCheckedChange={setShareWithCommunity}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !question.trim() || !answer.trim()}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditing ? (
              <Edit className="w-4 h-4" />
            ) : shareWithCommunity ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <PenLine className="w-4 h-4" />
            )}
            {isEditing
              ? "Save Changes"
              : shareWithCommunity
              ? "Create & Share"
              : "Create Joke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
