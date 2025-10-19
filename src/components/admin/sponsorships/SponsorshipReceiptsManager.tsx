import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export const SponsorshipReceiptsManager = () => {
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);

  // Fetch recent receipts log
  const { data: recentReceipts } = useQuery({
    queryKey: ['recent-sponsorship-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsorship_receipts')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

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
          Manage and view sponsorship receipt emails
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="missing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="missing">Missing Receipts</TabsTrigger>
            <TabsTrigger value="log">Receipt Log</TabsTrigger>
          </TabsList>

          <TabsContent value="missing" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="log" className="space-y-4">
            {!recentReceipts?.length ? (
              <p className="text-sm text-muted-foreground">
                No receipts have been sent yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <p className="font-medium truncate">
                          {receipt.sponsor_name || receipt.sponsor_email}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {receipt.sponsor_email}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {receipt.bestie_name || 'General'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${receipt.amount} / {receipt.frequency}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {receipt.receipt_number}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right whitespace-nowrap ml-4">
                      {format(new Date(receipt.sent_at), 'MMM d, yyyy')}
                      <br />
                      {format(new Date(receipt.sent_at), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
