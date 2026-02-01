import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Minus, Plus, ChevronLeft, ChevronRight, Coffee } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { FloatingCartButton } from "@/components/marketplace/FloatingCartButton";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { useCartSession } from "@/hooks/useCartSession";
import { useCoffeeCart } from "@/hooks/useCoffeeCart";

interface CoffeeProductTier {
  id: string;
  min_quantity: number;
  price_per_unit: number;
}

const CoffeeProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [quantity, setQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { getCartFilter, isLoading: cartSessionLoading } = useCartSession();
  const { addToCart: addCoffeeToCart, isLoading: addingToCart } = useCoffeeCart();

  // Fetch cart count
  const { data: cartCount } = useQuery({
    queryKey: ['cart-count', getCartFilter()],
    queryFn: async () => {
      const filter = getCartFilter();
      if (!filter) return 0;
      
      let query = supabase.from('shopping_cart').select('quantity');
      
      if ('user_id' in filter) {
        query = query.eq('user_id', filter.user_id);
      } else if ('session_id' in filter) {
        query = query.eq('session_id', filter.session_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
    enabled: !cartSessionLoading
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ['coffee-product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch tiers for this product
  const { data: tiers } = useQuery({
    queryKey: ['coffee-product-tiers', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_product_tiers')
        .select('*')
        .eq('product_id', productId)
        .order('min_quantity', { ascending: true });
      
      if (error) throw error;
      return data as CoffeeProductTier[];
    },
    enabled: !!productId,
  });

  // Calculate price based on quantity and tiers
  const getCurrentPrice = () => {
    if (!tiers || tiers.length === 0) {
      return product?.selling_price || 0;
    }
    
    // Find the applicable tier based on quantity
    let applicableTier = null;
    for (const tier of tiers) {
      if (quantity >= tier.min_quantity) {
        applicableTier = tier;
      }
    }
    
    return applicableTier ? applicableTier.price_per_unit : product?.selling_price || 0;
  };

  const currentPrice = getCurrentPrice();
  const totalPrice = currentPrice * quantity;

  const images = (product?.images as string[]) || [];
  const currentImage = images.length > 0 ? images[currentImageIndex] : '/placeholder.svg';

  const goToPrevImage = () => {
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };

  const addToCart = async () => {
    if (!product) return;
    
    const success = await addCoffeeToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      pricePerUnit: currentPrice,
      tierQuantity: quantity, // The quantity selected = tier quantity
    });

    if (success) {
      setQuantity(1); // Reset quantity after adding
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <main className="pt-24 pb-16">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <main className="pt-24 pb-16">
          <div className="container max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Product not found</h1>
            <Button onClick={() => navigate('/joyhousestore')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/joyhousestore')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div 
                className="aspect-square relative overflow-hidden rounded-lg bg-muted/20 cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={currentImage}
                  alt={product.name}
                  className="object-contain w-full h-full"
                />
                
                {/* Coffee badge */}
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="gap-1">
                    <Coffee className="h-3 w-3" />
                    Coffee
                  </Badge>
                </div>

                {/* Navigation arrows */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevImage();
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextImage();
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                {product.description && (
                  <p className="text-muted-foreground">{product.description}</p>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    ${currentPrice.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">each</span>
                </div>
                
              {tiers && tiers.length > 0 && currentPrice < product.selling_price && (
                <p className="text-sm text-primary">
                  Bulk discount applied! (Regular price: ${product.selling_price.toFixed(2)})
                </p>
              )}
            </div>

            {/* Tier pricing info */}
            {tiers && tiers.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm">Volume Pricing</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>1+ items</span>
                    <span>${product.selling_price.toFixed(2)} each</span>
                  </div>
                  {tiers.map((tier) => (
                    <div key={tier.id} className="flex justify-between">
                      <span>{tier.min_quantity}+ items</span>
                      <span className="text-primary font-medium">
                        ${tier.price_per_unit.toFixed(2)} each
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(q => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Add to cart button */}
            <Button
              size="lg"
              className="w-full"
              onClick={addToCart}
              disabled={addingToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>
    </main>

      <Footer />

      {/* Floating cart button */}
      <FloatingCartButton 
        cartCount={cartCount || 0} 
        onClick={() => setCartOpen(true)} 
      />

      {/* Cart sheet */}
      <UnifiedCartSheet open={cartOpen} onOpenChange={setCartOpen} />

      {/* Lightbox */}
      <ImageLightbox
        images={images.length > 0 ? images.map(url => ({ image_url: url })) : [{ image_url: '/placeholder.svg' }]}
        currentIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={goToPrevImage}
        onNext={goToNextImage}
      />
    </div>
  );
};

export default CoffeeProductDetail;
