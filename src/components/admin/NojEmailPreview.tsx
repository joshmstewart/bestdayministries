import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NojEmailPreview = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "preview-noj-confirmation-email",
        { body: { mode: "preview" } },
      );
      if (error) throw error;
      setHtml((data as any).html);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    const list = recipients
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error("Enter at least one email address");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "preview-noj-confirmation-email",
        { body: { mode: "test", recipients: list } },
      );
      if (error) throw error;
      toast.success(`Test sent to ${(data as any).sent_to?.length || list.length} recipient(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send test");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Night of Joy — Ticket Confirmation Email
        </CardTitle>
        <CardDescription>
          Branded confirmation email with sponsor logos. Not yet hooked up to send automatically — use this to preview and send test emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button onClick={loadPreview} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            Load Preview
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipients">Send Test To (comma- or space-separated)</Label>
          <div className="flex gap-2">
            <Input
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="you@example.com, another@example.com"
            />
            <Button onClick={sendTest} disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The email will be marked as a TEST at the top so it's clearly distinguishable from a real confirmation.
          </p>
        </div>

        {html && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg overflow-hidden bg-background">
              <iframe
                srcDoc={html}
                title="Email preview"
                className="w-full"
                style={{ height: "900px", border: "none" }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
