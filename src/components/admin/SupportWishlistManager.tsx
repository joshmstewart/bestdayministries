import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingBag, Gift } from "lucide-react";

export const SupportWishlistManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amazonUrl, setAmazonUrl] = useState("");
  const [walmartUrl, setWalmartUrl] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "support_wishlist_urls")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const settings = data.setting_value as any;
        setAmazonUrl(settings.amazon_wishlist_url || "");
        setWalmartUrl(settings.walmart_wishlist_url || "");
      }
    } catch (error) {
      console.error("Error loading wishlist settings:", error);
      toast.error("Failed to load wishlist settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "support_wishlist_urls",
          setting_value: {
            amazon_wishlist_url: amazonUrl,
            walmart_wishlist_url: walmartUrl,
          },
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast.success("Wishlist URLs saved successfully");
    } catch (error) {
      console.error("Error saving wishlist settings:", error);
      toast.error("Failed to save wishlist settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support Page Wishlist URLs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amazon-url" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Amazon Wishlist URL
            </Label>
            <Input
              id="amazon-url"
              type="url"
              placeholder="https://www.amazon.com/hz/wishlist/ls/..."
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter the full URL to your Amazon wishlist. Leave blank to hide.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walmart-url" className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Walmart Registry URL
            </Label>
            <Input
              id="walmart-url"
              type="url"
              placeholder="https://www.walmart.com/lists/..."
              value={walmartUrl}
              onChange={(e) => setWalmartUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter the full URL to your Walmart registry. Leave blank to hide.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Wishlist URLs
        </Button>
      </CardContent>
    </Card>
  );
};
