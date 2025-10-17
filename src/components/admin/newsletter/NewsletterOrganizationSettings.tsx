import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NewsletterOrganizationSettings = () => {
  const [organizationName, setOrganizationName] = useState("Best Day Ministries");
  const [organizationAddress, setOrganizationAddress] = useState("");
  const [fromEmail, setFromEmail] = useState("newsletter@bestdayministries.org");
  const [fromName, setFromName] = useState("Best Day Ministries");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "newsletter_organization")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data?.setting_value) {
        const settings = data.setting_value as any;
        setOrganizationName(settings.name || "Best Day Ministries");
        setOrganizationAddress(settings.address || "");
        setFromEmail(settings.from_email || "newsletter@bestdayministries.org");
        setFromName(settings.from_name || "Best Day Ministries");
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings = {
        name: organizationName,
        address: organizationAddress,
        from_email: fromEmail,
        from_name: fromName,
      };

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "newsletter_organization",
          setting_value: settings,
        });

      if (error) throw error;

      toast.success("Organization settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Organization Information</h3>
      <p className="text-sm text-muted-foreground mb-6">
        This information appears in the footer of all newsletter emails.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fromName">From Name</Label>
          <Input
            id="fromName"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Best Day Ministries"
          />
          <p className="text-sm text-muted-foreground">
            The sender name that appears in email clients
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fromEmail">From Email Address</Label>
          <Input
            id="fromEmail"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="newsletter@bestdayministries.org"
          />
          <p className="text-sm text-muted-foreground">
            Must be a verified domain in Resend
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizationName">Organization Name</Label>
          <Input
            id="organizationName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Best Day Ministries"
          />
          <p className="text-sm text-muted-foreground">
            Appears in the email footer
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizationAddress">Mailing Address</Label>
          <Textarea
            id="organizationAddress"
            value={organizationAddress}
            onChange={(e) => setOrganizationAddress(e.target.value)}
            placeholder="123 Main St&#10;City, State 12345"
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Your organization's physical mailing address (required by CAN-SPAM law)
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Organization Settings"}
        </Button>
      </div>
    </Card>
  );
};
