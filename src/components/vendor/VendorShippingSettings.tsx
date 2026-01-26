import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Truck, DollarSign, MapPin } from "lucide-react";

interface VendorShippingSettingsProps {
  vendorId: string;
  theme?: {
    cardBg: string;
    cardBorder: string;
    cardGlow: string;
    accent: string;
  } | null;
}

type ShippingMode = 'flat' | 'calculated';

interface ShippingData {
  shipping_mode: ShippingMode | null;
  ship_from_zip: string | null;
  ship_from_city: string | null;
  ship_from_state: string | null;
  flat_rate_amount_cents: number | null;
  free_shipping_threshold: number | null;
  disable_free_shipping: boolean;
}

export const VendorShippingSettings = ({ vendorId, theme }: VendorShippingSettingsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [shippingMode, setShippingMode] = useState<ShippingMode | ''>('');
  const [shipFromZip, setShipFromZip] = useState('');
  const [shipFromCity, setShipFromCity] = useState('');
  const [shipFromState, setShipFromState] = useState('');
  const [flatRateAmount, setFlatRateAmount] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [disableFreeShipping, setDisableFreeShipping] = useState(false);
  
  // Store original values for comparison
  const [originalData, setOriginalData] = useState<ShippingData | null>(null);

  useEffect(() => {
    loadShippingSettings();
  }, [vendorId]);

  // Track changes
  useEffect(() => {
    if (!originalData) return;
    
    const currentFlatRateCents = flatRateAmount ? Math.round(parseFloat(flatRateAmount) * 100) : null;
    const currentThreshold = freeShippingThreshold ? parseFloat(freeShippingThreshold) : null;
    
    const changed = 
      (shippingMode || null) !== originalData.shipping_mode ||
      (shipFromZip || null) !== originalData.ship_from_zip ||
      (shipFromCity || null) !== originalData.ship_from_city ||
      (shipFromState || null) !== originalData.ship_from_state ||
      currentFlatRateCents !== originalData.flat_rate_amount_cents ||
      currentThreshold !== originalData.free_shipping_threshold ||
      disableFreeShipping !== originalData.disable_free_shipping;
    
    setHasChanges(changed);
  }, [shippingMode, shipFromZip, shipFromCity, shipFromState, flatRateAmount, freeShippingThreshold, disableFreeShipping, originalData]);

  const loadShippingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('shipping_mode, ship_from_zip, ship_from_city, ship_from_state, flat_rate_amount_cents, free_shipping_threshold, disable_free_shipping')
        .eq('id', vendorId)
        .single();

      if (error) throw error;

      const shippingData: ShippingData = {
        shipping_mode: data.shipping_mode as ShippingMode | null,
        ship_from_zip: data.ship_from_zip,
        ship_from_city: data.ship_from_city,
        ship_from_state: data.ship_from_state,
        flat_rate_amount_cents: data.flat_rate_amount_cents,
        free_shipping_threshold: data.free_shipping_threshold,
        disable_free_shipping: data.disable_free_shipping || false
      };

      setOriginalData(shippingData);
      setShippingMode(shippingData.shipping_mode || '');
      setShipFromZip(shippingData.ship_from_zip || '');
      setShipFromCity(shippingData.ship_from_city || '');
      setShipFromState(shippingData.ship_from_state || '');
      setFlatRateAmount(shippingData.flat_rate_amount_cents ? (shippingData.flat_rate_amount_cents / 100).toFixed(2) : '');
      setFreeShippingThreshold(shippingData.free_shipping_threshold?.toString() || '');
      setDisableFreeShipping(shippingData.disable_free_shipping);
    } catch (error) {
      console.error('Error loading shipping settings:', error);
      toast({
        title: "Error",
        description: "Failed to load shipping settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shippingMode) {
      toast({
        title: "Please select a shipping method",
        description: "Choose either flat rate or calculated shipping",
        variant: "destructive"
      });
      return;
    }

    // Validate calculated shipping requires ship-from location
    if (shippingMode === 'calculated' && !shipFromZip) {
      toast({
        title: "Ship-from ZIP code required",
        description: "Calculated shipping requires your ship-from ZIP code",
        variant: "destructive"
      });
      return;
    }

    // Validate flat rate amount
    if (shippingMode === 'flat' && !flatRateAmount) {
      toast({
        title: "Flat rate amount required",
        description: "Please enter your flat shipping rate",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        shipping_mode: shippingMode,
        ship_from_zip: shipFromZip || null,
        ship_from_city: shipFromCity || null,
        ship_from_state: shipFromState || null,
        flat_rate_amount_cents: flatRateAmount ? Math.round(parseFloat(flatRateAmount) * 100) : null,
        free_shipping_threshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        disable_free_shipping: disableFreeShipping
      };

      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId);

      if (error) throw error;

      // Update original data to reflect saved state
      setOriginalData({
        shipping_mode: shippingMode as ShippingMode,
        ship_from_zip: shipFromZip || null,
        ship_from_city: shipFromCity || null,
        ship_from_state: shipFromState || null,
        flat_rate_amount_cents: flatRateAmount ? Math.round(parseFloat(flatRateAmount) * 100) : null,
        free_shipping_threshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        disable_free_shipping: disableFreeShipping
      });

      setHasChanges(false);

      toast({
        title: "Shipping settings saved",
        description: "Your shipping configuration has been updated"
      });
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      toast({
        title: "Error",
        description: "Failed to save shipping settings",
        variant: "destructive"
      });
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
      {/* Shipping Method Selection */}
      <Card 
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" style={theme ? { color: theme.accent } : undefined} />
            Shipping Method
          </CardTitle>
          <CardDescription>
            Choose how shipping costs are calculated for your products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={shippingMode} 
            onValueChange={(value) => setShippingMode(value as ShippingMode)}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors">
              <RadioGroupItem value="flat" id="flat" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="flat" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Flat Rate Shipping
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Charge a fixed shipping rate for all orders. Simple and predictable for you and your customers.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors">
              <RadioGroupItem value="calculated" id="calculated" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="calculated" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Calculated Shipping (USPS)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time USPS shipping rates based on package weight and customer location. Requires your ship-from address.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Flat Rate Settings */}
      {shippingMode === 'flat' && (
        <Card 
          className="border-2"
          style={theme ? { 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardGlow
          } : undefined}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={theme ? { color: theme.accent } : undefined} />
              Flat Rate Amount
            </CardTitle>
            <CardDescription>
              Set your fixed shipping rate per order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flatRate">Shipping Rate ($)</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="flatRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={flatRateAmount}
                  onChange={(e) => setFlatRateAmount(e.target.value)}
                  placeholder="6.99"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This rate will be charged per order, regardless of quantity
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ship-From Location (for calculated shipping) */}
      {shippingMode === 'calculated' && (
        <Card 
          className="border-2"
          style={theme ? { 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardGlow
          } : undefined}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" style={theme ? { color: theme.accent } : undefined} />
              Ship-From Location
            </CardTitle>
            <CardDescription>
              Your shipping origin address for USPS rate calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="shipFromZip">ZIP Code *</Label>
                <Input
                  id="shipFromZip"
                  type="text"
                  value={shipFromZip}
                  onChange={(e) => setShipFromZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipFromCity">City</Label>
                <Input
                  id="shipFromCity"
                  type="text"
                  value={shipFromCity}
                  onChange={(e) => setShipFromCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipFromState">State</Label>
                <Input
                  id="shipFromState"
                  type="text"
                  value={shipFromState}
                  onChange={(e) => setShipFromState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ZIP code is required. City and state help improve rate accuracy.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Free Shipping Threshold */}
      {shippingMode && (
        <Card 
          className="border-2"
          style={theme ? { 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardGlow
          } : undefined}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" style={theme ? { color: theme.accent } : undefined} />
              Free Shipping Threshold
            </CardTitle>
            <CardDescription>
              Optionally offer free shipping for orders above a certain amount
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1 max-w-xs">
                <Label htmlFor="freeThreshold">Free shipping for orders over ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="freeThreshold"
                    type="number"
                    step="1"
                    min="0"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    placeholder="35"
                    className="pl-7"
                    disabled={disableFreeShipping}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="disableFreeShipping"
                checked={disableFreeShipping}
                onChange={(e) => {
                  setDisableFreeShipping(e.target.checked);
                  if (e.target.checked) setFreeShippingThreshold('');
                }}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="disableFreeShipping" className="text-sm cursor-pointer">
                Never offer free shipping
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty or check the box above if you don't want to offer free shipping
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button - Sticky */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="lg"
            className="shadow-lg"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Shipping Settings
          </Button>
        </div>
      )}
    </div>
  );
};
