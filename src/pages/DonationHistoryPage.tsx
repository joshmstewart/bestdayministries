import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { DonationHistory } from "@/components/sponsor/DonationHistory";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DonationHistoryPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Tax Receipts & Donation History</h1>
            <p className="text-muted-foreground mt-2">
              View and download receipts for all your donations and sponsorships
            </p>
          </div>

          <DonationHistory />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DonationHistoryPage;
