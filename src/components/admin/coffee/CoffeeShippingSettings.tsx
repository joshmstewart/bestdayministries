import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Truck, DollarSign, MapPin, Coffee } from "lucide-react";

type ShippingMode = 'flat' | 'calculated';

interface CoffeeShippingData {
  shipping_mode: ShippingMode | null;
  ship_from_zip: string;
  ship_from_city: string;
  ship_from_state: string;
  flat_rate_amount: number | null;
  free_shipping_threshold: number | null;
  disable_free_shipping: boolean;
}

const DEFAULT_SHIPPING_DATA: CoffeeShippingData = {
  shipping_mode: null,
  ship_from_zip: '',
  ship_from_city: '',
  ship_from_state: '',
  flat_rate_amount: null,
  free_shipping_threshold: null,
  disable_free_shipping: false,
};

export const CoffeeShippingSettings = () => {
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
  
  const [originalData, setOriginalData] = useState<CoffeeShippingData | null>(null);

  useEffect(() => {
    loadShippingSettings();
  }, []);

  useEffect(() => {
    if (!originalData) return;
    
    const currentFlatRate = flatRateAmount ? parseFloat(flatRateAmount) : null;
    const currentThreshold = freeShippingThreshold ? parseFloat(freeShippingThreshold) : null;
    
    const changed = 
      (shippingMode || null) !== originalData.shipping_mode ||
      shipFromZip !== originalData.ship_from_zip ||
      shipFromCity !== originalData.ship_from_city ||
      shipFromState !== originalData.ship_from_state ||
      currentFlatRate !== originalData.flat_rate_amount ||
      currentThreshold !== originalData.free_shipping_threshold ||
      disableFreeShipping !== originalData.disable_free_shipping;
    
    setHasChanges(changed);
  }, [shippingMode, shipFromZip, shipFromCity, shipFromState, flatRateAmount, freeShippingThreshold, disableFreeShipping, originalData]);

  const loadShippingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'coffee_shipping_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const rawSettings = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value) 
          : data.setting_value;
        
        const settings: CoffeeShippingData = {
          shipping_mode: rawSettings.shipping_mode || null,
          ship_from_zip: rawSettings.ship_from_zip || '',
          ship_from_city: rawSettings.ship_from_city || '',
          ship_from_state: rawSettings.ship_from_state || '',
          flat_rate_amount: rawSettings.flat_rate_amount || null,
          free_shipping_threshold: rawSettings.free_shipping_threshold || null,
          disable_free_shipping: rawSettings.disable_free_shipping || false,
        };
        
        setOriginalData(settings);
        setShippingMode(settings.shipping_mode || '');
        setShipFromZip(settings.ship_from_zip || '');
        setShipFromCity(settings.ship_from_city || '');
        setShipFromState(settings.ship_from_state || '');
        setFlatRateAmount(settings.flat_rate_amount?.toString() || '');
        setFreeShippingThreshold(settings.free_shipping_threshold?.toString() || '');
        setDisableFreeShipping(settings.disable_free_shipping || false);
      } else {
        setOriginalData(DEFAULT_SHIPPING_DATA);
      }
    } catch (error) {
      console.error('Error loading coffee shipping settings:', error);
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

    if (shippingMode === 'calculated' && !shipFromZip) {
      toast({
        title: "Ship-from ZIP code required",
        description: "Calculated shipping requires your ship-from ZIP code",
        variant: "destructive"
      });
      return;
    }

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
      const shippingData: CoffeeShippingData = {
        shipping_mode: shippingMode as ShippingMode,
        ship_from_zip: shipFromZip,
        ship_from_city: shipFromCity,
        ship_from_state: shipFromState,
        flat_rate_amount: flatRateAmount ? parseFloat(flatRateAmount) : null,
        free_shipping_threshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        disable_free_shipping: disableFreeShipping
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

      toast({
        title: "Shipping settings saved",
        description: "Coffee shipping configuration has been updated"
      });
    } catch (error) {
      console.error('Error saving coffee shipping settings:', error);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Coffee Shipping Configuration
          </CardTitle>
          <CardDescription>
            Configure shipping rules for coffee products. Coffee ships from a separate location than other marketplace products.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Shipping Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Method
          </CardTitle>
          <CardDescription>
            Choose how shipping costs are calculated for coffee products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={shippingMode} 
            onValueChange={(value) => setShippingMode(value as ShippingMode)}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors">
              <RadioGroupItem value="flat" id="coffee-flat" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="coffee-flat" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Flat Rate Shipping
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Charge a fixed shipping rate for all coffee orders. Simple and predictable.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors">
              <RadioGroupItem value="calculated" id="coffee-calculated" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="coffee-calculated" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Calculated Shipping (USPS)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time USPS shipping rates based on package weight and customer location.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Flat Rate Settings */}
      {shippingMode === 'flat' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Flat Rate Amount
            </CardTitle>
            <CardDescription>
              Set your fixed shipping rate per coffee order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coffeeFlatRate">Shipping Rate ($)</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="coffeeFlatRate"
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
                This rate will be charged per coffee order, regardless of quantity
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ship-From Location */}
      {shippingMode === 'calculated' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ship-From Location
            </CardTitle>
            <CardDescription>
              The coffee vendor's shipping origin address for USPS rate calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="coffeeShipFromZip">ZIP Code *</Label>
                <Input
                  id="coffeeShipFromZip"
                  type="text"
                  value={shipFromZip}
                  onChange={(e) => setShipFromZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coffeeShipFromCity">City</Label>
                <Input
                  id="coffeeShipFromCity"
                  type="text"
                  value={shipFromCity}
                  onChange={(e) => setShipFromCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coffeeShipFromState">State</Label>
                <Input
                  id="coffeeShipFromState"
                  type="text"
                  value={shipFromState}
                  onChange={(e) => setShipFromState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="CO"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Free Shipping Threshold
            </CardTitle>
            <CardDescription>
              Optionally offer free shipping for coffee orders above a certain amount
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
              Leave empty or check the box above if you don't want to offer free shipping on coffee orders
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
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
