import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BestieSponsorMessenger } from "@/components/bestie/BestieSponsorMessenger";
import { useToast } from "@/hooks/use-toast";

export default function BestieMessages() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch role from user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "bestie") {
        toast({
          title: "Access denied",
          description: "Only besties can access this page",
          variant: "destructive",
        });
        navigate("/community");
        return;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-20 pb-6">
        <div className="container mx-auto px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Message Your Sponsors</h1>
              <p className="text-muted-foreground mt-2">
                Send updates and thank you messages to everyone who sponsors you
              </p>
            </div>

            <BestieSponsorMessenger />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}