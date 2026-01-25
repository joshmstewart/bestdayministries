import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, TrendingUp } from "lucide-react";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface VendorEarningsProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

export const VendorEarnings = ({ vendorId, theme }: VendorEarningsProps) => {
  const { data: earnings, isLoading } = useQuery({
    queryKey: ["vendor-earnings", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_earnings")
        .select("*")
        .eq("vendor_id", vendorId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card 
            key={i}
            className="border-2"
            style={theme ? { 
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              boxShadow: theme.cardGlow
            } : undefined}
          >
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" style={theme ? { color: theme.accent } : undefined} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>
            {formatCurrency(Number(earnings?.total_earnings || 0))}
          </div>
          <p className="text-xs text-muted-foreground">
            From {earnings?.total_orders || 0} completed orders
          </p>
        </CardContent>
      </Card>

      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" style={theme ? { color: theme.accent } : undefined} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>
            {formatCurrency(Number(earnings?.total_sales || 0))}
          </div>
          <p className="text-xs text-muted-foreground">
            Gross revenue before fees
          </p>
        </CardContent>
      </Card>

      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
          <Package className="h-4 w-4 text-primary" style={theme ? { color: theme.accent } : undefined} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>
            {formatCurrency(Number(earnings?.total_fees || 0))}
          </div>
          <p className="text-xs text-muted-foreground">
            Commission on sales
          </p>
        </CardContent>
      </Card>
    </div>
  );
};