import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ColoringGalleryProps {
  onSelectColoring: (page: any) => void;
}

export function ColoringGallery({ onSelectColoring }: ColoringGalleryProps) {
  const { user } = useAuth();

  const { data: savedColorings, isLoading, refetch } = useQuery({
    queryKey: ["user-colorings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_colorings")
        .select(`
          *,
          coloring_page:coloring_pages(*)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("user_colorings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted!");
      refetch();
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Sign in to see your saved colorings!
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading your gallery...</div>;
  }

  if (!savedColorings?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You haven't saved any colorings yet. Start coloring to build your gallery!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {savedColorings.map((coloring) => (
        <Card
          key={coloring.id}
          className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden group relative"
          onClick={() => onSelectColoring(coloring.coloring_page)}
        >
          <CardContent className="p-0">
            <img
              src={coloring.thumbnail_url || coloring.coloring_page?.image_url}
              alt={coloring.coloring_page?.title}
              className="w-full aspect-square object-cover"
            />
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">
                {coloring.coloring_page?.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Last edited: {new Date(coloring.updated_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={(e) => handleDelete(coloring.id, e)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
