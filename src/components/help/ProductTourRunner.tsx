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

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onClose();
    }
  };

  useEffect(() => {
    // Navigate to required route if specified
    if (tour.required_route) {
      navigate(tour.required_route);
      // Wait for navigation and page render before starting tour
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000); // Increased timeout to ensure page is fully loaded
      return () => clearTimeout(timer);
    } else {
      // Start tour immediately if no navigation needed
      setRun(true);
    }
  }, [tour.required_route, navigate]);

  return (
    <>
      <Joyride
        steps={tour.steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
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
