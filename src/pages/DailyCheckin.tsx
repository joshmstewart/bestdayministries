import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { DailyHub } from "@/components/daily-features/DailyHub";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Daily Check-in page showing mood, fortune, and streak features.
 */
export default function DailyCheckin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UnifiedHeader />
      <main className="flex-1 container max-w-2xl mx-auto px-4 pt-24 pb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-6">
          Daily Check-in
        </h1>

        <DailyHub />
      </main>
      <Footer />
    </div>
  );
}
