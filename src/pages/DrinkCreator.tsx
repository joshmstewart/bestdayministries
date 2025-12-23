import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DrinkCreatorWizard } from "@/components/drink-creator/DrinkCreatorWizard";
import { DrinkGallery } from "@/components/drink-creator/DrinkGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DrinkCreator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to create custom drinks",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, [navigate, toast]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Drink Creator
          </h1>
          <p className="text-muted-foreground">
            Create your dream drink and share it with the community!
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <DrinkCreatorWizard userId={user.id} />
          </TabsContent>

          <TabsContent value="gallery">
            <DrinkGallery userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default DrinkCreator;
