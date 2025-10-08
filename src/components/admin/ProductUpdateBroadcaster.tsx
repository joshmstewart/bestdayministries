import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const USER_ROLES = [
  { value: 'supporter', label: 'Supporters' },
  { value: 'bestie', label: 'Besties' },
  { value: 'caregiver', label: 'Caregivers' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'moderator', label: 'Moderators' },
  { value: 'admin', label: 'Admins' },
  { value: 'owner', label: 'Owners' },
];

export function ProductUpdateBroadcaster() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; sent: number; message: string } | null>(null);
  const { toast } = useToast();

  const handleRoleToggle = (role: string) => {
    setTargetRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('broadcast-product-update', {
        body: {
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || undefined,
          targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
        },
      });

      if (error) throw error;

      setLastResult({
        success: true,
        sent: data.sent,
        message: data.message,
      });

      toast({
        title: "Product Update Sent! 🎉",
        description: `Successfully sent to ${data.sent} user(s)`,
      });

      // Reset form
      setTitle("");
      setMessage("");
      setLink("");
      setTargetRoles([]);
    } catch (error: any) {
      console.error("Error broadcasting product update:", error);
      
      setLastResult({
        success: false,
        sent: 0,
        message: error.message || "Failed to broadcast product update",
      });

      toast({
        title: "Broadcast Failed",
        description: error.message || "An error occurred while sending the product update",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <CardTitle>Product Update Broadcaster</CardTitle>
        </div>
        <CardDescription>
          Send product updates, announcements, and feature releases to users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Update Title *</Label>
            <Input
              id="title"
              placeholder="e.g., New Feature: Dark Mode"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Update Message *</Label>
            <Textarea
              id="message"
              placeholder="Describe the update, new features, bug fixes, or important announcements..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length} characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link (Optional)</Label>
            <Input
              id="link"
              placeholder="/help or https://example.com/blog/new-feature"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Add a link to learn more, changelog, or blog post
            </p>
          </div>

          <div className="space-y-3">
            <Label>Target Audience (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Leave unchecked to send to all users, or select specific roles
            </p>
            <div className="grid grid-cols-2 gap-3">
              {USER_ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={targetRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                    disabled={sending}
                  />
                  <label
                    htmlFor={`role-${role.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
            {targetRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {targetRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {USER_ROLES.find(r => r.value === role)?.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {lastResult && (
          <div className={`rounded-lg p-4 ${
            lastResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${
                  lastResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {lastResult.success ? 'Broadcast Successful' : 'Broadcast Failed'}
                </p>
                <p className={`text-sm ${
                  lastResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {lastResult.message}
                </p>
                {lastResult.success && lastResult.sent > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Notifications created and emails are being sent in the background
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Users can manage notification preferences in their settings
          </p>
          <Button
            onClick={handleBroadcast}
            disabled={sending || !title.trim() || !message.trim()}
            className="gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Broadcasting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Broadcast Update
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}