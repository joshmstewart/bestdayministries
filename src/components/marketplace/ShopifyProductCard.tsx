import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Check } from "lucide-react";
import { ShopifyProduct } from "@/lib/shopify";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { toast } from "sonner";

interface ShopifyProductCardProps {
  product: ShopifyProduct;
}

export const ShopifyProductCard = ({ product }: ShopifyProductCardProps) => {
  const { node } = product;
  const addItem = useShopifyCartStore(state => state.addItem);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    node.variants.edges[0]?.node.id || ''
  );
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = node.variants.edges.find(
    v => v.node.id === selectedVariantId
  )?.node;

  const price = selectedVariant?.price || node.priceRange.minVariantPrice;
  const imageUrl = node.images.edges[0]?.node.url;
  const hasMultipleVariants = node.variants.edges.length > 1;

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions,
    });

    setJustAdded(true);
    toast.success(`${node.title} added to cart`);
    
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="aspect-square overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={node.images.edges[0]?.node.altText || node.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">
            {node.title}
          </h3>
          <Badge variant="secondary" className="shrink-0">
            Official
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {node.description || "Official Best Day Ever merchandise"}
        </p>

        <p className="text-xl font-bold text-primary">
          ${parseFloat(price.amount).toFixed(2)} {price.currencyCode}
        </p>

        {hasMultipleVariants && (
          <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {node.variants.edges.map((variant) => (
                <SelectItem 
                  key={variant.node.id} 
                  value={variant.node.id}
                  disabled={!variant.node.availableForSale}
                >
                  {variant.node.title}
                  {!variant.node.availableForSale && " (Out of stock)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={handleAddToCart} 
          className="w-full"
          disabled={!selectedVariant?.availableForSale}
        >
          {justAdded ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
