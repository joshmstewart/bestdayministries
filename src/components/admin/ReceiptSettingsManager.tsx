import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Eye } from "lucide-react";

interface ReceiptSettings {
  id: string;
  organization_name: string;
  organization_ein: string;
  sponsorship_receipt_message: string;
  sponsorship_tax_deductible_notice: string;
  donation_receipt_message: string;
  donation_tax_deductible_notice: string;
  from_email: string;
  reply_to_email: string | null;
  organization_address: string | null;
  website_url: string | null;
  // Legacy fields for backward compatibility
  receipt_message?: string;
  tax_deductible_notice?: string;
}

export const ReceiptSettingsManager = () => {
  const [settings, setSettings] = useState<ReceiptSettings | null>({
    id: '',
    organization_name: '',
    organization_ein: '',
    sponsorship_receipt_message: '',
    sponsorship_tax_deductible_notice: '',
    donation_receipt_message: '',
    donation_tax_deductible_notice: '',
    from_email: '',
    reply_to_email: null,
    organization_address: null,
    website_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadLogo();
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

  const loadLogo = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'logo_url')
        .maybeSingle();

      if (data?.setting_value) {
        // Parse the JSON-stringified value
        try {
          const parsed = typeof data.setting_value === 'string' 
            ? JSON.parse(data.setting_value)
            : data.setting_value;
          setLogoUrl(parsed);
        } catch {
          setLogoUrl(data.setting_value as string);
        }
      }
    } catch (error: any) {
      console.error('Error loading logo:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      
      const payload = {
        organization_name: settings.organization_name,
        organization_ein: settings.organization_ein,
        sponsorship_receipt_message: settings.sponsorship_receipt_message,
        sponsorship_tax_deductible_notice: settings.sponsorship_tax_deductible_notice,
        donation_receipt_message: settings.donation_receipt_message,
        donation_tax_deductible_notice: settings.donation_tax_deductible_notice,
        from_email: settings.from_email,
        reply_to_email: settings.reply_to_email || null,
        organization_address: settings.organization_address || null,
        website_url: settings.website_url || null,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (settings.id) {
        // UPDATE existing record
        result = await supabase
          .from('receipt_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // INSERT new record
        result = await supabase
          .from('receipt_settings')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      // Update state with the returned record (includes the new ID)
      setSettings(result.data);

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

  const generatePreviewHtml = () => {
    if (!settings) return '';

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(25.00);

    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sponsorship Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); border-radius: 8px 8px 0 0;">
                    ${logoUrl ? `
                      <img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 200px; height: auto; margin-bottom: 20px; border-radius: 12px;" />
                    ` : ''}
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ${settings.organization_name}
                    </h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">
                      Sponsorship Receipt
                    </p>
                  </td>
                </tr>

                <!-- Thank You Message -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      Dear John Sponsor,
                    </p>
                     <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                       ${settings.sponsorship_receipt_message || settings.receipt_message || ''}
                     </p>
                  </td>
                </tr>

                <!-- Sponsorship Details -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <table role="presentation" style="width: 100%; border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                      <tr>
                        <td style="padding: 20px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
                          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
                            Sponsorship Details
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Bestie Sponsored:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">Sample Bestie Name</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Amount:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${formattedAmount}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Frequency:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">Monthly Recurring</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Date:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${formattedDate}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Transaction ID:</td>
                              <td style="padding: 8px 0; font-size: 12px; font-weight: 600; color: #111827; text-align: right; word-break: break-all;">ch_1234567890abcdef</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Tax Information -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <div style="padding: 20px; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px;">
                      <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #92400E;">
                        Tax-Deductible Donation
                      </h3>
                       <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350F;">
                         ${settings.sponsorship_tax_deductible_notice || settings.tax_deductible_notice || ''}
                       </p>
                       ${settings.organization_ein ? `
                         <p style="margin: 10px 0 0; font-size: 14px; color: #78350F;">
                           <strong>Tax ID:</strong> ${settings.organization_ein}
                         </p>
                       ` : ''}
                    </div>
                  </td>
                </tr>

                <!-- Organization Info -->
                <tr>
                  <td style="padding: 20px 40px 40px; border-top: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          ${logoUrl ? `
                            <img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 150px; height: auto; margin-bottom: 12px; border-radius: 8px;" />
                          ` : ''}
                          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">
                            ${settings.organization_name}
                          </p>
                          ${settings.organization_address ? `
                            <p style="margin: 0 0 8px; font-size: 13px; color: #6B7280;">
                              ${settings.organization_address}
                            </p>
                          ` : ''}
                          ${settings.website_url ? `
                            <p style="margin: 0; font-size: 13px;">
                              <a href="${settings.website_url}" style="color: #D97706; text-decoration: none;">
                                ${settings.website_url.replace('https://', '').replace('http://', '')}
                              </a>
                            </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #6B7280;">
                      Please keep this receipt for your tax records.
                    </p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #6B7280;">
                      You will receive a receipt each time your monthly sponsorship is processed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Settings</CardTitle>
        <CardDescription>
          {settings?.id 
            ? "Customize receipt content for both sponsorships and donations. Each type has its own message and tax notice."
            : "Create your receipt settings to enable automatic receipt emails."
          }
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
            <Label htmlFor="organization_ein">Tax ID / EIN</Label>
            <Input
              id="organization_ein"
              value={settings.organization_ein}
              onChange={(e) => updateField('organization_ein', e.target.value)}
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

        {/* Sponsorship Receipt Content */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Sponsorship Receipt Content</h3>
          <p className="text-sm text-muted-foreground">
            Content specifically for bestie sponsorship receipts
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="sponsorship_receipt_message">Sponsorship Thank You Message</Label>
            <Textarea
              id="sponsorship_receipt_message"
              value={settings.sponsorship_receipt_message}
              onChange={(e) => updateField('sponsorship_receipt_message', e.target.value)}
              placeholder="Thank you for sponsoring [Bestie Name]..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Personal message displayed on sponsorship receipts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsorship_tax_deductible_notice">Sponsorship Tax Notice (508c1a)</Label>
            <Textarea
              id="sponsorship_tax_deductible_notice"
              value={settings.sponsorship_tax_deductible_notice}
              onChange={(e) => updateField('sponsorship_tax_deductible_notice', e.target.value)}
              placeholder="Your sponsorship is tax-deductible under 508(c)(1)(a)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Legal notice for sponsorship tax deductibility - consult your legal/tax advisor
            </p>
          </div>
        </div>

        {/* Donation Receipt Content */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Donation Receipt Content</h3>
          <p className="text-sm text-muted-foreground">
            Content specifically for general donation receipts
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="donation_receipt_message">Donation Thank You Message</Label>
            <Textarea
              id="donation_receipt_message"
              value={settings.donation_receipt_message}
              onChange={(e) => updateField('donation_receipt_message', e.target.value)}
              placeholder="Thank you for your generous donation..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Personal message displayed on donation receipts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donation_tax_deductible_notice">Donation Tax Notice (508c1a)</Label>
            <Textarea
              id="donation_tax_deductible_notice"
              value={settings.donation_tax_deductible_notice}
              onChange={(e) => updateField('donation_tax_deductible_notice', e.target.value)}
              placeholder="Your donation is tax-deductible under 508(c)(1)(a)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Legal notice for donation tax deductibility - consult your legal/tax advisor
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Receipt Preview</DialogTitle>
              </DialogHeader>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={generatePreviewHtml()}
                  className="w-full h-[600px] border-0"
                  title="Receipt Preview"
                />
              </div>
            </DialogContent>
          </Dialog>

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
