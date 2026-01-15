import { useState, useRef } from "react";
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
import { Loader2, PenLine, Share2 } from "lucide-react";
import { VoiceInput } from "@/components/VoiceInput";
import { TextToSpeech } from "@/components/TextToSpeech";
import { useQuery } from "@tanstack/react-query";
interface CreateJokeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onJokeCreated: () => void;
}

export function CreateJokeDialog({
  open,
  onOpenChange,
  userId,
  onJokeCreated,
}: CreateJokeDialogProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("mixed");
  const [shareWithCommunity, setShareWithCommunity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs to accumulate voice transcripts
  const questionTranscriptRef = useRef("");
  const answerTranscriptRef = useRef("");

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
      const { error } = await supabase.from("saved_jokes").insert({
        user_id: userId,
        question: question.trim(),
        answer: answer.trim(),
        category: category,
        is_public: shareWithCommunity,
      });

      if (error) throw error;

      toast.success(
        shareWithCommunity
          ? "Joke created and shared with the community! 🎉"
          : "Joke saved to your collection!"
      );

      // Reset form and refs
      setQuestion("");
      setAnswer("");
      setCategory("mixed");
      setShareWithCommunity(false);
      questionTranscriptRef.current = "";
      answerTranscriptRef.current = "";
      onOpenChange(false);
      onJokeCreated();
    } catch (error) {
      console.error("Error creating joke:", error);
      toast.error("Failed to create joke");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            Create Your Own Joke
          </DialogTitle>
          <DialogDescription>
            Write your own joke and share it with the community!
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
            ) : shareWithCommunity ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <PenLine className="w-4 h-4" />
            )}
            {shareWithCommunity ? "Create & Share" : "Create Joke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
