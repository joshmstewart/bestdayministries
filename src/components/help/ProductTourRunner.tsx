import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Joyride, { Step, CallBackProps, STATUS, TooltipRenderProps } from "react-joyride";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { TextToSpeech } from "@/components/TextToSpeech";

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
    // Filter steps based on element existence
    const detectElements = () => {
      const availableSteps = tour.steps.filter(step => {
        if (!step.target) return true; // Keep steps without targets (info-only steps)
        
        const element = document.querySelector(step.target as string);
        if (!element) {
          return false;
        }
        return true;
      });

      setFilteredSteps(availableSteps);

      // Start tour if we have at least one step
      if (availableSteps.length > 0) {
        setRun(true);
      } else {
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

  // Custom tooltip with TTS
  const CustomTooltip = ({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
  }: TooltipRenderProps) => {
    const content = typeof step.content === 'string' ? step.content : '';
    const title = typeof step.title === 'string' ? step.title : '';
    const textToRead = title ? `${title}. ${content}` : content;

    return (
      <div {...tooltipProps} style={{
        backgroundColor: 'hsl(var(--card))',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '400px',
      }}>
        {title && (
          <div style={{ 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600',
              color: 'hsl(var(--foreground))',
              margin: 0,
              flex: 1,
            }}>
              {title}
            </h3>
            <TextToSpeech text={textToRead} size="sm" />
          </div>
        )}
        <div style={{ 
          marginBottom: '16px',
          color: 'hsl(var(--muted-foreground))',
          lineHeight: '1.5',
        }}>
          {content}
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            {...skipProps}
            style={{
              color: 'hsl(var(--muted-foreground))',
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            Skip Tour
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {index > 0 && (
              <button
                {...backProps}
                style={{
                  color: 'hsl(var(--foreground))',
                  background: 'hsl(var(--secondary))',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              {...primaryProps}
              style={{
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
        tooltipComponent={CustomTooltip}
        styles={{
          options: {
            primaryColor: "hsl(var(--primary))",
            zIndex: 10000,
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
