import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  is_featured: boolean;
  pack_image_url: string | null;
}

interface CollectionSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCollection: (collectionId: string) => void;
  isDailyPack?: boolean;
}

export const CollectionSelectorDialog = ({
  open,
  onOpenChange,
  onSelectCollection,
  isDailyPack = false,
}: CollectionSelectorDialogProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCollections();
    }
  }, [open]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sticker_collections')
        .select('id, name, description, theme, is_featured, pack_image_url')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('name');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (collectionId: string) => {
    onSelectCollection(collectionId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Sticker Collection</DialogTitle>
          <DialogDescription>
            {isDailyPack 
              ? "Choose which collection you'd like to open for your free daily pack" 
              : "Choose which collection you'd like to open a pack from"
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No collections available at this time
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer group"
                onClick={() => handleSelect(collection.id)}
              >
                <div className="space-y-3">
                  {collection.pack_image_url && (
                    <div className="aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={collection.pack_image_url}
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                      <h3 className="font-semibold">{collection.name}</h3>
                      {collection.is_featured && (
                        <Badge variant="default" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    {collection.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    
                    <Badge variant="outline">{collection.theme}</Badge>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(collection.id);
                    }}
                  >
                    Open Pack
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
