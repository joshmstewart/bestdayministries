import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Globe, Instagram, Facebook, Store, Heart, Star, AlertTriangle } from "lucide-react";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { VendorBestieAssetDisplay } from "@/components/vendor/VendorBestieAssetDisplay";
import { VendorStoryGallery } from "@/components/vendor/VendorStoryGallery";
import ImageLightbox from "@/components/ImageLightbox";
import { getVendorTheme, VendorThemePreset } from "@/lib/vendorThemePresets";
import { FloatingCartButton } from "@/components/marketplace/FloatingCartButton";
import { UnifiedCartSheet } from "@/components/marketplace/UnifiedCartSheet";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useQuery } from "@tanstack/react-query";

interface Vendor {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  social_links: any;
  featured_bestie_id: string | null;
  theme_color?: string;
}

interface FeaturedBestie {
  id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_number: number | null;
  bio: string | null;
  role: string;
}

const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [theme, setTheme] = useState<VendorThemePreset>(getVendorTheme('orange'));
  const [featuredBestie, setFeaturedBestie] = useState<FeaturedBestie | null>(null);
  const [bestieAssets, setBestieAssets] = useState<any[]>([]);
  const [storyMedia, setStoryMedia] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Cart state
  const shopifyItems = useShopifyCartStore((state) => state.items);
  const { data: handmadeCart } = useQuery({
    queryKey: ["shopping-cart"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return [];
      const { data } = await supabase
        .from("shopping_cart")
        .select("*")
        .eq("user_id", session.session.user.id);
      return data || [];
    },
  });
  const totalCartCount = (handmadeCart?.length || 0) + shopifyItems.length;

  // Check for preview mode parameters
  const isPreviewMode = searchParams.get('preview') === 'true';
  const previewTheme = searchParams.get('theme');
  const previewBusinessName = searchParams.get('business_name');

  useEffect(() => {
    loadVendorProfile();
  }, [id]);

  const loadVendorProfile = async () => {
    if (!id) return;

    try {
      // Fetch vendor details
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (vendorError) throw vendorError;
      
      if (!vendorData) {
        toast.error("Vendor not found");
        navigate('/joyhousestore');
        return;
      }

      setVendor(vendorData);
      
      // Use preview theme if in preview mode, otherwise use saved theme
      if (isPreviewMode && previewTheme) {
        setTheme(getVendorTheme(previewTheme));
      } else {
        setTheme(getVendorTheme((vendorData as any).theme_color));
      }

      // If vendor has a featured bestie, fetch their details and role
      let featuredBestieData = null;
      if (vendorData.featured_bestie_id) {
        // Get bestie profile
        const { data: bestieProfile } = await supabase
          .from('profiles_public')
          .select('id, display_name, avatar_url, avatar_number, bio')
          .eq('id', vendorData.featured_bestie_id)
          .single();
        
        // Get bestie role from vendor_bestie_requests
        const { data: linkData } = await supabase
          .from('vendor_bestie_requests')
          .select('bestie_role')
          .eq('vendor_id', id)
          .eq('bestie_id', vendorData.featured_bestie_id)
          .eq('status', 'approved')
          .single();
        
        if (bestieProfile) {
          featuredBestieData = {
            ...bestieProfile,
            role: linkData?.bestie_role || 'Creator'
          };
        }
      }
      setFeaturedBestie(featuredBestieData);

      // Fetch approved bestie assets with full details
      const { data: assetsData } = await supabase
        .from("vendor_bestie_assets")
        .select("*")
        .eq("vendor_id", id)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (assetsData) {
        // For each asset, get bestie info and try to find matching featured_bestie data
        const enrichedAssets = await Promise.all(
          assetsData.map(async (asset) => {
            // Get bestie profile info
            const { data: profile } = await supabase
              .from("profiles_public")
              .select("display_name")
              .eq("id", asset.bestie_id)
              .maybeSingle();

            // Try to find the featured bestie entry that matches this asset URL
            const { data: featuredBestie } = await supabase
              .from("featured_besties")
              .select("description, aspect_ratio, bestie_name, voice_note_url")
              .or(`image_url.eq.${asset.asset_url},voice_note_url.eq.${asset.asset_url}`)
              .eq("approval_status", "approved")
              .maybeSingle();

            return {
              id: asset.id,
              bestie_name: featuredBestie?.bestie_name || profile?.display_name || "Bestie",
              description: featuredBestie?.description || asset.asset_title || "",
              asset_type: asset.asset_type,
              asset_url: asset.asset_url,
              aspect_ratio: featuredBestie?.aspect_ratio || "9:16"
            };
          })
        );
        
        setBestieAssets(enrichedAssets);
      }

      // Fetch vendor story media
      const { data: storyData } = await supabase
        .from("vendor_story_media")
        .select("*")
        .eq("vendor_id", id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      setStoryMedia(storyData || []);

      // Fetch vendor's active products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading vendor profile:', error);
      toast.error("Failed to load vendor profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1">
          <div className="h-64 bg-muted animate-pulse" />
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96 mb-8" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-muted-foreground mb-4">Vendor not found</p>
            <Button onClick={() => navigate('/joyhousestore')}>
              Back to Store
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-14" style={{ backgroundColor: theme.sectionBg }}>
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div 
            className="sticky top-14 z-40 py-2 px-4 flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: theme.banner,
              color: theme.bannerText 
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Preview Mode - Changes not saved yet</span>
          </div>
        )}
        
        {/* Banner Section */}
        <div
          className="h-32 relative"
          style={vendor.banner_image_url ? {
            backgroundImage: `url(${vendor.banner_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {
            background: `linear-gradient(135deg, ${theme.banner} 0%, ${theme.accent} 100%)`
          }}
        >
          <div className="container mx-auto px-4 h-full flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/joyhousestore')}
              className="bg-background/80 backdrop-blur-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </div>
        </div>

        {/* Vendor Info Section */}
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative -mt-8 mb-6">
            <div 
              className="rounded-lg p-6 border-2"
              style={{ 
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                boxShadow: theme.cardGlow
              }}
            >
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {vendor.logo_url ? (
                    <img 
                      src={vendor.logo_url} 
                      alt={vendor.business_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setLightboxImage(vendor.logo_url);
                        setLightboxOpen(true);
                      }}
                    />
                  ) : (
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-background shadow-md"
                      style={{ backgroundColor: `${theme.accent}20` }}
                    >
                      <Store className="w-12 h-12" style={{ color: theme.accent }} />
                    </div>
                  )}
                </div>

                {/* Vendor Details */}
                <div className="flex-1">
                  {/* Use preview business name if in preview mode */}
                  <h1 className="font-heading text-4xl font-bold mb-2">
                    {isPreviewMode && previewBusinessName ? previewBusinessName : vendor.business_name}
                  </h1>
                  {vendor.description && (
                    <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                      {vendor.description}
                    </p>
                  )}

                  {/* Social Links */}
                  {vendor.social_links && (
                    <div className="flex gap-3">
                      {vendor.social_links.website && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={vendor.social_links.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Globe className="mr-2 h-4 w-4" />
                            Website
                          </a>
                        </Button>
                      )}
                      {vendor.social_links.instagram && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={vendor.social_links.instagram} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Instagram className="mr-2 h-4 w-4" />
                            Instagram
                          </a>
                        </Button>
                      )}
                      {vendor.social_links.facebook && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={vendor.social_links.facebook} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Facebook className="mr-2 h-4 w-4" />
                            Facebook
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bestie Assets Gallery */}
          <VendorBestieAssetDisplay assets={bestieAssets} />

          {/* Story Media Gallery */}
          <VendorStoryGallery media={storyMedia} vendorName={vendor.business_name} theme={theme} />

          {/* Featured Bestie Section */}
          {featuredBestie && (
            <div className="pb-8">
              <Card 
                className="border-2"
                style={{ borderColor: `${theme.accent}40`, backgroundColor: theme.cardBg }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center text-3xl overflow-hidden"
                        style={{ 
                          background: `linear-gradient(135deg, ${theme.accent}30 0%, ${theme.cardBorder} 100%)` 
                        }}
                      >
                        {featuredBestie.avatar_url ? (
                          <img 
                            src={featuredBestie.avatar_url} 
                            alt={featuredBestie.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{featuredBestie.display_name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <Heart 
                        className="absolute -top-1 -right-1 h-6 w-6 fill-current" 
                        style={{ color: theme.accent }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading text-xl font-bold">
                          {featuredBestie.display_name}
                        </h3>
                      </div>
                      {featuredBestie.bio && (
                        <p className="text-muted-foreground text-sm mb-2">
                          {featuredBestie.bio}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground font-medium">
                        {featuredBestie.role === 'Maker' 
                          ? `${featuredBestie.display_name} handcrafts each item in this store with care` 
                          : `${vendor.business_name} is proud to support ${featuredBestie.display_name} through this store`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

            {/* Products Section */}
            <div className="pb-12">
              <h2 className="font-heading text-2xl font-bold mb-6">
                Products from {vendor.business_name}
              </h2>
            
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} theme={theme} />
                ))}
              </div>
            ) : (
              <div 
                className="text-center py-12 rounded-lg"
                style={{ backgroundColor: theme.sectionBg }}
              >
                <p className="text-muted-foreground">
                  This vendor hasn't listed any products yet
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>

      <FloatingCartButton cartCount={totalCartCount} onClick={() => setCartOpen(true)} />
      <UnifiedCartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <Footer />

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => {
            setLightboxOpen(false);
            setLightboxImage(null);
          }}
          images={[{ image_url: lightboxImage, caption: vendor?.business_name }]}
          currentIndex={0}
          onPrevious={() => {}}
          onNext={() => {}}
        />
      )}
    </div>
  );
};

export default VendorProfile;
