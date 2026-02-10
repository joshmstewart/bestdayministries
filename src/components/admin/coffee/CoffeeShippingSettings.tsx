import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Truck, DollarSign, MapPin, Coffee, Box, Scale, Info } from "lucide-react";

interface CoffeeShippingData {
  shipping_mode: 'flat' | 'calculated' | null;
  ship_from_zip: string;
  ship_from_city: string;
  ship_from_state: string;
  flat_rate_amount: number | null;
  free_shipping_threshold: number | null;
  disable_free_shipping: boolean;
}

const BOX_CONFIGS = [
  { bags: '1–3', size: '6×6×7"', boxWeight: '3.5 oz', useCase: 'Small orders' },
  { bags: '4–6', size: '10×8×6"', boxWeight: '7.0 oz', useCase: 'Medium orders' },
  { bags: '7–9', size: '12×10×6"', boxWeight: '10.0 oz', useCase: 'Large orders' },
  { bags: '10+', size: '16×12×10"', boxWeight: '14.0 oz', useCase: 'Bulk orders' },
];

export const CoffeeShippingSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [disableFreeShipping, setDisableFreeShipping] = useState(false);
  const [originalData, setOriginalData] = useState<CoffeeShippingData | null>(null);

  useEffect(() => { loadShippingSettings(); }, []);

  useEffect(() => {
    if (!originalData) return;
    const currentThreshold = freeShippingThreshold ? parseFloat(freeShippingThreshold) : null;
    const changed =
      currentThreshold !== originalData.free_shipping_threshold ||
      disableFreeShipping !== originalData.disable_free_shipping;
    setHasChanges(changed);
  }, [freeShippingThreshold, disableFreeShipping, originalData]);

  const loadShippingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'coffee_shipping_settings')
        .maybeSingle();
      if (error) throw error;
      if (data?.setting_value) {
        const raw = typeof data.setting_value === 'string' ? JSON.parse(data.setting_value) : data.setting_value;
        const settings: CoffeeShippingData = {
          shipping_mode: raw.shipping_mode || 'calculated',
          ship_from_zip: raw.ship_from_zip || '28036',
          ship_from_city: raw.ship_from_city || 'Davidson',
          ship_from_state: raw.ship_from_state || 'NC',
          flat_rate_amount: raw.flat_rate_amount || null,
          free_shipping_threshold: raw.free_shipping_threshold ?? null,
          disable_free_shipping: raw.disable_free_shipping || false,
        };
        setOriginalData(settings);
        setFreeShippingThreshold(settings.free_shipping_threshold?.toString() || '');
        setDisableFreeShipping(settings.disable_free_shipping);
      } else {
        setOriginalData({
          shipping_mode: 'calculated',
          ship_from_zip: '28036',
          ship_from_city: 'Davidson',
          ship_from_state: 'NC',
          flat_rate_amount: null,
          free_shipping_threshold: null,
          disable_free_shipping: false,
        });
      }
    } catch (error) {
      console.error('Error loading coffee shipping settings:', error);
      toast({ title: "Error", description: "Failed to load shipping settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const shippingData: CoffeeShippingData = {
        shipping_mode: 'calculated',
        ship_from_zip: '28036',
        ship_from_city: 'Davidson',
        ship_from_state: 'NC',
        flat_rate_amount: null,
        free_shipping_threshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        disable_free_shipping: disableFreeShipping,
      };
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'coffee_shipping_settings',
          setting_value: shippingData as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString()
        } as never, { onConflict: 'setting_key' });
      if (error) throw error;
      setOriginalData(shippingData);
      setHasChanges(false);
      toast({ title: "Settings saved", description: "Coffee shipping configuration updated" });
    } catch (error) {
      console.error('Error saving coffee shipping settings:', error);
      toast({ title: "Error", description: "Failed to save shipping settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Coffee Shipping Overview
          </CardTitle>
          <CardDescription>
            Coffee orders use real-time ShipStation rate calculation with automatic carrier selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              How It Works
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-6 list-disc">
              <li>Shipping rates are calculated in real-time via ShipStation when a customer enters their ZIP code.</li>
              <li>The carrier is selected automatically based on the number of bags in the cart.</li>
              <li>The cheapest available service from the selected carrier is used.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Carrier Selection Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Automatic Carrier Selection
          </CardTitle>
          <CardDescription>
            The carrier is chosen based on order size — customers see "via USPS" or "via UPS" in their cart.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">1 bag</span>
                <Badge variant="secondary" className="text-xs">USPS</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Single 12 oz bag — small, light package. USPS offers the best rates.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">2+ bags</span>
                <Badge variant="secondary" className="text-xs">UPS</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Multiple bags — heavier packages. UPS offers better rates for the weight.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Box Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Box Configurations
          </CardTitle>
          <CardDescription>
            Each 12 oz bag weighs 12 oz. Total weight = (bags × 12 oz) + box weight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Bags</th>
                  <th className="pb-2 font-medium text-muted-foreground">Box Size</th>
                  <th className="pb-2 font-medium text-muted-foreground">Box Weight</th>
                  <th className="pb-2 font-medium text-muted-foreground">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {BOX_CONFIGS.map((cfg) => (
                  <tr key={cfg.bags}>
                    <td className="py-2 font-medium">{cfg.bags}</td>
                    <td className="py-2 font-mono text-xs">{cfg.size}</td>
                    <td className="py-2">{cfg.boxWeight}</td>
                    <td className="py-2 text-muted-foreground">{cfg.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ship-From Origin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ship-From Origin
          </CardTitle>
          <CardDescription>
            All coffee orders ship from this fixed location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">Davidson, NC 28036</p>
              <p className="text-xs text-muted-foreground">Processing: Same day or next business day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Shipping Threshold — editable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Free Shipping Threshold
          </CardTitle>
          <CardDescription>
            Optionally waive shipping for coffee orders above a certain subtotal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="coffeeFreeThreshold">Free shipping for orders over ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="coffeeFreeThreshold"
                  type="number"
                  step="1"
                  min="0"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  placeholder="50"
                  className="pl-7"
                  disabled={disableFreeShipping}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coffeeDisableFreeShipping"
              checked={disableFreeShipping}
              onChange={(e) => {
                setDisableFreeShipping(e.target.checked);
                if (e.target.checked) setFreeShippingThreshold('');
              }}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="coffeeDisableFreeShipping" className="text-sm cursor-pointer">
              Never offer free shipping for coffee
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty or check the box above if you don't want to offer free shipping on coffee orders.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Shipping Settings
          </Button>
        </div>
      )}
    </div>
  );
};
