import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

interface ProductTourRunnerProps {
  tour: {
    id: string;
    title: string;
    description: string;
    steps: Step[];
    required_route?: string;
  };
  onClose: () => void;
}

export function ProductTourRunner({ tour, onClose }: ProductTourRunnerProps) {
  const navigate = useNavigate();
  const [run, setRun] = useState(false);
  const [filteredSteps, setFilteredSteps] = useState<Step[]>([]);
  const { toast } = useToast();

  console.log('ProductTourRunner - Received tour:', tour?.title, 'Steps:', tour?.steps?.length);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle navigation for steps with routes
    if (type === 'step:before' && tour.steps[index] && (tour.steps[index] as any).route) {
      const stepRoute = (tour.steps[index] as any).route;
      // Preserve the tour query parameter when navigating
      navigate(`${stepRoute}?tour=${tour.id}`);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      
      // If tour was finished (not skipped), celebrate and mark as complete
      if (status === STATUS.FINISHED) {
        // Trigger confetti celebration
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = window.setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        }, 250);

        // Mark tour as complete in database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("tour_completions")
              .insert({
                user_id: user.id,
                tour_id: tour.id
              });

            toast({
              title: "🎉 Tour Complete!",
              description: `You've finished the "${tour.title}" tour. Great job!`,
            });
          }
        } catch (error) {
          console.error("Error marking tour as complete:", error);
        }
      }
      
      onClose();
    }
  };

  useEffect(() => {
    console.log('ProductTourRunner - Starting element detection');
    
    // Filter steps based on element existence
    const detectElements = () => {
      const availableSteps = tour.steps.filter(step => {
        if (!step.target) return true; // Keep steps without targets (info-only steps)
        
        const element = document.querySelector(step.target as string);
        if (!element) {
          console.log('ProductTourRunner - Skipping step, element not found:', step.target);
          return false;
        }
        return true;
      });

      console.log(`ProductTourRunner - Filtered ${tour.steps.length} steps to ${availableSteps.length} available steps`);
      setFilteredSteps(availableSteps);

      // Start tour if we have at least one step
      if (availableSteps.length > 0) {
        setRun(true);
      } else {
        console.log('ProductTourRunner - No elements found, closing tour');
        onClose();
      }
    };

    // Give the page time to render before checking
    const timer = setTimeout(detectElements, 500);
    
    return () => clearTimeout(timer);
  }, [tour.steps, onClose]);

  // Ensure all filtered steps have disableBeacon set to true to avoid the glowing dot
  const stepsWithBeaconDisabled = filteredSteps.map(step => ({
    ...step,
    disableBeacon: true,
  }));

  return (
    <>
      <Joyride
        steps={stepsWithBeaconDisabled}
        run={run}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep={false}
        disableScrolling={false}
        scrollOffset={150}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: "hsl(var(--primary))",
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: "8px",
          },
          buttonNext: {
            backgroundColor: "hsl(var(--primary))",
            borderRadius: "6px",
            padding: "8px 16px",
          },
          buttonBack: {
            color: "hsl(var(--foreground))",
            marginRight: "8px",
          },
          buttonSkip: {
            color: "hsl(var(--muted-foreground))",
          },
        }}
        locale={{
          back: "Back",
          close: "Close",
          last: "Finish",
          next: "Next",
          skip: "Skip Tour",
        }}
      />

      {/* Manual close button overlay */}
      <div className="fixed top-4 right-4 z-[10001]">
        <Button
          onClick={onClose}
          variant="outline"
          size="icon"
          className="bg-background shadow-lg"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
