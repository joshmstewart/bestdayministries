import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X, Eye, ExternalLink, Store } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { VendorStoryMediaManager } from "@/components/vendor/VendorStoryMediaManager";
import { VendorThemeColorPicker } from "@/components/vendor/VendorThemeColorPicker";
import { Link } from "react-router-dom";

// Joy House Official Store vendor ID
const HOUSE_VENDOR_ID = "0122c66e-c765-4a03-9a86-f34e90a29a60";

// Processing time options
const PROCESSING_TIME_OPTIONS = [
  { value: "1", label: "1-2 business days" },
  { value: "3", label: "3-5 business days" },
  { value: "7", label: "5-7 business days" },
  { value: "14", label: "1-2 weeks" },
  { value: "21", label: "2-3 weeks (custom orders)" },
];

export const HouseVendorSettings = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    logo_url: '',
    banner_image_url: '',
    website: '',
    instagram: '',
    facebook: '',
    free_shipping_threshold: 35,
    estimated_processing_days: 3,
    contact_email: '',
    disable_free_shipping: false,
    theme_color: 'orange',
  });

  useEffect(() => {
    loadVendorData();
  }, []);

  const loadVendorData = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', HOUSE_VENDOR_ID)
        .single();

      if (error) throw error;

      if (data) {
        const socialLinks = data.social_links as any;
        const themeColor = (data as any).theme_color || 'orange';
        setFormData({
          business_name: data.business_name || '',
          description: data.description || '',
          logo_url: data.logo_url || '',
          banner_image_url: data.banner_image_url || '',
          website: socialLinks?.website || '',
          instagram: socialLinks?.instagram || '',
          facebook: socialLinks?.facebook || '',
          free_shipping_threshold: data.free_shipping_threshold ?? 35,
          estimated_processing_days: data.estimated_processing_days ?? 3,
          contact_email: data.contact_email || '',
          disable_free_shipping: data.disable_free_shipping ?? false,
          theme_color: themeColor,
        });
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
      toast.error('Failed to load store settings');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    try {
      setUploading(type);
      
      const compressedFile = await compressImage(file, 0.8);
      const fileExt = file.name.split('.').pop();
      const fileName = `${HOUSE_VENDOR_ID}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(`vendors/${fileName}`, compressedFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(`vendors/${fileName}`);

      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'banner_image_url']: publicUrl
      }));

      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          business_name: formData.business_name,
          description: formData.description,
          logo_url: formData.logo_url || null,
          banner_image_url: formData.banner_image_url || null,
          free_shipping_threshold: formData.disable_free_shipping ? null : formData.free_shipping_threshold,
          disable_free_shipping: formData.disable_free_shipping,
          estimated_processing_days: formData.estimated_processing_days,
          contact_email: formData.contact_email || null,
          theme_color: formData.theme_color,
          social_links: {
            website: formData.website || undefined,
            instagram: formData.instagram || undefined,
            facebook: formData.facebook || undefined,
          }
        } as any)
        .eq('id', HOUSE_VENDOR_ID);

      if (error) throw error;

      toast.success('Store settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with link to store page */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Joy House Official Store Settings</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
        >
          <Link to={`/vendors/${HOUSE_VENDOR_ID}`} target="_blank">
            <Eye className="h-4 w-4 mr-2" />
            Preview Store
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update the store's public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Store Name *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell customers about the store..."
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="disable_free_shipping"
                checked={formData.disable_free_shipping}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, disable_free_shipping: checked === true }))}
              />
              <Label htmlFor="disable_free_shipping" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Never offer free shipping
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="free_shipping_threshold" className={formData.disable_free_shipping ? "text-muted-foreground" : ""}>
                Free Shipping Minimum ($)
              </Label>
              <Input
                id="free_shipping_threshold"
                type="number"
                min="0"
                step="0.01"
                value={formData.free_shipping_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, free_shipping_threshold: parseFloat(e.target.value) || 0 }))}
                disabled={formData.disable_free_shipping}
                className={formData.disable_free_shipping ? "opacity-50" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {formData.disable_free_shipping 
                  ? "Free shipping is disabled. Customers will always pay for shipping."
                  : "Orders over this amount qualify for free shipping. Default is $35."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_processing_days">Order Processing Time</Label>
            <Select 
              value={formData.estimated_processing_days.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, estimated_processing_days: parseInt(value) || 3 }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select processing time" />
              </SelectTrigger>
              <SelectContent>
                {PROCESSING_TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long to prepare orders before shipping.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Customer Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
              placeholder="support@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Email address buyers can use to contact about order issues.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Theme</CardTitle>
          <CardDescription>
            Customize the look and feel of the store page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VendorThemeColorPicker
            value={formData.theme_color}
            onChange={(color) => setFormData(prev => ({ ...prev, theme_color: color }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Upload a logo and banner for the store profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <div className="relative">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'logo');
                  }}
                  disabled={uploading === 'logo'}
                />
                {uploading === 'logo' && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profile Banner</Label>
            <div className="space-y-2">
              {formData.banner_image_url && (
                <div className="relative">
                  <img 
                    src={formData.banner_image_url} 
                    alt="Banner preview"
                    className="w-full h-32 rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, banner_image_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'banner');
                  }}
                  disabled={uploading === 'banner'}
                />
                {uploading === 'banner' && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Our Story</CardTitle>
          <CardDescription>
            Add photos and videos to tell the story and show artisans creating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VendorStoryMediaManager vendorId={HOUSE_VENDOR_ID} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Add links to website and social media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              type="url"
              value={formData.instagram}
              onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
              placeholder="https://instagram.com/yourstore"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              type="url"
              value={formData.facebook}
              onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
              placeholder="https://facebook.com/yourstore"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
};
