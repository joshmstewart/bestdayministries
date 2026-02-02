import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Trash2, Eye, EyeOff, ExternalLink, AlertCircle, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductForm } from "./ProductForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface ProductListProps {
  vendorId: string;
  refreshTrigger?: number;
  stripeChargesEnabled?: boolean;
  theme?: VendorThemePreset;
}

export interface ProductListRef {
  refresh: () => void;
}

export const ProductList = forwardRef<ProductListRef, ProductListProps>(
  ({ vendorId, refreshTrigger, stripeChargesEnabled = true, theme }, ref) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [vendorId, refreshTrigger]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: loadProducts
  }));

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Product updated",
        description: `Product is now ${!currentStatus ? 'active' : 'inactive'}`
      });

      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "Your product has been removed"
      });

      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p>Loading products...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No products yet. Add your first product to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!stripeChargesEnabled && products.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your products are not visible in the store until you complete Stripe setup. 
            Go to the <strong>Payments</strong> tab to set up payments (no existing Stripe account needed).
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <Card 
          key={product.id} 
          className="overflow-hidden border-2"
          style={theme ? { 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardGlow
          } : undefined}
        >
          <div className="aspect-square relative">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground opacity-50" />
              </div>
            )}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              {product.is_active ? (
                <Badge>Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {(product.inventory_count === 0 || product.inventory_count === null) && (
                <Badge variant="destructive" className="bg-red-600">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
          
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
            {product.vendor_sku && (
              <p className="text-xs text-muted-foreground mb-1">SKU: {product.vendor_sku}</p>
            )}
            <p className="text-muted-foreground text-sm mb-2 line-clamp-2 whitespace-pre-line">
              {product.description}
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold">${product.price}</span>
              <div className="flex items-center gap-1 text-muted-foreground text-sm" title="Total product views">
                <BarChart3 className="h-4 w-4" />
                <span>{product.view_count || 0} views</span>
              </div>
            </div>

            {product.category && (
              <Badge variant="outline" className="mb-4">
                {product.category}
              </Badge>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="icon"
                asChild
                title="Preview in store"
              >
                <Link to={`/store/product/${product.id}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>

              <ProductForm
                vendorId={vendorId}
                product={product}
                onSuccess={loadProducts}
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleProductStatus(product.id, product.is_active)}
                title={product.is_active ? "Deactivate" : "Activate"}
                className={product.is_active ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}
              >
                {product.is_active ? (
                  <Eye className="h-4 w-4 text-green-700" />
                ) : (
                  <EyeOff className="h-4 w-4 text-red-700" />
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this product? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteProduct(product.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
});
