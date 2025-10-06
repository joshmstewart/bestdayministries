import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YearEndSettings {
  id: string;
  email_subject: string;
  email_intro_text: string;
  tax_notice_text: string;
  auto_send_enabled: boolean;
  auto_send_month: number;
  auto_send_day: number;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function YearEndSummarySettings() {
  const [settings, setSettings] = useState<YearEndSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("year_end_summary_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load year-end summary settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("year_end_summary_settings")
        .update({
          email_subject: settings.email_subject,
          email_intro_text: settings.email_intro_text,
          tax_notice_text: settings.tax_notice_text,
          auto_send_enabled: settings.auto_send_enabled,
          auto_send_month: settings.auto_send_month,
          auto_send_day: settings.auto_send_day,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Year-end summary settings saved",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-year-end-summary', {
        body: { 
          taxYear: new Date().getFullYear() - 1,
          sendEmail: false 
        }
      });

      if (error) throw error;
      
      if (data?.html) {
        setPreviewHtml(data.html);
      } else {
        throw new Error("No preview HTML returned");
      }
    } catch (error: any) {
      console.error("Error generating preview:", error);
      toast({
        title: "Preview Error",
        description: error.message || "Failed to generate preview. Make sure you have donation data.",
        variant: "destructive",
      });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No settings found
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-End Tax Summary Settings</CardTitle>
        <CardDescription>
          Configure email content and automatic sending for year-end tax summaries.
          Use {"{year}"} as a placeholder for the tax year.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info about inherited settings */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Organization Details:</strong> Tax ID/EIN, organization name, address, website, and email settings are pulled from <strong>Receipt Settings</strong> to ensure consistency across all donor communications.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Label htmlFor="email_subject">Email Subject</Label>
          <Input
            id="email_subject"
            value={settings.email_subject}
            onChange={(e) => setSettings({ ...settings, email_subject: e.target.value })}
            placeholder="Your {year} Tax Summary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email_intro">Email Introduction</Label>
          <Textarea
            id="email_intro"
            value={settings.email_intro_text}
            onChange={(e) => setSettings({ ...settings, email_intro_text: e.target.value })}
            rows={3}
            placeholder="Thank you for your support..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_notice">Tax Notice</Label>
          <Textarea
            id="tax_notice"
            value={settings.tax_notice_text}
            onChange={(e) => setSettings({ ...settings, tax_notice_text: e.target.value })}
            rows={3}
            placeholder="Tax deductibility notice..."
          />
        </div>

        <div className="border-t pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_send">Automatic Sending</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send year-end summaries on a specific date each year
                </p>
              </div>
              <Switch
                id="auto_send"
                checked={settings.auto_send_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, auto_send_enabled: checked })
                }
              />
            </div>

            {settings.auto_send_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="auto_send_month">Send Month</Label>
                  <Select
                    value={settings.auto_send_month.toString()}
                    onValueChange={(value) => 
                      setSettings({ ...settings, auto_send_month: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="auto_send_month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto_send_day">Send Day</Label>
                  <Input
                    id="auto_send_day"
                    type="number"
                    min="1"
                    max="31"
                    value={settings.auto_send_day}
                    onChange={(e) => 
                      setSettings({ ...settings, auto_send_day: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Year-End Tax Summary Preview</DialogTitle>
              </DialogHeader>
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[600px]"
                    title="Year-End Email Preview"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}