import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const BulkReceiptGenerator = () => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [missingReceipts, setMissingReceipts] = useState<any[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const scanForMissingReceipts = async () => {
    setScanning(true);
    try {
      // Get all completed/active transactions
      const { data: sponsorships } = await supabase
        .from('sponsorships')
        .select('id, sponsor_email, amount, frequency, started_at, sponsor_bestie:sponsor_besties(bestie_name)')
        .in('status', ['completed', 'active']);

      const { data: donations } = await supabase
        .from('donations')
        .select('id, donor_email, amount, frequency, started_at')
        .in('status', ['completed', 'active']);

      // Get all existing receipts
      const { data: receipts } = await supabase
        .from('sponsorship_receipts')
        .select('sponsorship_id, transaction_id');

      const receiptedIds = new Set(receipts?.map(r => r.sponsorship_id || r.transaction_id).filter(Boolean));

      // Find missing receipts
      const missingSponsorships = (sponsorships || [])
        .filter(s => !receiptedIds.has(s.id))
        .map(s => ({
          id: s.id,
          type: 'sponsorship' as const,
          email: s.sponsor_email,
          amount: s.amount,
          frequency: s.frequency,
          date: s.started_at,
          recipient: (s as any).sponsor_bestie?.bestie_name || 'Unknown Bestie',
        }));

      const missingDonations = (donations || [])
        .filter(d => !receiptedIds.has(d.id))
        .map(d => ({
          id: d.id,
          type: 'donation' as const,
          email: d.donor_email,
          amount: d.amount,
          frequency: d.frequency,
          date: d.started_at,
          recipient: 'General Support',
        }));

      const allMissing = [...missingSponsorships, ...missingDonations];
      setMissingReceipts(allMissing);

      if (allMissing.length === 0) {
        toast({
          title: "No missing receipts",
          description: "All transactions have receipts generated",
        });
      } else {
        setConfirmDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Error scanning for missing receipts:', error);
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const generateAllMissingReceipts = async () => {
    setGenerating(true);
    setConfirmDialogOpen(false);
    setProgress({ current: 0, total: missingReceipts.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < missingReceipts.length; i++) {
      const transaction = missingReceipts[i];
      setProgress({ current: i + 1, total: missingReceipts.length });

      try {
        if (transaction.type === 'sponsorship') {
          const { error } = await supabase.functions.invoke('send-sponsorship-receipt', {
            body: { sponsorshipId: transaction.id },
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.functions.invoke('manual-complete-donation', {
            body: { donationId: transaction.id },
          });
          if (error) throw error;
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to generate receipt for ${transaction.id}:`, error);
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast({
      title: "Bulk generation complete",
      description: `Generated ${successCount} receipts successfully. ${failCount} failed.`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    setGenerating(false);
    setProgress({ current: 0, total: 0 });
    setMissingReceipts([]);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bulk Receipt Generator</CardTitle>
          <CardDescription>
            Scan for and generate missing receipts for all completed transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={scanForMissingReceipts}
            disabled={scanning || generating}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning Transactions...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Scan for Missing Receipts
              </>
            )}
          </Button>

          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating receipts...</span>
                <span className="font-medium">{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Generate {missingReceipts.length} Missing Receipts?
            </DialogTitle>
            <DialogDescription>
              The following transactions are missing receipts. Confirm to generate and send emails to all customers.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {missingReceipts.map((transaction) => (
                <div key={transaction.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={transaction.type === 'sponsorship' ? 'default' : 'secondary'}>
                      {transaction.type}
                    </Badge>
                    <span className="font-semibold">${transaction.amount}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-mono text-xs">{transaction.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipient:</span>
                      <span>{transaction.recipient}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateAllMissingReceipts}>
              Generate All Receipts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
