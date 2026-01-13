import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  Sparkles,
  ChevronRight,
  Rocket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTourCompletions } from "@/hooks/useTourCompletions";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: "tour" | "link" | "check";
  tourId?: string;
  link?: string;
  checkField?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "profile",
    title: "Complete Your Profile",
    description: "Add your name and avatar to personalize your experience",
    action: "link",
    link: "/profile",
  },
  {
    id: "welcome-tour",
    title: "Take the Welcome Tour",
    description: "Learn the basics with our interactive walkthrough",
    action: "tour",
    tourId: "getting-started",
  },
  {
    id: "explore-community",
    title: "Explore the Community",
    description: "See what's happening in discussions and events",
    action: "link",
    link: "/community",
  },
  {
    id: "visit-games",
    title: "Try Our Games",
    description: "Have fun with memory match, coloring, and more",
    action: "link",
    link: "/games/memory-match",
  },
];

export function GettingStartedSection() {
  const navigate = useNavigate();
  const { isTourCompleted, loading: completionsLoading } = useTourCompletions();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    checkProgress();
  }, []);

  const checkProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check profile completion
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile?.display_name && profile?.avatar_url) {
        setHasProfile(true);
        setCompletedSteps(prev => new Set([...prev, "profile"]));
      }

      // Check localStorage for visited pages
      const visitedPages = JSON.parse(localStorage.getItem("visited_pages") || "[]");
      const newCompleted = new Set(completedSteps);
      
      if (visitedPages.includes("/community")) {
        newCompleted.add("explore-community");
      }
      if (visitedPages.some((p: string) => p.startsWith("/games"))) {
        newCompleted.add("visit-games");
      }
      
      setCompletedSteps(newCompleted);
    } catch (error) {
      console.error("Error checking onboarding progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepAction = (step: OnboardingStep) => {
    if (step.action === "link" && step.link) {
      navigate(step.link);
    } else if (step.action === "tour" && step.tourId) {
      // Navigate to help with tour param
      navigate(`/help?tour=${step.tourId}`);
    }
  };

  const isStepComplete = (step: OnboardingStep) => {
    if (step.action === "tour" && step.tourId) {
      return isTourCompleted(step.tourId);
    }
    return completedSteps.has(step.id);
  };

  const completedCount = ONBOARDING_STEPS.filter(isStepComplete).length;
  const progressPercent = (completedCount / ONBOARDING_STEPS.length) * 100;
  const isAllComplete = completedCount === ONBOARDING_STEPS.length;

  if (isLoading || completionsLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isAllComplete ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Getting Started</CardTitle>
          </div>
          {isAllComplete ? (
            <Badge className="bg-green-100 text-green-800 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Complete!
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {completedCount}/{ONBOARDING_STEPS.length}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isAllComplete 
            ? "You've completed all the getting started steps. Great job!"
            : "Complete these steps to get the most out of our platform"
          }
        </CardDescription>
        <Progress value={progressPercent} className="mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {ONBOARDING_STEPS.map((step) => {
          const completed = isStepComplete(step);
          
          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                completed 
                  ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex-shrink-0">
                {completed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${completed ? "text-green-700 dark:text-green-400" : ""}`}>
                  {step.title}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              
              {!completed && (
                <Button
                  size="sm"
                  variant={step.action === "tour" ? "default" : "outline"}
                  onClick={() => handleStepAction(step)}
                  className="flex-shrink-0"
                >
                  {step.action === "tour" ? (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Start
                    </>
                  ) : (
                    <>
                      Go
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
