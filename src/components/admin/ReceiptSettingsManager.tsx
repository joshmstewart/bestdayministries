import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface ReceiptSettings {
  id: string;
  organization_name: string;
  tax_id: string;
  receipt_message: string;
  tax_deductible_notice: string;
  from_email: string;
  reply_to_email: string | null;
  organization_address: string | null;
  website_url: string | null;
}

export const ReceiptSettingsManager = () => {
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error loading receipt settings:', error);
      toast({
        title: "Error",
        description: "Failed to load receipt settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('receipt_settings')
        .update({
          organization_name: settings.organization_name,
          tax_id: settings.tax_id,
          receipt_message: settings.receipt_message,
          tax_deductible_notice: settings.tax_deductible_notice,
          from_email: settings.from_email,
          reply_to_email: settings.reply_to_email || null,
          organization_address: settings.organization_address || null,
          website_url: settings.website_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Receipt settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving receipt settings:', error);
      toast({
        title: "Error",
        description: "Failed to save receipt settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ReceiptSettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No receipt settings found. Please contact support.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sponsorship Receipt Settings</CardTitle>
        <CardDescription>
          Customize the content and information included in sponsorship receipts sent to donors.
          These receipts are automatically sent when sponsors complete their payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Organization Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="organization_name">Organization Name</Label>
            <Input
              id="organization_name"
              value={settings.organization_name}
              onChange={(e) => updateField('organization_name', e.target.value)}
              placeholder="Your Organization Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID / EIN</Label>
            <Input
              id="tax_id"
              value={settings.tax_id}
              onChange={(e) => updateField('tax_id', e.target.value)}
              placeholder="508(c)(1)(a) or your EIN"
            />
            <p className="text-xs text-muted-foreground">
              Displayed on receipts for tax purposes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization_address">Organization Address (Optional)</Label>
            <Textarea
              id="organization_address"
              value={settings.organization_address || ''}
              onChange={(e) => updateField('organization_address', e.target.value)}
              placeholder="123 Main St, City, State ZIP"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL (Optional)</Label>
            <Input
              id="website_url"
              type="url"
              value={settings.website_url || ''}
              onChange={(e) => updateField('website_url', e.target.value)}
              placeholder="https://yourwebsite.org"
            />
          </div>
        </div>

        {/* Email Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Email Configuration</h3>
          
          <div className="space-y-2">
            <Label htmlFor="from_email">From Email</Label>
            <Input
              id="from_email"
              type="email"
              value={settings.from_email}
              onChange={(e) => updateField('from_email', e.target.value)}
              placeholder="Your Organization <noreply@yourdomain.com>"
            />
            <p className="text-xs text-muted-foreground">
              Format: "Organization Name &lt;email@domain.com&gt;" - Must use a verified domain in Resend
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply_to_email">Reply-To Email (Optional)</Label>
            <Input
              id="reply_to_email"
              type="email"
              value={settings.reply_to_email || ''}
              onChange={(e) => updateField('reply_to_email', e.target.value)}
              placeholder="contact@yourdomain.com"
            />
            <p className="text-xs text-muted-foreground">
              Where replies to receipts will be sent
            </p>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Receipt Content</h3>
          
          <div className="space-y-2">
            <Label htmlFor="receipt_message">Thank You Message</Label>
            <Textarea
              id="receipt_message"
              value={settings.receipt_message}
              onChange={(e) => updateField('receipt_message', e.target.value)}
              placeholder="Thank you for your generous sponsorship..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Personal message displayed at the top of the receipt
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_deductible_notice">Tax-Deductible Notice</Label>
            <Textarea
              id="tax_deductible_notice"
              value={settings.tax_deductible_notice}
              onChange={(e) => updateField('tax_deductible_notice', e.target.value)}
              placeholder="Your donation is tax-deductible..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Legal notice about tax deductibility - consult your legal/tax advisor
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Receipt Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
