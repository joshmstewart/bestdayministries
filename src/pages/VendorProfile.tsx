import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Globe, Instagram, Facebook, Store, Heart, Star } from "lucide-react";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AudioPlayer from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";

interface Vendor {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  social_links: any;
  featured_bestie_id: string | null;
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
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [featuredBestie, setFeaturedBestie] = useState<FeaturedBestie | null>(null);
  const [bestieAssets, setBestieAssets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        navigate('/marketplace');
        return;
      }

      setVendor(vendorData);

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

      // Fetch approved bestie assets
      const { data: assetsData } = await supabase
        .from("vendor_bestie_assets")
        .select("*")
        .eq("vendor_id", id)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (assetsData) {
        setBestieAssets(assetsData);
      }

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
            <Button onClick={() => navigate('/marketplace')}>
              Back to Marketplace
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
      
      <main className="flex-1">
        {/* Banner Section */}
        <div 
          className="h-32 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 relative"
          style={vendor.banner_image_url ? {
            backgroundImage: `url(${vendor.banner_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          <div className="container mx-auto px-4 h-full flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/marketplace')}
              className="bg-background/80 backdrop-blur-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marketplace
            </Button>
          </div>
        </div>

        {/* Vendor Info Section */}
        <div className="container mx-auto px-4">
          <div className="relative -mt-8 mb-6">
            <div className="bg-background rounded-lg shadow-lg p-6 border">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {vendor.logo_url ? (
                    <img 
                      src={vendor.logo_url} 
                      alt={vendor.business_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md">
                      <Store className="w-12 h-12 text-primary" />
                    </div>
                  )}
                </div>

                {/* Vendor Details */}
                <div className="flex-1">
                  <h1 className="font-heading text-4xl font-bold mb-2">
                    {vendor.business_name}
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
          {bestieAssets.length > 0 && (
            <div className="pb-8 space-y-6">
              <h2 className="font-heading text-2xl font-bold">Featured Content</h2>
              {bestieAssets.map((asset) => (
                <Card key={asset.id} className="border-2 border-primary/20 shadow-warm overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-6 p-6">
                    {/* Asset Display Section */}
                    <div className="relative overflow-hidden rounded-lg">
                      {asset.asset_type === 'image' && asset.asset_url && (
                        <AspectRatio ratio={(() => {
                          const ratio = asset.aspect_ratio || '9:16';
                          const [w, h] = ratio.split(':').map(Number);
                          return w / h;
                        })()}>
                          <img
                            src={asset.asset_url}
                            alt={asset.bestie_name || 'Bestie content'}
                            className="object-cover w-full h-full"
                          />
                        </AspectRatio>
                      )}
                      {asset.asset_type === 'video' && asset.asset_url && (
                        <VideoPlayer
                          src={asset.asset_url}
                          poster={asset.asset_url}
                          className="rounded-lg"
                        />
                      )}
                      {asset.asset_type === 'voice_note' && asset.asset_url && (
                        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-lg p-6">
                          <AudioPlayer src={asset.asset_url} />
                        </div>
                      )}
                      {asset.bestie_name && (
                        <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm">
                          <Heart className="w-4 h-4 fill-current" />
                          Featured Bestie
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-center space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-3xl font-black text-foreground flex-1">
                          {asset.bestie_name}
                        </h3>
                        {asset.description && (
                          <TextToSpeech text={`${asset.bestie_name}. ${asset.description}`} />
                        )}
                      </div>
                      {asset.description && (
                        <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {asset.description}
                        </p>
                      )}
                      {asset.asset_type === 'voice_note' && asset.asset_url && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Listen to their voice note:</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Featured Bestie Section */}
          {featuredBestie && (
            <div className="pb-8">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl overflow-hidden">
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
                      <Heart className="absolute -top-1 -right-1 h-6 w-6 text-primary fill-current" />
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
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">
                  This vendor hasn't listed any products yet
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VendorProfile;
