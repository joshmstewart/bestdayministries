import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Palette, Image, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ColoringCanvas } from "@/components/coloring-book/ColoringCanvas";
import { ColoringGallery } from "@/components/coloring-book/ColoringGallery";

export default function ColoringBook() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pages");

  const { data: coloringPages, isLoading } = useQuery({
    queryKey: ["coloring-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_pages")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (selectedPage) {
    return (
      <ColoringCanvas
        page={selectedPage}
        onBack={() => setSelectedPage(null)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container max-w-6xl mx-auto px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/community")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
            <Palette className="w-8 h-8" />
            Coloring Book
          </h1>
          <p className="text-muted-foreground mt-2">
            Pick a picture and bring it to life with colors!
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="pages" className="gap-2">
              <Image className="w-4 h-4" />
              Color Pages
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2" disabled={loading || !isAuthenticated}>
              <BookOpen className="w-4 h-4" />
              My Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            {isLoading ? (
              <div className="text-center py-12">Loading pages...</div>
            ) : !coloringPages?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                No coloring pages available yet. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {coloringPages.map((page) => (
                  <Card
                    key={page.id}
                    className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
                    onClick={() => setSelectedPage(page)}
                  >
                    <CardContent className="p-0">
                      <img
                        src={page.image_url}
                        alt={page.title}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate">{page.title}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {page.difficulty}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gallery">
            <ColoringGallery onSelectColoring={setSelectedPage} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
