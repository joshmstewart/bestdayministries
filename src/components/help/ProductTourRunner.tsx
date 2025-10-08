import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  console.log('ProductTourRunner - Received tour:', tour?.title, 'Steps:', tour?.steps?.length);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle navigation for steps with routes
    if (type === 'step:before' && tour.steps[index] && (tour.steps[index] as any).route) {
      const stepRoute = (tour.steps[index] as any).route;
      // Preserve the tour query parameter when navigating
      navigate(`${stepRoute}?tour=${tour.id}`);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
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
