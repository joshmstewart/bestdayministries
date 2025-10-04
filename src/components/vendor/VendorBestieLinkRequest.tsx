import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Heart } from "lucide-react";

interface VendorBestieLinkRequestProps {
  vendorId: string;
}

export const VendorBestieLinkRequest = ({ vendorId }: VendorBestieLinkRequestProps) => {
  const [friendCode, setFriendCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!friendCode.trim()) {
      toast.error("Please enter a friend code");
      return;
    }

    setLoading(true);

    try {
      // Look up bestie by friend code
      const { data: profile, error: profileError } = await supabase
        .from('profiles_public')
        .select('id, display_name, role')
        .eq('friend_code', friendCode)
        .single();

      if (profileError || !profile) {
        toast.error("Friend code not found");
        setLoading(false);
        return;
      }

      if (profile.role !== 'bestie') {
        toast.error("This friend code doesn't belong to a bestie");
        setLoading(false);
        return;
      }

      // Create link request
      const { error: requestError } = await supabase
        .from('vendor_bestie_requests')
        .insert({
          vendor_id: vendorId,
          bestie_id: profile.id,
          message: message.trim() || null,
          status: 'pending'
        });

      if (requestError) {
        if (requestError.code === '23505') { // Unique constraint violation
          toast.error("You've already requested to link with this bestie");
        } else {
          throw requestError;
        }
        setLoading(false);
        return;
      }

      toast.success(`Link request sent to ${profile.display_name}'s guardian!`);
      setFriendCode("");
      setMessage("");
    } catch (error) {
      console.error('Error creating link request:', error);
      toast.error("Failed to send link request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Link Your Store to a Bestie
        </CardTitle>
        <CardDescription>
          Enter a bestie's friend code to request linking your store to their profile.
          Their guardian will need to approve this request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="friendCode">Friend Code *</Label>
            <Input
              id="friendCode"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              placeholder="Enter bestie's emoji friend code"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Ask the bestie or their guardian for their friend code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Optional Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and explain why you'd like to link..."
              rows={3}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" />
                Send Link Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
