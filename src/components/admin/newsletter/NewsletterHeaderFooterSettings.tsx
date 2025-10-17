import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const NewsletterHeaderFooterSettings = () => {
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [headerHtml, setHeaderHtml] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: headerData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "newsletter_header")
        .single();

      const { data: footerData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "newsletter_footer")
        .single();

      if (headerData?.setting_value) {
        const headerValue = headerData.setting_value as any;
        setHeaderEnabled(headerValue.enabled || false);
        setHeaderHtml(headerValue.html || "");
      }

      if (footerData?.setting_value) {
        const footerValue = footerData.setting_value as any;
        setFooterEnabled(footerValue.enabled || false);
        setFooterHtml(footerValue.html || "");
      }
    } catch (error: any) {
      toast.error("Failed to load settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: headerError } = await supabase
        .from("app_settings")
        .update({
          setting_value: {
            enabled: headerEnabled,
            html: headerHtml,
          },
        })
        .eq("setting_key", "newsletter_header");

      if (headerError) throw headerError;

      const { error: footerError } = await supabase
        .from("app_settings")
        .update({
          setting_value: {
            enabled: footerEnabled,
            html: footerHtml,
          },
        })
        .eq("setting_key", "newsletter_footer");

      if (footerError) throw footerError;

      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setHeaderEnabled(false);
    setFooterEnabled(false);
    setHeaderHtml(
      '<div style="text-align: center; padding: 20px; background-color: #f8f9fa;"><h1 style="margin: 0; color: #333;">Best Day Ministries Newsletter</h1></div>'
    );
    setFooterHtml(
      '<div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6;"><p style="margin: 0; color: #666;">Follow us on social media</p></div>'
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure automatic header and footer content that will be added to every newsletter email. 
          Note: The unsubscribe link is always added automatically and cannot be removed (required for compliance).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="header-enabled">Enable Automatic Header</Label>
                  <p className="text-sm text-muted-foreground">
                    Add a header to the top of every newsletter email
                  </p>
                </div>
                <Switch
                  id="header-enabled"
                  checked={headerEnabled}
                  onCheckedChange={setHeaderEnabled}
                />
              </div>

              {headerEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Header Content</Label>
                    <RichTextEditor content={headerHtml} onChange={setHeaderHtml} />
                  </div>

                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="border rounded-md p-4 bg-white">
                      <style>{`
                        .email-preview h1 { font-size: 2.5em; font-weight: bold; margin: 0.67em 0; line-height: 1.2; }
                        .email-preview h2 { font-size: 2em; font-weight: bold; margin: 0.75em 0; line-height: 1.3; }
                        .email-preview h3 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; line-height: 1.4; }
                        .email-preview p { margin: 1em 0; line-height: 1.6; }
                      `}</style>
                      <div
                        className="email-preview"
                        dangerouslySetInnerHTML={{ __html: headerHtml }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="footer-enabled">Enable Automatic Footer</Label>
                  <p className="text-sm text-muted-foreground">
                    Add a footer to the bottom of every newsletter email (before the unsubscribe link)
                  </p>
                </div>
                <Switch
                  id="footer-enabled"
                  checked={footerEnabled}
                  onCheckedChange={setFooterEnabled}
                />
              </div>

              {footerEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Footer Content</Label>
                    <RichTextEditor content={footerHtml} onChange={setFooterHtml} />
                  </div>

                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="border rounded-md p-4 bg-white">
                      <style>{`
                        .email-preview h1 { font-size: 2.5em; font-weight: bold; margin: 0.67em 0; line-height: 1.2; }
                        .email-preview h2 { font-size: 2em; font-weight: bold; margin: 0.75em 0; line-height: 1.3; }
                        .email-preview h3 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; line-height: 1.4; }
                        .email-preview p { margin: 1em 0; line-height: 1.6; }
                      `}</style>
                      <div
                        className="email-preview"
                        dangerouslySetInnerHTML={{ __html: footerHtml }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button onClick={handleReset} variant="outline">
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
};
