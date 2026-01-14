import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, DollarSign, Coins } from "lucide-react";
import { CURRENCY_IMAGES } from "@/lib/currencyImages";

interface CurrencyImage {
  id: string;
  denomination: string;
  denomination_type: string;
  image_url: string;
  display_name: string;
  display_order: number;
  is_active: boolean;
}

export function CurrencyImagesManager() {
  const [currencyImages, setCurrencyImages] = useState<CurrencyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    loadCurrencyImages();
  }, []);

  const loadCurrencyImages = async () => {
    try {
      const { data, error } = await supabase
        .from("currency_images")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setCurrencyImages(data || []);
    } catch (error) {
      console.error("Error loading currency images:", error);
      toast.error("Failed to load currency images");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (denomination: string, file: File) => {
    setUploading(denomination);
    
    try {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${denomination}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("currency-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("currency-images")
        .getPublicUrl(fileName);

      // Update database record
      const { error: updateError } = await supabase
        .from("currency_images")
        .update({ image_url: publicUrl })
        .eq("denomination", denomination);

      if (updateError) throw updateError;

      toast.success("Image uploaded successfully");
      loadCurrencyImages();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (denomination: string) => {
    try {
      const { error } = await supabase
        .from("currency_images")
        .update({ image_url: "" })
        .eq("denomination", denomination);

      if (error) throw error;

      toast.success("Image removed - will use default");
      loadCurrencyImages();
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    }
  };

  const getDefaultImage = (denomination: string): string | undefined => {
    return CURRENCY_IMAGES[denomination];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const bills = currencyImages.filter(c => c.denomination_type === "bill");
  const coins = currencyImages.filter(c => c.denomination_type === "coin");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Currency Images</h3>
        <p className="text-sm text-muted-foreground">
          Upload custom images for bills and coins used in the Cash Register game.
          If no custom image is set, the default will be used.
        </p>
      </div>

      {/* Bills Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {bills.map((currency) => (
              <CurrencyImageCard
                key={currency.id}
                currency={currency}
                defaultImage={getDefaultImage(currency.denomination)}
                uploading={uploading === currency.denomination}
                onUpload={(file) => handleImageUpload(currency.denomination, file)}
                onRemove={() => handleRemoveImage(currency.denomination)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coins Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5" />
            Coins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {coins.map((currency) => (
              <CurrencyImageCard
                key={currency.id}
                currency={currency}
                defaultImage={getDefaultImage(currency.denomination)}
                uploading={uploading === currency.denomination}
                onUpload={(file) => handleImageUpload(currency.denomination, file)}
                onRemove={() => handleRemoveImage(currency.denomination)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CurrencyImageCardProps {
  currency: CurrencyImage;
  defaultImage?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

function CurrencyImageCard({
  currency,
  defaultImage,
  uploading,
  onUpload,
  onRemove,
}: CurrencyImageCardProps) {
  const displayImage = currency.image_url || defaultImage;
  const isCustom = !!currency.image_url;
  const isBill = currency.denomination_type === "bill";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center p-3 border rounded-lg bg-card">
      <Label className="text-xs font-medium mb-2">{currency.display_name}</Label>
      
      <div className={`relative mb-2 flex items-center justify-center ${isBill ? "h-16" : "h-14"}`}>
        {displayImage ? (
          <img
            src={displayImage}
            alt={currency.display_name}
            className={`object-contain ${isBill ? "max-h-16 max-w-24" : "max-h-14 max-w-14 rounded-full"}`}
          />
        ) : (
          <div className={`bg-muted flex items-center justify-center text-muted-foreground ${isBill ? "w-24 h-12" : "w-12 h-12 rounded-full"}`}>
            {isBill ? <DollarSign className="h-6 w-6" /> : <Coins className="h-5 w-5" />}
          </div>
        )}
        {isCustom && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1 rounded">
            Custom
          </span>
        )}
      </div>

      <div className="flex gap-1 w-full">
        <Label className="flex-1">
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </>
              )}
            </span>
          </Button>
        </Label>
        
        {isCustom && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2"
            onClick={onRemove}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
