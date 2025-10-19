import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const SponsorshipReceiptsManager = () => {
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);

  // Fetch active sponsorships without receipts
  const { data: sponsorshipsWithoutReceipts, isLoading, refetch } = useQuery({
    queryKey: ['sponsorships-without-receipts'],
    queryFn: async () => {
      const { data: sponsorships, error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .select(`
          id,
          amount,
          frequency,
          started_at,
          sponsor_id,
          sponsor_bestie_id,
          stripe_subscription_id,
          profiles!sponsorships_sponsor_id_fkey (
            email,
            display_name
          ),
          sponsor_besties (
            bestie_name
          )
        `)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (sponsorshipsError) throw sponsorshipsError;

      // Get all receipts
      const { data: receipts, error: receiptsError } = await supabase
        .from('sponsorship_receipts')
        .select('sponsorship_id');

      if (receiptsError) throw receiptsError;

      const receiptedIds = new Set(receipts?.map(r => r.sponsorship_id).filter(Boolean));

      // Filter out sponsorships that have receipts
      return sponsorships?.filter(s => !receiptedIds.has(s.id)) || [];
    },
  });

  const handleSendReceipt = async (sponsorshipId: string) => {
    setSending(sponsorshipId);
    try {
      const { error } = await supabase.functions.invoke('send-sponsorship-receipt', {
        body: { sponsorshipId },
      });

      if (error) throw error;

      toast({
        title: "Receipt sent",
        description: "The receipt has been sent successfully",
      });
      
      refetch();
    } catch (error: any) {
      console.error('Error sending receipt:', error);
      toast({
        title: "Error sending receipt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sponsorship Receipts</CardTitle>
          <CardDescription>Send missing receipts to sponsors</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sponsorship Receipts</CardTitle>
        <CardDescription>
          Send missing receipts to sponsors who never received them
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!sponsorshipsWithoutReceipts?.length ? (
          <p className="text-sm text-muted-foreground">
            All active sponsorships have receipts. Great job! 🎉
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Badge variant="outline" className="bg-yellow-100">
                {sponsorshipsWithoutReceipts.length}
              </Badge>
              <span className="text-sm text-yellow-800">
                sponsorship{sponsorshipsWithoutReceipts.length !== 1 ? 's' : ''} missing receipt{sponsorshipsWithoutReceipts.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {sponsorshipsWithoutReceipts.map((sponsorship) => {
                const profile = (sponsorship as any).profiles;
                const bestie = (sponsorship as any).sponsor_besties;
                
                return (
                  <div
                    key={sponsorship.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {profile?.display_name || 'Unknown Sponsor'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {profile?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {bestie?.bestie_name || 'Unknown Bestie'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${sponsorship.amount}/{sponsorship.frequency}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSendReceipt(sponsorship.id)}
                      disabled={sending === sponsorship.id}
                      size="sm"
                    >
                      {sending === sponsorship.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Receipt
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
