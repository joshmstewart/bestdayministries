import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ProductOption {
  name: string;
  values: string[];
}

interface ProductReviewPreviewProps {
  name: string;
  description: string;
  price: number;
  inventoryCount: number;
  category: string;
  tags: string[];
  images: string[];
  options: ProductOption[];
}

export const ProductReviewPreview = ({
  name,
  description,
  price,
  inventoryCount,
  category,
  tags,
  images,
  options,
}: ProductReviewPreviewProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <p className="text-sm text-muted-foreground mb-4 text-center">
        This is how your product will appear in the store
      </p>
      
      <Card className="max-w-2xl mx-auto overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Image Section */}
            <div className="space-y-3">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentImageIndex]}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80"
                          onClick={nextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No images
                  </div>
                )}
              </div>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {images.slice(0, 5).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-12 h-12 rounded border-2 overflow-hidden ${
                        idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {images.length > 5 && (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      +{images.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{name || "Product Name"}</h2>
                {category && (
                  <p className="text-sm text-muted-foreground">{category}</p>
                )}
              </div>

              <p className="text-2xl font-bold text-primary">
                ${price.toFixed(2)}
              </p>

              <p className="text-sm text-muted-foreground line-clamp-4">
                {description || "Product description will appear here..."}
              </p>

              {/* Options Preview */}
              {options.length > 0 && (
                <div className="space-y-3">
                  {options.map((option, idx) => (
                    <div key={idx}>
                      <p className="text-sm font-medium mb-1">{option.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {option.values.slice(0, 5).map((value, vIdx) => (
                          <Badge key={vIdx} variant="outline" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                        {option.values.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{option.values.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Inventory */}
              <p className="text-sm text-muted-foreground">
                {inventoryCount > 0 ? `${inventoryCount} in stock` : "Out of stock"}
              </p>

              {/* Mock Add to Cart */}
              <Button className="w-full" disabled>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart (Preview)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
