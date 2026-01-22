import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Heart } from "lucide-react";
import { FRIEND_CODE_EMOJIS } from "@/lib/friendCodeEmojis";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

const BESTIE_ROLES = [
  { value: "Maker", label: "Maker" },
  { value: "Beneficiary", label: "Beneficiary" }
];

interface VendorBestieLinkRequestProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

export const VendorBestieLinkRequest = ({ vendorId, theme }: VendorBestieLinkRequestProps) => {
  const [emoji1, setEmoji1] = useState("");
  const [emoji2, setEmoji2] = useState("");
  const [emoji3, setEmoji3] = useState("");
  const [message, setMessage] = useState("");
  const [bestieRole, setBestieRole] = useState("Maker");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emoji1 || !emoji2 || !emoji3) {
      toast.error("Please select all 3 emojis");
      return;
    }

    const friendCode = `${emoji1}${emoji2}${emoji3}`;
    setLoading(true);

    try {
      // Look up bestie by friend code
      const { data: profile, error: profileError } = await supabase
        .from('profiles_public')
        .select('id, display_name, friend_code')
        .eq('friend_code', friendCode)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error("Friend code not found");
        setLoading(false);
        return;
      }

      // Verify the profile has the bestie role by checking user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);

      if (rolesError) {
        console.error('Roles error:', rolesError);
        toast.error("Error verifying bestie status");
        setLoading(false);
        return;
      }

      const isBestie = roles?.some(r => r.role === 'bestie');
      if (!isBestie) {
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
          status: 'pending',
          bestie_role: bestieRole
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
      setEmoji1("");
      setEmoji2("");
      setEmoji3("");
      setMessage("");
      setBestieRole("Maker");
    } catch (error) {
      console.error('Error creating link request:', error);
      toast.error("Failed to send link request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className="border-2"
      style={theme ? { 
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        boxShadow: theme.cardGlow
      } : undefined}
    >
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
            <Label>Friend Code *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select the bestie's 3-emoji friend code
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">First Emoji</Label>
                <Select value={emoji1} onValueChange={setEmoji1} disabled={loading}>
                  <SelectTrigger className="h-20 text-4xl">
                    <SelectValue placeholder="?" />
                  </SelectTrigger>
                  <SelectContent>
                    {FRIEND_CODE_EMOJIS.map((item) => (
                      <SelectItem key={`1-${item.emoji}`} value={item.emoji} className="text-3xl">
                        {item.emoji}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Second Emoji</Label>
                <Select value={emoji2} onValueChange={setEmoji2} disabled={loading}>
                  <SelectTrigger className="h-20 text-4xl">
                    <SelectValue placeholder="?" />
                  </SelectTrigger>
                  <SelectContent>
                    {FRIEND_CODE_EMOJIS.map((item) => (
                      <SelectItem key={`2-${item.emoji}`} value={item.emoji} className="text-3xl">
                        {item.emoji}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Third Emoji</Label>
                <Select value={emoji3} onValueChange={setEmoji3} disabled={loading}>
                  <SelectTrigger className="h-20 text-4xl">
                    <SelectValue placeholder="?" />
                  </SelectTrigger>
                  <SelectContent>
                    {FRIEND_CODE_EMOJIS.map((item) => (
                      <SelectItem key={`3-${item.emoji}`} value={item.emoji} className="text-3xl">
                        {item.emoji}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {emoji1 && emoji2 && emoji3 && (
              <div className="text-center p-4 bg-muted rounded-lg mt-4">
                <p className="text-xs text-muted-foreground mb-2">Friend Code Preview:</p>
                <p className="text-5xl tracking-wider">{emoji1}{emoji2}{emoji3}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bestie-role">Bestie's Role</Label>
            <Select value={bestieRole} onValueChange={setBestieRole} disabled={loading}>
              <SelectTrigger id="bestie-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BESTIE_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Is this bestie the maker of your products, or the beneficiary of your store?
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
