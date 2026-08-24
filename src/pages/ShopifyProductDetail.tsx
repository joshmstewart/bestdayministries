import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { fetchShopifyProductById } from "@/lib/shopify";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";

const ShopifyProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const addItem = useShopifyCartStore((state) => state.addItem);

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["shopify-product", productId],
    queryFn: () => fetchShopifyProductById(productId!),
    enabled: !!productId,
  });

  useEffect(() => {
    if (product && !selectedVariantId) {
      setSelectedVariantId(product.node.variants.edges[0]?.node.id ?? "");
    }
  }, [product, selectedVariantId]);

  const node = product?.node;
  const variants = node?.variants.edges ?? [];
  const selectedVariant = variants.find((v) => v.node.id === selectedVariantId)?.node;
  const images = node?.images.edges ?? [];
  const price = selectedVariant?.price || node?.priceRange.minVariantPrice;

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions,
    });
    setJustAdded(true);
    toast.success(`${node?.title} added to cart`);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={node ? `${node.title} | Best Day Ever Shop` : "Shop | Best Day Ever"}
        description={node?.description?.slice(0, 155) || "Official Best Day Ever merchandise."}
        type="website"
      />
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-5xl">
          <Button variant="outline" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Button>

          {isLoading ? (
            <div className="grid gap-8 md:grid-cols-2">
              <Skeleton className="aspect-square w-full" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : isError || !node ? (
            <div className="py-20 text-center space-y-4">
              <h1 className="text-2xl font-bold">Product not available</h1>
              <p className="text-muted-foreground">
                This item is no longer listed in our shop.
              </p>
              <Button asChild>
                <Link to="/joyhousestore">Browse the shop</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {images[imageIndex]?.node?.url ? (
                    <img
                      src={images[imageIndex].node.url}
                      alt={images[imageIndex].node.altText || node.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((img, i) => (
                      <button
                        key={img.node.url}
                        onClick={() => setImageIndex(i)}
                        className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 ${
                          i === imageIndex ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img src={img.node.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-3xl font-bold leading-tight">{node.title}</h1>
                  <Badge variant="secondary" className="shrink-0">Official</Badge>
                </div>

                {price && (
                  <p className="text-2xl font-bold text-primary">
                    ${parseFloat(price.amount).toFixed(2)} {price.currencyCode}
                  </p>
                )}

                {node.description && (
                  <p className="whitespace-pre-line text-muted-foreground">{node.description}</p>
                )}

                {variants.length > 1 && (
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
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

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleAddToCart}
                  className="w-full"
                  size="lg"
                  disabled={!selectedVariant?.availableForSale}
                >
                  {justAdded ? (
                    <><Check className="mr-2 h-4 w-4" />Added!</>
                  ) : (
                    <><ShoppingCart className="mr-2 h-4 w-4" />Add to Cart</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShopifyProductDetail;
