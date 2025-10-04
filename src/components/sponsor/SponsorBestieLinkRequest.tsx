import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";
import { FRIEND_CODE_EMOJIS } from "@/lib/friendCodeEmojis";

interface SponsorBestieLinkRequestProps {
  sponsorId: string;
}

export const SponsorBestieLinkRequest = ({ sponsorId }: SponsorBestieLinkRequestProps) => {
  const { toast } = useToast();
  const [emoji1, setEmoji1] = useState("");
  const [emoji2, setEmoji2] = useState("");
  const [emoji3, setEmoji3] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!emoji1 || !emoji2 || !emoji3) {
      toast({
        title: "Friend code required",
        description: "Please select all 3 emojis for the bestie's friend code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const friendCode = emoji1 + emoji2 + emoji3;

      // Find bestie by friend code
      const { data: bestieProfile, error: profileError } = await supabase
        .from("profiles_public")
        .select("id, display_name, role")
        .eq("friend_code", friendCode)
        .eq("role", "bestie")
        .maybeSingle();

      if (profileError) throw profileError;

      if (!bestieProfile) {
        toast({
          title: "Bestie not found",
          description: "No bestie found with that friend code. Please check the code and try again.",
          variant: "destructive"
        });
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from("sponsor_bestie_requests")
        .select("id, status")
        .eq("sponsor_id", sponsorId)
        .eq("bestie_id", bestieProfile.id)
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "Request already exists",
          description: `You already have a ${existingRequest.status} request for this bestie.`,
          variant: "destructive"
        });
        return;
      }

      // Create sponsor link request
      const { error: insertError } = await supabase
        .from("sponsor_bestie_requests")
        .insert({
          sponsor_id: sponsorId,
          bestie_id: bestieProfile.id,
          message: message || null,
          status: "pending"
        });

      if (insertError) throw insertError;

      toast({
        title: "Link request sent!",
        description: `Your request to link with ${bestieProfile.display_name} has been sent to their guardian for approval.`
      });

      // Reset form
      setEmoji1("");
      setEmoji2("");
      setEmoji3("");
      setMessage("");
    } catch (error: any) {
      console.error("Error sending link request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send link request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Link to a Bestie
        </CardTitle>
        <CardDescription>
          Connect with a bestie using their 3-emoji friend code. Their guardian will review your request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Bestie's Friend Code</label>
          <div className="flex gap-2">
            <Select value={emoji1} onValueChange={setEmoji1}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="1st emoji" />
              </SelectTrigger>
              <SelectContent>
                {FRIEND_CODE_EMOJIS.map((item) => (
                  <SelectItem key={item.emoji} value={item.emoji}>
                    <span className="text-2xl">{item.emoji}</span> {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={emoji2} onValueChange={setEmoji2}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="2nd emoji" />
              </SelectTrigger>
              <SelectContent>
                {FRIEND_CODE_EMOJIS.map((item) => (
                  <SelectItem key={item.emoji} value={item.emoji}>
                    <span className="text-2xl">{item.emoji}</span> {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={emoji3} onValueChange={setEmoji3}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="3rd emoji" />
              </SelectTrigger>
              <SelectContent>
                {FRIEND_CODE_EMOJIS.map((item) => (
                  <SelectItem key={item.emoji} value={item.emoji}>
                    <span className="text-2xl">{item.emoji}</span> {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Message to Guardian (Optional)</label>
          <Textarea
            placeholder="Introduce yourself and explain why you'd like to connect..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={loading || !emoji1 || !emoji2 || !emoji3}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Heart className="w-4 h-4 mr-2" />
              Send Link Request
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
