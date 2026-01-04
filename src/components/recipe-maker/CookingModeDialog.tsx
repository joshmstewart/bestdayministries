import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Lightbulb, ShoppingBasket, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextToSpeech } from "@/components/TextToSpeech";
import confetti from "canvas-confetti";

interface CookingModeDialogProps {
  recipe: {
    id: string;
    title: string;
    description: string | null;
    ingredients: string[];
    steps: string[];
    tips?: string[];
    safetyNotes?: string[];
    image_url?: string | null;
  };
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const CookingModeDialog = ({
  recipe,
  userId,
  open,
  onOpenChange,
  onComplete,
}: CookingModeDialogProps) => {
  const { toast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const hasTriggeredConfetti = useRef(false);
  const hasUpdatedDatabase = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCompletedSteps(new Set());
      setCurrentStep(0);
      hasTriggeredConfetti.current = false;
      hasUpdatedDatabase.current = false;
    }
  }, [open]);

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
        // Auto-advance to next step
        if (stepIndex === currentStep && stepIndex < recipe.steps.length - 1) {
          setCurrentStep(stepIndex + 1);
        }
      }
      return next;
    });
  };

  const allStepsCompleted = completedSteps.size === recipe.steps.length && recipe.steps.length > 0;

  // Trigger confetti and update database when all steps are completed
  useEffect(() => {
    if (allStepsCompleted && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      
      // Fire confetti from both sides
      const fireConfetti = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.1, y: 0.6 }
        });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.9, y: 0.6 }
        });
      };
      
      fireConfetti();
      setTimeout(fireConfetti, 250);

      // Update times_made in database
      if (!hasUpdatedDatabase.current) {
        hasUpdatedDatabase.current = true;
        updateTimesMade();
      }
    }
  }, [allStepsCompleted]);

  const updateTimesMade = async () => {
    try {
      // Get current times_made
      const { data: currentRecipe } = await supabase
        .from("saved_recipes")
        .select("times_made")
        .eq("id", recipe.id)
        .eq("user_id", userId)
        .single();

      if (currentRecipe) {
        await supabase
          .from("saved_recipes")
          .update({ 
            times_made: (currentRecipe.times_made || 0) + 1,
            last_made_at: new Date().toISOString()
          })
          .eq("id", recipe.id)
          .eq("user_id", userId);

        toast({
          title: "Recipe completed! 🎉",
          description: `You've now made this ${(currentRecipe.times_made || 0) + 1} time${(currentRecipe.times_made || 0) + 1 === 1 ? '' : 's'}!`,
        });

        onComplete?.();
      }
    } catch (error) {
      console.error("Error updating times_made:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            🍳 Cooking Mode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pb-4">
          {/* Recipe Title with TTS for title + description */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold text-primary">{recipe.title}</h2>
              <TextToSpeech 
                text={`${recipe.title}. ${recipe.description || ''}`}
                size="icon"
              />
            </div>
            {recipe.description && (
              <p className="text-muted-foreground mt-1">{recipe.description}</p>
            )}
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(completedSteps.size / recipe.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {completedSteps.size}/{recipe.steps.length}
            </span>
          </div>

          {/* Safety Notes */}
          {recipe.safetyNotes && recipe.safetyNotes.length > 0 && (
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">Things That Might Need Help</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipe.safetyNotes.map((note, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300"
                    >
                      ⚠️ {note}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients Reference with TTS */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBasket className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Ingredients</h3>
                <TextToSpeech 
                  text={`Ingredients you'll need: ${recipe.ingredients.join(', ')}`}
                  size="icon"
                />
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {ingredient}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-primary" />
              Steps to Follow
            </h3>
            
            <div className="space-y-3">
              {recipe.steps.map((step, index) => {
                const isCompleted = completedSteps.has(index);
                const isCurrent = index === currentStep;
                
                return (
                  <Card 
                    key={index}
                    className={cn(
                      "cursor-pointer transition-all",
                      isCompleted && "bg-green-50 dark:bg-green-900/20 border-green-300",
                      isCurrent && !isCompleted && "border-primary shadow-md",
                    )}
                    onClick={() => toggleStep(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors",
                            isCompleted 
                              ? "bg-green-500 text-white" 
                              : isCurrent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <p className={cn(
                          "text-sm leading-relaxed pt-1 flex-1",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {step}
                        </p>
                        <div onClick={(e) => e.stopPropagation()}>
                          <TextToSpeech 
                            text={`Step ${index + 1}: ${step}`}
                            size="icon"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Completion celebration */}
          {allStepsCompleted && (
            <div className="text-center p-6 rounded-xl bg-gradient-to-r from-green-100 to-primary/20 dark:from-green-900/30 dark:to-primary/20">
              <span className="text-4xl mb-2 block">🎉</span>
              <p className="font-semibold text-lg">Great job! You did it!</p>
              <p className="text-sm text-muted-foreground mb-4">Enjoy your delicious creation!</p>
              <Button onClick={() => onOpenChange(false)}>
                Done Cooking
              </Button>
            </div>
          )}

          {/* Tips with TTS */}
          {recipe.tips && recipe.tips.length > 0 && (
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Helpful Tips</h3>
                  <TextToSpeech 
                    text={`Helpful tips: ${recipe.tips.join('. ')}`}
                    size="icon"
                  />
                </div>
                <ul className="space-y-2">
                  {recipe.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-600">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
