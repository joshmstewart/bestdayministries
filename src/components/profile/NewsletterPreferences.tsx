import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NewsletterPreferencesProps {
  userId: string;
  userEmail: string;
}

export const NewsletterPreferences = ({ userId, userEmail }: NewsletterPreferencesProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading subscription:", error);
        return;
      }

      if (data) {
        setSubscription(data);
        setIsSubscribed(data.status === 'active');
      }
    } catch (error: any) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSaving(true);
    try {
      if (subscription) {
        // Update existing subscription
        const { error } = await supabase
          .from("newsletter_subscribers")
          .update({
            status: 'active',
            unsubscribed_at: null,
          })
          .eq("id", subscription.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert({
            email: userEmail,
            user_id: userId,
            status: 'active',
            source: 'profile_settings',
          });

        if (error) throw error;
      }

      setIsSubscribed(true);
      await loadSubscription();

      toast({
        title: "Subscribed!",
        description: "You'll now receive our newsletter updates.",
      });
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast({
        title: "Error subscribing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscription) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (error) throw error;

      setIsSubscribed(false);
      await loadSubscription();

      toast({
        title: "Unsubscribed",
        description: "You've been removed from our newsletter list.",
      });
    } catch (error: any) {
      console.error("Error unsubscribing:", error);
      toast({
        title: "Error unsubscribing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 shadow-warm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-warm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Newsletter Subscription
          </CardTitle>
          <CardDescription>
            Manage your email newsletter preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Status */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label className="text-base">Email Newsletters</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about events, discussions, and community news
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Sent to: <span className="font-medium">{userEmail}</span>
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleSubscribe();
                } else {
                  handleUnsubscribe();
                }
              }}
              disabled={saving}
            />
          </div>

          {/* Status Indicator */}
          {isSubscribed ? (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                You're subscribed and will receive newsletter updates at {userEmail}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You're not subscribed. Enable the toggle above to start receiving newsletters.
              </AlertDescription>
            </Alert>
          )}

          {/* Subscription Info */}
          {subscription && (
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Status:</span>{" "}
                <span className="capitalize">{subscription.status}</span>
              </p>
              {subscription.subscribed_at && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Subscribed:</span>{" "}
                  {new Date(subscription.subscribed_at).toLocaleDateString()}
                </p>
              )}
              {subscription.unsubscribed_at && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Unsubscribed:</span>{" "}
                  {new Date(subscription.unsubscribed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">About Our Newsletter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Our newsletter includes:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Upcoming events and activities</li>
            <li>Community discussions and announcements</li>
            <li>Sponsorship program updates</li>
            <li>Featured stories from our community</li>
          </ul>
          <p className="pt-2 text-xs">
            You can unsubscribe at any time by toggling off the switch above or clicking the unsubscribe link in any newsletter email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};