import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, Package, Check, Plus, DollarSign, ExternalLink } from "lucide-react";

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
  visible: boolean;
}

interface PrintifyResponse {
  success: boolean;
  products: PrintifyProduct[];
  shop?: { id: number; title: string };
  error?: string;
  message?: string;
}

export const PrintifyProductImporter = () => {
  const [priceMarkups, setPriceMarkups] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['printify-products'],
    queryFn: async (): Promise<PrintifyResponse> => {
      const { data, error } = await supabase.functions.invoke('fetch-printify-products');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const importMutation = useMutation({
    mutationFn: async ({ product, priceMarkup }: { product: PrintifyProduct; priceMarkup: number }) => {
      const { data, error } = await supabase.functions.invoke('import-printify-product', {
        body: { printifyProduct: product, priceMarkup },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['printify-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleImport = (product: PrintifyProduct) => {
    const priceMarkup = priceMarkups[product.id] || 0;
    importMutation.mutate({ product, priceMarkup });
  };

  const getBasePrice = (product: PrintifyProduct): number => {
    const enabledVariant = product.variants.find(v => v.is_enabled) || product.variants[0];
    return enabledVariant?.price || 0;
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
  const notImported = products.filter(p => !p.is_imported);
  const imported = products.filter(p => p.is_imported);

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

      {notImported.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-muted-foreground">
            Available to Import ({notImported.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notImported.map((product) => {
              const basePrice = getBasePrice(product);
              const markup = priceMarkups[product.id] || 0;
              const finalPrice = basePrice + markup;

              return (
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
                      <span className="text-muted-foreground">Base: ${basePrice.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`markup-${product.id}`} className="text-xs">
                        Price Markup
                      </Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`markup-${product.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={markup}
                          onChange={(e) => setPriceMarkups(prev => ({
                            ...prev,
                            [product.id]: parseFloat(e.target.value) || 0
                          }))}
                          className="h-8"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Final price: <span className="font-medium">${finalPrice.toFixed(2)}</span>
                      </p>
                    </div>

                    <Button
                      onClick={() => handleImport(product)}
                      disabled={importMutation.isPending}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Import to Store
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {imported.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-muted-foreground">
            Already Imported ({imported.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imported.map((product) => (
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
    </div>
  );
};
