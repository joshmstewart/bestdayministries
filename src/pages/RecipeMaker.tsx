import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RecipeMakerWizard } from "@/components/recipe-maker/RecipeMakerWizard";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const RecipeMaker = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to use the Recipe Maker",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnifiedHeader />

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pt-24">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/community")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">🍳 Recipe Maker</h1>
          <p className="text-muted-foreground">
            Tell us what ingredients you have, and we'll suggest easy things you can make!
          </p>
        </div>

        <RecipeMakerWizard userId={user.id} />
      </main>

      <Footer />
    </div>
  );
};

export default RecipeMaker;
