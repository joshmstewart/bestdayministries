import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { getFullErrorText } from "@/lib/errorUtils";
import { RefreshCw, Package, Check, Eye, ExternalLink, AlertTriangle, Archive, ArchiveRestore, ChevronDown, ImageIcon, Palette, Trash2 } from "lucide-react";
import { PrintifyPreviewDialog } from "./PrintifyPreviewDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProductColorImagesManager } from "./ProductColorImagesManager";
interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  images: { src: string }[];
  variants: {
    id: number;
    title: string;
    price: number;
    is_enabled: boolean;
  }[];
  options?: { name: string; values: string[] }[];
  is_imported: boolean;
  has_changes?: boolean;
  visible: boolean;
  local_product_id?: string;
}

interface DeletedPrintifyProduct {
  id: string;
  local_product_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
}

interface PrintifyResponse {
  success: boolean;
  products: PrintifyProduct[];
  deletedFromPrintify?: DeletedPrintifyProduct[];
  shop?: { id: number; title: string };
  error?: string;
  message?: string;
}

const ARCHIVED_PRODUCTS_KEY = 'printify-archived-products';

// Component for imported products with refresh capability
const ImportedProductCard = ({ 
  product, 
  onRefreshSuccess 
}: { 
  product: PrintifyProduct; 
  onRefreshSuccess: () => void;
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast: toastWithCopy } = useToast();

  const showErrorToast = (context: string, error: any) => {
    const fullText = getFullErrorText(error);
    toastWithCopy({
      title: `Error: ${context}`,
      description: (
        <div className="space-y-2">
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs font-mono">
            {fullText}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(fullText);
              toast.success("Copied to clipboard");
            }}
            className="text-xs underline hover:no-underline"
          >
            Copy full error details
          </button>
        </div>
      ),
      variant: "destructive",
      duration: 100000,
    });
  };

  const handleRefresh = async () => {
    if (!product.local_product_id) {
      showErrorToast("Refresh from Printify", {
        message: "Could not find local product ID",
        details: `Printify product ID: ${product.id}. Please try clicking "Refresh" at the top to reload the product list, then try again.`
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-printify-product', {
        body: { productId: product.local_product_id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(data.message);
      onRefreshSuccess();
    } catch (error) {
      showErrorToast("Refresh from Printify", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckImages = async () => {
    if (!product.local_product_id) {
      showErrorToast("Check Images", {
        message: "Could not find local product ID",
        details: `Printify product ID: ${product.id}. Please try clicking "Refresh" at the top to reload the product list, then try again.`
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-printify-images', {
        body: { productId: product.local_product_id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (data.variantsWithoutImages === 0) {
        toast.success(`All ${data.totalEnabledVariants} variants have images!`);
      } else {
        toast.info(data.message, { duration: 8000 });
      }
    } catch (error) {
      showErrorToast("Check Images", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {product.images[0] && (
        <div className="aspect-square bg-secondary/10 relative">
          <img
            src={product.images[0].src}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Imported
            </Badge>
          </div>
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div>
          <h5 className="font-medium line-clamp-1">{product.title}</h5>
          {(() => {
            // Extract unique colors from variants
            const colors = [...new Set(
              product.variants
                .filter(v => v.is_enabled)
                .map(v => v.title?.split(' / ')[0]?.trim())
                .filter(Boolean)
            )];
            return (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Palette className="h-3 w-3" />
                {colors.length} {colors.length === 1 ? 'color' : 'colors'}
              </p>
            );
          })()}
        </div>
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="w-full"
            disabled={isRefreshing || isGenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh from Printify'}
          </Button>
          <Button 
            onClick={handleCheckImages} 
            variant="secondary" 
            size="sm" 
            className="w-full"
            disabled={isRefreshing || isGenerating}
          >
            <ImageIcon className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Checking...' : 'Check Image Status'}
          </Button>
          {product.local_product_id && (
            <ProductColorImagesManager
              productId={product.local_product_id}
              productName={product.title}
              availableColors={[...new Set(
                product.variants
                  .filter(v => v.is_enabled)
                  .map(v => v.title?.split(' / ')[0]?.trim())
                  .filter(Boolean)
              )] as string[]}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const PrintifyProductImporter = () => {
  const [previewProduct, setPreviewProduct] = useState<PrintifyProduct | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<DeletedPrintifyProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Load archived IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(ARCHIVED_PRODUCTS_KEY);
    if (stored) {
      try {
        setArchivedIds(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse archived products:', e);
      }
    }
  }, []);

  // Save archived IDs to localStorage
  const saveArchivedIds = (ids: Set<string>) => {
    localStorage.setItem(ARCHIVED_PRODUCTS_KEY, JSON.stringify([...ids]));
    setArchivedIds(ids);
  };

  const handleArchive = (productId: string) => {
    const newIds = new Set(archivedIds);
    newIds.add(productId);
    saveArchivedIds(newIds);
    toast.success("Product archived");
  };

  const handleUnarchive = (productId: string) => {
    const newIds = new Set(archivedIds);
    newIds.delete(productId);
    saveArchivedIds(newIds);
    toast.success("Product restored");
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['printify-products'],
    queryFn: async (): Promise<PrintifyResponse> => {
      const { data, error } = await supabase.functions.invoke('fetch-printify-products');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const importMutation = useMutation({
    mutationFn: async ({ 
      product, 
      priceMarkup,
      editedTitle,
      editedDescription 
    }: { 
      product: PrintifyProduct; 
      priceMarkup: number;
      editedTitle: string;
      editedDescription: string;
    }) => {
      // Override title and description with edited values
      const modifiedProduct = {
        ...product,
        title: editedTitle,
        description: editedDescription,
      };
      const { data, error } = await supabase.functions.invoke('import-printify-product', {
        body: { printifyProduct: modifiedProduct, priceMarkup },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setPreviewOpen(false);
      queryClient.invalidateQueries({ queryKey: ['printify-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async ({ product }: { product: PrintifyProduct }) => {
      // Update the existing product in our database
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .eq('printify_product_id', product.id)
        .single();

      if (fetchError || !existingProducts) {
        throw new Error('Could not find existing product to update');
      }

      const enabledVariant = product.variants.find(v => v.is_enabled) || product.variants[0];
      const basePrice = enabledVariant?.price || 0;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: product.title,
          description: product.description,
          price: basePrice,
          images: product.images.map(img => img.src),
          // Also update the baseline Printify values so it moves out of "Needs Update"
          printify_original_title: product.title,
          printify_original_description: product.description,
          printify_original_price: basePrice,
        })
        .eq('id', existingProducts.id);

      if (updateError) throw updateError;
      return { message: `Successfully synced "${product.title}"` };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setPreviewOpen(false);
      queryClient.invalidateQueries({ queryKey: ['printify-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Dismiss updates - keep user's version and update the baseline to match current values
  const dismissMutation = useMutation({
    mutationFn: async ({ product, currentTitle, currentDescription }: { product: PrintifyProduct; currentTitle: string; currentDescription: string }) => {
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, price')
        .eq('printify_product_id', product.id)
        .single();

      if (fetchError || !existingProducts) {
        throw new Error('Could not find existing product');
      }

      // Update baseline to current values (user's version becomes the new baseline)
      const { error: updateError } = await supabase
        .from('products')
        .update({
          printify_original_title: currentTitle,
          printify_original_description: currentDescription,
          printify_original_price: existingProducts.price,
        })
        .eq('id', existingProducts.id);

      if (updateError) throw updateError;
      return { message: `Kept your version of "${currentTitle}"` };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setPreviewOpen(false);
      queryClient.invalidateQueries({ queryKey: ['printify-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handlePreview = (product: PrintifyProduct) => {
    setPreviewProduct(product);
    setPreviewOpen(true);
  };

  const handleImport = (product: PrintifyProduct, priceMarkup: number, editedTitle: string, editedDescription: string) => {
    importMutation.mutate({ product, priceMarkup, editedTitle, editedDescription });
  };

  const handleSync = (product: PrintifyProduct) => {
    syncMutation.mutate({ product });
  };

  const handleDismissUpdates = (product: PrintifyProduct, currentTitle: string, currentDescription: string) => {
    dismissMutation.mutate({ product, currentTitle, currentDescription });
  };

  const handleDeleteLocalProduct = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.local_product_id);

      if (error) throw error;

      toast.success(`Deleted "${productToDelete.name}" from local store`);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['printify-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateLocalProduct = async (product: DeletedPrintifyProduct) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', product.local_product_id);

      if (error) throw error;

      toast.success(`Deactivated "${product.name}"`);
      queryClient.invalidateQueries({ queryKey: ['printify-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error: any) {
      toast.error(`Failed to deactivate: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Printify Products</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const products = data?.products || [];
  const deletedFromPrintify = data?.deletedFromPrintify || [];
  const notImported = products.filter(p => !p.is_imported && !archivedIds.has(p.id));
  const imported = products.filter(p => p.is_imported);
  const needsUpdate = imported.filter(p => p.has_changes);
  const archived = products.filter(p => archivedIds.has(p.id) && !p.is_imported);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Printify Catalog</h3>
          {data?.shop && (
            <p className="text-sm text-muted-foreground">
              Connected to: {data.shop.title}
            </p>
          )}
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {data?.message && products.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{data.message}</p>
            <Button asChild className="mt-4" variant="outline">
              <a href="https://printify.com/app/store/products" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Printify Dashboard
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {needsUpdate.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-amber-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Needs Update ({needsUpdate.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {needsUpdate.map((product) => (
              <Card key={product.id} className="overflow-hidden border-amber-500/50">
                {product.images[0] && (
                  <div className="aspect-square bg-secondary/10 relative">
                    <img
                      src={product.images[0].src}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-amber-500/90 text-white border-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Has Updates
                      </Badge>
                    </div>
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h5 className="font-medium line-clamp-1">{product.title}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || 'No description'}
                    </p>
                  </div>
                  <Button onClick={() => handlePreview(product)} className="w-full" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Review & Sync
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {notImported.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-muted-foreground">
            Available to Import ({notImported.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notImported.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.images[0] && (
                  <div className="aspect-square bg-secondary/10">
                    <img
                      src={product.images[0].src}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h5 className="font-medium line-clamp-1">{product.title}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{product.variants.filter(v => v.is_enabled).length} variants</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handlePreview(product)} variant="outline" className="flex-1" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview & Import
                    </Button>
                    <Button 
                      onClick={() => handleArchive(product.id)} 
                      variant="ghost" 
                      size="sm"
                      title="Archive this product"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {imported.filter(p => !p.has_changes).length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-muted-foreground">
            Already Imported ({imported.filter(p => !p.has_changes).length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imported.filter(p => !p.has_changes).map((product) => (
              <ImportedProductCard 
                key={product.id} 
                product={product} 
                onRefreshSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['printify-products'] });
                  queryClient.invalidateQueries({ queryKey: ['products'] });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archived ({archived.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archived.map((product) => (
                <Card key={product.id} className="overflow-hidden opacity-60">
                  {product.images[0] && (
                    <div className="aspect-square bg-secondary/10">
                      <img
                        src={product.images[0].src}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h5 className="font-medium line-clamp-1">{product.title}</h5>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handlePreview(product)} variant="outline" className="flex-1" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview & Import
                      </Button>
                      <Button 
                        onClick={() => handleUnarchive(product.id)} 
                        variant="ghost" 
                        size="sm"
                        title="Restore this product"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {products.length === 0 && !data?.message && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products found in your Printify catalog.</p>
            <Button asChild className="mt-4" variant="outline">
              <a href="https://printify.com/app/store/products" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Create Products in Printify
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {deletedFromPrintify.length > 0 && (
        <Collapsible open={deletedOpen} onOpenChange={setDeletedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-destructive">
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Deleted from Printify ({deletedFromPrintify.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${deletedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  These products exist in your store but have been deleted from Printify. 
                  You can deactivate them (hide from store) or delete them entirely.
                </p>
                <div className="space-y-2">
                  {deletedFromPrintify.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${product.price.toFixed(2)} • {product.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {product.is_active && (
                          <Button 
                            onClick={() => handleDeactivateLocalProduct(product)} 
                            variant="outline" 
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                        <Button 
                          onClick={() => {
                            setProductToDelete(product);
                            setDeleteDialogOpen(true);
                          }} 
                          variant="destructive" 
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      <PrintifyPreviewDialog
        product={previewProduct}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onImport={handleImport}
        onSync={handleSync}
        onDismissUpdates={handleDismissUpdates}
        isImporting={importMutation.isPending || syncMutation.isPending || dismissMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? 
              This will permanently remove the product from your store. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocalProduct}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
