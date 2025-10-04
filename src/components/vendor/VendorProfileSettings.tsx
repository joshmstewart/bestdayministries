import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

interface VendorProfileSettingsProps {
  vendorId: string;
}

export const VendorProfileSettings = ({ vendorId }: VendorProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    logo_url: '',
    banner_image_url: '',
    website: '',
    instagram: '',
    facebook: '',
  });

  useEffect(() => {
    loadVendorData();
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error) throw error;

      if (data) {
        const socialLinks = data.social_links as any;
        setFormData({
          business_name: data.business_name || '',
          description: data.description || '',
          logo_url: data.logo_url || '',
          banner_image_url: data.banner_image_url || '',
          website: socialLinks?.website || '',
          instagram: socialLinks?.instagram || '',
          facebook: socialLinks?.facebook || '',
        });
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
      toast.error('Failed to load vendor information');
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    try {
      setUploading(type);
      
      const compressedFile = await compressImage(file, 0.8);
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendorId}/${type}-${Date.now()}.${fileExt}`;

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
          social_links: {
            website: formData.website || undefined,
            instagram: formData.instagram || undefined,
            facebook: formData.facebook || undefined,
          }
        })
        .eq('id', vendorId);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update your store's public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
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
              placeholder="Tell customers about your store..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Upload a logo and banner for your store profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <img 
                  src={formData.logo_url} 
                  alt="Logo preview"
                  className="w-16 h-16 rounded-full object-cover"
                />
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
                <img 
                  src={formData.banner_image_url} 
                  alt="Banner preview"
                  className="w-full h-32 rounded-lg object-cover"
                />
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
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Add links to your website and social media
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
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
};
