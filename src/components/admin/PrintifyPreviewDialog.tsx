import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Plus, RefreshCw, AlertTriangle } from "lucide-react";

interface PrintifyVariant {
  id: number;
  title: string;
  price: number;
  is_enabled: boolean;
}

interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  images: { src: string }[];
  variants: PrintifyVariant[];
  is_imported: boolean;
  has_changes?: boolean;
  visible: boolean;
}

interface PrintifyPreviewDialogProps {
  product: PrintifyProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (product: PrintifyProduct, priceMarkup: number, editedTitle: string, editedDescription: string) => void;
  onSync?: (product: PrintifyProduct) => void;
  isImporting: boolean;
}

export const PrintifyPreviewDialog = ({
  product,
  open,
  onOpenChange,
  onImport,
  onSync,
  isImporting,
}: PrintifyPreviewDialogProps) => {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [priceMarkup, setPriceMarkup] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reset state when product changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && product) {
      setEditedTitle(product.title);
      setEditedDescription(product.description);
      setPriceMarkup(0);
      setSelectedImageIndex(0);
    }
    onOpenChange(isOpen);
  };

  if (!product) return null;

  const enabledVariants = product.variants.filter(v => v.is_enabled);
  const basePrice = enabledVariants[0]?.price || product.variants[0]?.price || 0;
  const finalPrice = basePrice + priceMarkup;

  const handleSubmit = () => {
    onImport(product, priceMarkup, editedTitle, editedDescription);
  };

  const handleSync = () => {
    if (onSync) {
      onSync(product);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.is_imported ? "Update Product" : "Preview & Import"}
            {product.has_changes && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Has Updates
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {product.is_imported
              ? "This product has changes in Printify. Review and sync to update."
              : "Review and edit product details before importing to your store."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            {/* Images */}
            <div className="space-y-3">
              {product.images[selectedImageIndex] && (
                <div className="aspect-square bg-secondary/10 rounded-lg overflow-hidden">
                  <img
                    src={product.images[selectedImageIndex].src}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                        idx === selectedImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={img.src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title</Label>
                <Input
                  id="title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Variants ({enabledVariants.length} enabled)</Label>
                <div className="flex flex-wrap gap-2">
                  {enabledVariants.slice(0, 8).map((v) => (
                    <Badge key={v.id} variant="secondary" className="text-xs">
                      {v.title}
                    </Badge>
                  ))}
                  {enabledVariants.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{enabledVariants.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="markup">Price Markup</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceMarkup}
                    onChange={(e) => setPriceMarkup(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Base: ${basePrice.toFixed(2)} → Final: <span className="font-medium">${finalPrice.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {product.is_imported ? (
            <Button onClick={handleSync} disabled={isImporting}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isImporting ? 'animate-spin' : ''}`} />
              Sync Updates
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isImporting}>
              <Plus className="h-4 w-4 mr-2" />
              Import to Store
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
