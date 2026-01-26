import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";

interface ShippingAddress {
  zip: string;
  city?: string;
  state?: string;
  country?: string;
}

interface ShippingAddressInputProps {
  onAddressSubmit: (address: ShippingAddress) => void;
  isLoading: boolean;
  initialAddress?: ShippingAddress | null;
}

export const ShippingAddressInput = ({ 
  onAddressSubmit, 
  isLoading,
  initialAddress 
}: ShippingAddressInputProps) => {
  const [zip, setZip] = useState(initialAddress?.zip || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [state, setState] = useState(initialAddress?.state || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length >= 5) {
      onAddressSubmit({ zip, city, state, country: "US" });
    }
  };

  const isValidZip = zip.length >= 5 && /^\d{5}(-\d{4})?$/.test(zip);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <MapPin className="h-4 w-4" />
        <span>Enter shipping address for accurate rates</span>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shipping-zip" className="text-xs">
            ZIP Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="shipping-zip"
            type="text"
            placeholder="12345"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/[^\d-]/g, '').slice(0, 10))}
            className="h-9"
            maxLength={10}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="shipping-city" className="text-xs">City (optional)</Label>
            <Input
              id="shipping-city"
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shipping-state" className="text-xs">State (optional)</Label>
            <Input
              id="shipping-state"
              type="text"
              placeholder="CA"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              className="h-9"
              maxLength={2}
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        size="sm" 
        className="w-full"
        disabled={!isValidZip || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Calculating...
          </>
        ) : (
          "Calculate Shipping"
        )}
      </Button>
    </form>
  );
};
