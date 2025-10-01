import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Donate from "@/components/Donate";
import Footer from "@/components/Footer";

const DonatePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="outline" onClick={() => navigate("/community")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <Donate />
      </main>
      <Footer />
    </div>
  );
};

export default DonatePage;
