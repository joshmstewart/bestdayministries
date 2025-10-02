import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Heart, Home } from "lucide-react";

const SponsorshipSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      navigate("/sponsor-bestie");
    }
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2 shadow-2xl">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto animate-bounce-slow">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Thank You!
              </h1>
              <p className="text-xl text-muted-foreground">
                Your sponsorship has been confirmed
              </p>
            </div>

            <div className="bg-gradient-card p-6 rounded-xl border-2 space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Heart className="w-6 h-6 fill-primary" />
                <span className="font-bold text-lg">You're making a difference!</span>
              </div>
              <p className="text-muted-foreground">
                Your generosity directly supports a Bestie's journey of growth, creativity, and community engagement. 
                You'll receive a confirmation email with all the details shortly.
              </p>
            </div>

            <div className="pt-6 space-y-3">
              <Button
                onClick={() => navigate("/")}
                size="lg"
                className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-to-r from-primary via-accent to-secondary border-0"
              >
                <Home className="w-5 h-5 mr-2" />
                Return Home
              </Button>
              <Button
                onClick={() => navigate("/community")}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Explore Our Community
              </Button>
            </div>

            <p className="text-sm text-muted-foreground pt-4">
              Session ID: {sessionId?.slice(0, 20)}...
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default SponsorshipSuccess;
