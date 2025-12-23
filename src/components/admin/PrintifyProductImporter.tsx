import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { RefreshCw, Package, Check, Eye, ExternalLink, AlertTriangle, Archive, ArchiveRestore, ChevronDown } from "lucide-react";
import { PrintifyPreviewDialog } from "./PrintifyPreviewDialog";

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
  is_imported: boolean;
  has_changes?: boolean;
  visible: boolean;
}

interface PrintifyResponse {
  success: boolean;
  products: PrintifyProduct[];
  shop?: { id: number; title: string };
  error?: string;
  message?: string;
}

const ARCHIVED_PRODUCTS_KEY = 'printify-archived-products';

export const PrintifyProductImporter = () => {
  const [previewProduct, setPreviewProduct] = useState<PrintifyProduct | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [archivedOpen, setArchivedOpen] = useState(false);
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
              <Card key={product.id} className="overflow-hidden opacity-60">
                {product.images[0] && (
                  <div className="aspect-square bg-secondary/10 relative">
                    <img
                      src={product.images[0].src}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        Imported
                      </Badge>
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <h5 className="font-medium line-clamp-1">{product.title}</h5>
                  <p className="text-sm text-muted-foreground">
                    {product.variants.filter(v => v.is_enabled).length} variants
                  </p>
                </CardContent>
              </Card>
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

      <PrintifyPreviewDialog
        product={previewProduct}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onImport={handleImport}
        onSync={handleSync}
        isImporting={importMutation.isPending || syncMutation.isPending}
      />
    </div>
  );
};
