import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Instagram, Facebook, Store } from "lucide-react";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Vendor {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  social_links: any;
}

const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
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
          className="h-64 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 relative"
          style={vendor.banner_image_url ? {
            backgroundImage: `url(${vendor.banner_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          <div className="container mx-auto px-4 h-full flex items-end pb-8">
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
          <div className="relative -mt-12 mb-8">
            <div className="bg-background rounded-lg shadow-lg p-8 border">
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
