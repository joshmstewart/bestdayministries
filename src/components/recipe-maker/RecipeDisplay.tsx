import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Lightbulb, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeDisplayProps {
  recipe: {
    title: string;
    description: string;
    ingredients: string[];
    steps: string[];
    tips: string[];
    imageUrl?: string;
  };
}

export const RecipeDisplay = ({ recipe }: RecipeDisplayProps) => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

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

  const allStepsCompleted = completedSteps.size === recipe.steps.length;

  return (
    <div className="space-y-6">
      {/* Recipe header with image */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-primary">{recipe.title}</h2>
        <p className="text-muted-foreground">{recipe.description}</p>
        
        {recipe.imageUrl && (
          <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden border-4 border-primary/30 shadow-lg">
            <div 
              className={cn(
                "absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center transition-opacity duration-300",
                imageLoaded ? "opacity-0" : "opacity-100"
              )}
            >
              <span className="text-4xl">🍳</span>
            </div>
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
        )}
      </div>

      {/* Ingredients */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">What You'll Need</h3>
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
                      "text-sm leading-relaxed pt-1",
                      isCompleted && "line-through text-muted-foreground"
                    )}>
                      {step}
                    </p>
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
          <p className="text-sm text-muted-foreground">Enjoy your delicious creation!</p>
        </div>
      )}

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">Helpful Tips</h3>
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
  );
};
