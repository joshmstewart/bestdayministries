import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, Info, PlayCircle, AlertTriangle, Send } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface DryRunResult {
  email: string;
  donorId: string | null;
  totalAmount: number;
  userName: string;
  wouldSkip: boolean;
}

export function YearEndSummarySettings() {
  const [settings, setSettings] = useState<YearEndSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<DryRunResult[] | null>(null);
  const [dryRunSummary, setDryRunSummary] = useState<{ sent: number; skipped: number; taxYear: number } | null>(null);
  const [sendNowLoading, setSendNowLoading] = useState(false);
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

      // Check if the data contains an error message (even if HTTP succeeded)
      if (data?.error) {
        toast({
          title: "No Data Available",
          description: `${data.error} for year ${data.year || new Date().getFullYear() - 1}. The preview requires at least one completed sponsorship payment to generate.`,
          variant: "destructive",
        });
        setPreviewOpen(false);
        return;
      }

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
        description: "Failed to generate preview. Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDryRun = async () => {
    setDryRunLoading(true);
    setDryRunOpen(true);
    setDryRunResults(null);
    setDryRunSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-batch-year-end-summaries', {
        body: { 
          force: true,
          dryRun: true, // This is the default, but being explicit
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        setDryRunOpen(false);
        return;
      }

      setDryRunResults(data.preview || []);
      setDryRunSummary({
        sent: data.sent || 0,
        skipped: data.skipped || 0,
        taxYear: data.taxYear,
      });
    } catch (error: any) {
      console.error("Error running dry run:", error);
      toast({
        title: "Error",
        description: "Failed to run dry run test",
        variant: "destructive",
      });
      setDryRunOpen(false);
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleSendNow = async () => {
    setSendNowLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-batch-year-end-summaries', {
        body: { 
          force: true,
          dryRun: false, // ACTUALLY SEND EMAILS
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Year-End Summaries Sent!",
        description: `Successfully sent ${data.sent} emails. ${data.skipped} were skipped (already sent).`,
      });
    } catch (error: any) {
      console.error("Error sending year-end summaries:", error);
      toast({
        title: "Error",
        description: "Failed to send year-end summaries: " + error.message,
        variant: "destructive",
      });
    } finally {
      setSendNowLoading(false);
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

        <div className="flex flex-wrap gap-2 justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Email
                </Button>
              </DialogTrigger>
              <DialogDescription className="sr-only">
                Preview of the year-end tax summary email template with your custom settings
              </DialogDescription>
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

            {/* Dry Run Test Button */}
            <Dialog open={dryRunOpen} onOpenChange={setDryRunOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleDryRun}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Test Dry Run
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Dry Run Test - No Emails Sent
                  </DialogTitle>
                  <DialogDescription>
                    This shows what WOULD be sent if you enabled sending. No emails are actually sent.
                  </DialogDescription>
                </DialogHeader>
                {dryRunLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : dryRunResults ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex flex-wrap gap-4">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        Tax Year: {dryRunSummary?.taxYear}
                      </Badge>
                      <Badge variant="default" className="text-base px-3 py-1 bg-green-600">
                        Would Send: {dryRunSummary?.sent}
                      </Badge>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        Already Sent (Skip): {dryRunSummary?.skipped}
                      </Badge>
                    </div>
                    
                    {/* From Email Display */}
                    <Alert className="bg-muted/50">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Sending From:</strong> <code className="bg-background px-2 py-0.5 rounded text-sm">noreply@bestdayministries.org</code>
                      </AlertDescription>
                    </Alert>

                    {/* Warning */}
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Review carefully!</strong> Verify these amounts match what donors actually gave before enabling real sends.
                      </AlertDescription>
                    </Alert>

                    {/* Results Table */}
                    <ScrollArea className="h-[400px] border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dryRunResults.map((result, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{result.email}</TableCell>
                              <TableCell>{result.userName}</TableCell>
                              <TableCell className="text-right font-semibold">
                                ${result.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {result.wouldSkip ? (
                                  <Badge variant="outline">Already Sent</Badge>
                                ) : (
                                  <Badge variant="default" className="bg-green-600">Would Send</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Send Now Button with Confirmation */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={sendNowLoading}>
                  {sendNowLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Send Year-End Summaries Now?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      <strong>This will send real emails to all donors</strong> for tax year {new Date().getFullYear() - 1}.
                    </p>
                    <p>
                      Have you verified the amounts in the Dry Run test? This action cannot be undone.
                    </p>
                    <p className="text-amber-600 font-medium">
                      Donors who have already received a summary this year will be skipped.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleSendNow}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Send Emails Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

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