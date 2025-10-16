import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const NewsletterSettings = () => {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-webhook`;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">From Email Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>From Name</Label>
            <Input defaultValue="Best Day Ministries" disabled />
            <p className="text-sm text-muted-foreground">
              This name will appear in the "From" field of your emails
            </p>
          </div>
          <div className="space-y-2">
            <Label>From Email</Label>
            <Input defaultValue="newsletter@bestdayministries.org" disabled />
            <p className="text-sm text-muted-foreground">
              Make sure this email is verified in your Resend account
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resend Webhook Configuration</h3>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Add this webhook URL to your Resend dashboard to enable email analytics tracking
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                }}
                className="px-3 py-2 text-sm border rounded hover:bg-accent"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Required Events</Label>
            <p className="text-sm text-muted-foreground">
              Enable these events in your Resend webhook configuration:
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
              <li>email.sent</li>
              <li>email.delivered</li>
              <li>email.opened</li>
              <li>email.clicked</li>
              <li>email.bounced</li>
              <li>email.complained</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Unsubscribe Settings</h3>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              An unsubscribe link is automatically added to every email. Make sure to include your physical mailing address in email templates for CAN-SPAM compliance.
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Getting Started</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>To start sending newsletters:</p>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Verify your domain in Resend dashboard</li>
            <li>Add the webhook URL above to Resend</li>
            <li>Enable all required webhook events</li>
            <li>Create your first campaign in the Campaigns tab</li>
            <li>Send a test email to verify everything works</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};