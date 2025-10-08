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
    console.log('ProductTourRunner - Starting element check for target:', tour.steps[0]?.target);
    // Wait for the first target element to be available before starting
    const firstStep = tour.steps[0];
    if (!firstStep?.target) {
      console.log('ProductTourRunner - No target, starting immediately');
      setRun(true);
      return;
    }

    const checkElement = () => {
      const element = document.querySelector(firstStep.target as string);
      if (element) {
        console.log('ProductTourRunner - Element found! Starting tour');
        setRun(true);
      } else {
        // Keep checking until element is found or timeout after 5 seconds
        setTimeout(checkElement, 200);
      }
    };

    // Start checking after brief delay
    const timer = setTimeout(checkElement, 500);
    
    // Timeout fallback - start anyway after 5 seconds
    const fallbackTimer = setTimeout(() => {
      console.log('ProductTourRunner - Timeout reached, starting tour anyway');
      setRun(true);
    }, 5000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [tour.steps]);

  return (
    <>
      <Joyride
        steps={tour.steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep={false}
        disableScrolling={false}
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
