import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, Coffee, Eye, EyeOff } from "lucide-react";
import { CoffeeProductForm } from "./CoffeeProductForm";
import ImageLightbox from "@/components/ImageLightbox";
import { CoffeeTiersDialog } from "./CoffeeTiersDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PricingTier {
  id: string;
  product_id: string;
  min_quantity: number;
  price_per_unit: number;
}

interface CoffeeProduct {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number;
  shipstation_sku: string;
  images: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export function CoffeeProductsManager() {
  const [products, setProducts] = useState<CoffeeProduct[]>([]);
  const [productTiers, setProductTiers] = useState<Record<string, PricingTier[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CoffeeProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<CoffeeProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<{ image_url: string; caption?: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [tiersDialogProduct, setTiersDialogProduct] = useState<CoffeeProduct | null>(null);

  const handleImageClick = (product: CoffeeProduct) => {
    if (product.images && product.images.length > 0) {
      setLightboxImages(product.images.map((url, i) => ({ 
        image_url: url, 
        caption: i === 0 ? product.name : `${product.name} - Image ${i + 1}` 
      })));
      setLightboxIndex(0);
      setLightboxOpen(true);
    }
  };

  const fetchProducts = async () => {
    try {
      const [productsRes, tiersRes] = await Promise.all([
        supabase
          .from("coffee_products")
          .select("*")
          .order("display_order", { ascending: true }),
        supabase
          .from("coffee_product_tiers")
          .select("*")
          .order("min_quantity", { ascending: true }),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (tiersRes.error) throw tiersRes.error;

      setProducts(productsRes.data || []);

      // Group tiers by product_id
      const tiersMap: Record<string, PricingTier[]> = {};
      (tiersRes.data || []).forEach((tier) => {
        if (!tiersMap[tier.product_id]) {
          tiersMap[tier.product_id] = [];
        }
        tiersMap[tier.product_id].push(tier);
      });
      setProductTiers(tiersMap);
    } catch (error: any) {
      console.error("Error fetching coffee products:", error);
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: CoffeeProduct) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("coffee_products")
        .delete()
        .eq("id", deleteProduct.id);

      if (error) throw error;
      toast({ title: "Product deleted" });
      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteProduct(null);
    }
  };

  const toggleVisibility = async (product: CoffeeProduct) => {
    try {
      const { error } = await supabase
        .from("coffee_products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;
      
      toast({
        title: product.is_active ? "Product hidden" : "Product visible",
        description: `${product.name} is now ${product.is_active ? "hidden from" : "visible in"} the store.`,
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Error updating product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAllVisibility = async (makeVisible: boolean) => {
    try {
      const { error } = await supabase
        .from("coffee_products")
        .update({ is_active: makeVisible })
        .neq("id", ""); // Update all

      if (error) throw error;
      
      toast({
        title: makeVisible ? "All products visible" : "All products hidden",
        description: `${products.length} products are now ${makeVisible ? "visible in" : "hidden from"} the store.`,
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Error toggling all visibility:", error);
      toast({
        title: "Error updating products",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  if (showForm) {
    return (
      <CoffeeProductForm
        product={editingProduct}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          Coffee Products
        </CardTitle>
        <div className="flex gap-2">
          {products.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Visibility
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleAllVisibility(true)}>
                  <Eye className="h-4 w-4 mr-2 text-green-600" />
                  Show All Products
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleAllVisibility(false)}>
                  <EyeOff className="h-4 w-4 mr-2 text-red-600" />
                  Hide All Products
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coffee className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No coffee products yet.</p>
            <p className="text-sm">Add products once you receive the catalog from your vendor.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Lowest</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const margin = product.selling_price - product.cost_price;
                const marginPercent = product.cost_price > 0 
                  ? ((margin / product.cost_price) * 100).toFixed(0) 
                  : 0;
                
                const tiers = productTiers[product.id] || [];
                const lowestTierPrice = tiers.length > 0 
                  ? Math.min(...tiers.map(t => t.price_per_unit))
                  : null;
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.images && product.images.length > 0 && product.images[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-12 h-12 object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(product)}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Coffee className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm">{product.shipstation_sku}</TableCell>
                    <TableCell className="text-right">${product.cost_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${product.selling_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {lowestTierPrice !== null ? (
                        <button
                          onClick={() => setTiersDialogProduct(product)}
                          className="text-primary hover:underline cursor-pointer font-medium"
                        >
                          ${lowestTierPrice.toFixed(2)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={margin >= 0 ? "text-green-600" : "text-destructive"}>
                        ${margin.toFixed(2)} ({marginPercent}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => toggleVisibility(product)}
                        title={product.is_active ? "Hide from store" : "Show in store"}
                        className={product.is_active 
                          ? "bg-green-100 hover:bg-green-200 border-green-300" 
                          : "bg-red-100 hover:bg-red-200 border-red-300"
                        }
                      >
                        {product.is_active ? (
                          <Eye className="h-4 w-4 text-green-700" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-red-700" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                          title="Edit product"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setDeleteProduct(product)}
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => setLightboxIndex((prev) => 
          prev === 0 ? lightboxImages.length - 1 : prev - 1
        )}
        onNext={() => setLightboxIndex((prev) => 
          prev === lightboxImages.length - 1 ? 0 : prev + 1
        )}
      />

      {tiersDialogProduct && (
        <CoffeeTiersDialog
          open={!!tiersDialogProduct}
          onOpenChange={(open) => !open && setTiersDialogProduct(null)}
          productName={tiersDialogProduct.name}
          costPrice={tiersDialogProduct.cost_price}
          sellingPrice={tiersDialogProduct.selling_price}
          tiers={productTiers[tiersDialogProduct.id] || []}
        />
      )}
    </Card>
  );
}
