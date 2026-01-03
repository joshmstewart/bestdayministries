import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getFullErrorText } from "@/lib/errorUtils";
import { Loader2, DollarSign, Mail, FileText, Trash2, AlertTriangle, RefreshCw, Database, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ReconciliationJobLogsDialog } from "./ReconciliationJobLogsDialog";
import { DuplicateTransactionsDetector } from "./DuplicateTransactionsDetector";
import { DonationRecoveryManager } from "./DonationRecoveryManager";
import { RecalculateAmountsTest } from "./RecalculateAmountsTest";
import { DonationDebugger } from "./DonationDebugger";
import { DonationHistoryDebugger } from "./DonationHistoryDebugger";
import { StripeCustomerChecker } from "./StripeCustomerChecker";
import { DeleteFakeDonations } from "./DeleteFakeDonations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const DataMaintenanceTools = () => {
  const [runningRecovery, setRunningRecovery] = useState(false);
  const [runningSync, setRunningSync] = useState(false);
  const [lastRecoveryJob, setLastRecoveryJob] = useState<any>(null);
  const [lastSyncJob, setLastSyncJob] = useState<any>(null);
  const [jobLogsDialogOpen, setJobLogsDialogOpen] = useState(false);
  const [selectedJobLog, setSelectedJobLog] = useState<any>(null);
  
  const [recalculating, setRecalculating] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [generatingDonationReceipts, setGeneratingDonationReceipts] = useState(false);
  const [fixingEmails, setFixingEmails] = useState(false);
  const [sendingCorrected, setSendingCorrected] = useState(false);
  const [backfillingEmails, setBackfillingEmails] = useState(false);
  
  const { toast } = useToast();

  const showErrorToastWithCopy = (context: string, error: any) => {
    const fullText = getFullErrorText(error);

    toast({
      title: `Error: ${context}`,
      description: (
        <div className="space-y-2">
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs font-mono">
            {fullText}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(fullText);
              toast({
                title: "Copied",
                description: "Full error details copied to clipboard.",
              });
            }}
            className="text-xs underline hover:no-underline"
          >
            Copy full error details
          </button>
        </div>
      ),
      variant: "destructive",
      duration: 100000,
    });
  };

  useEffect(() => {
    loadReconciliationJobStatus();
  }, []);

  const loadReconciliationJobStatus = async () => {
    try {
      const { data: recoveryJob } = await supabase
        .from('reconciliation_job_logs')
        .select('*')
        .eq('job_name', 'recover-incomplete-sponsorships')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recoveryJob) {
        setLastRecoveryJob(recoveryJob);
      }

      const { data: syncJob } = await supabase
        .from('reconciliation_job_logs')
        .select('*')
        .eq('job_name', 'sync-sponsorships')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncJob) {
        setLastSyncJob(syncJob);
      }
    } catch (error) {
      console.error('Error loading reconciliation status:', error);
    }
  };

  const runRecoveryNow = async () => {
    setRunningRecovery(true);
    try {
      const { data, error } = await supabase.functions.invoke('recover-incomplete-sponsorships');
      
      if (error) throw error;

      toast({
        title: "Recovery Complete",
        description: `Checked: ${data.checked}, Fixed: ${data.fixed}, Skipped: ${data.skipped}, Errors: ${data.errors.length}`,
      });

      await loadReconciliationJobStatus();
    } catch (error: any) {
      showErrorToastWithCopy("Running recovery", error);
    } finally {
      setRunningRecovery(false);
    }
  };

  const runSyncNow = async () => {
    setRunningSync(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sponsorships');
      
      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Checked: ${data.checked}, Updated: ${data.updated}, Cancelled: ${data.cancelled}, Errors: ${data.errors.length}`,
      });

      await loadReconciliationJobStatus();
    } catch (error: any) {
      showErrorToastWithCopy("Running sync", error);
    } finally {
      setRunningSync(false);
    }
  };


  const recalculateAmounts = async () => {
    if (!confirm("This will recalculate all sponsorship and donation amounts to match what was actually charged in Stripe. Continue?")) {
      return;
    }

    setRecalculating(true);
    let sponsorshipUpdates = 0;
    let donationUpdates = 0;

    try {
      const { data: sponsorshipData, error: sponsorshipError } = await supabase.functions.invoke('recalculate-sponsorship-amounts');
      if (sponsorshipError) throw sponsorshipError;
      sponsorshipUpdates = sponsorshipData?.updatedCount || 0;

      const { data: donationData, error: donationError } = await supabase.functions.invoke('recalculate-donation-amounts');
      if (donationError) throw donationError;
      donationUpdates = donationData?.updatedCount || 0;

      toast({
        title: "Recalculation Complete",
        description: `Updated ${sponsorshipUpdates} sponsorships and ${donationUpdates} donations`,
      });
    } catch (error: any) {
      showErrorToastWithCopy("Recalculating amounts", error);
    } finally {
      setRecalculating(false);
    }
  };

  const recoverAllMissingReceipts = async () => {
    if (!confirm("This will attempt to recover all missing receipts for donations by looking up Stripe data. Continue?")) {
      return;
    }

    setGeneratingDonationReceipts(true);
    try {
      const { data, error } = await supabase.functions.invoke('recover-all-missing-donations');
      
      if (error) throw error;

      toast({
        title: "Recovery Complete",
        description: `Processed: ${data.processed}, Created: ${data.created}, Already existed: ${data.alreadyExisted}, Errors: ${data.errors}`,
        duration: 10000,
      });
    } catch (error: any) {
      showErrorToastWithCopy("Recovering donations", error);
    } finally {
      setGeneratingDonationReceipts(false);
    }
  };

  const backfillMissingReceipts = async () => {
    if (!confirm("This will generate receipts for any donations that are missing them. Continue?")) {
      return;
    }

    setBackfilling(true);
    try {
      const { data, error } = await supabase.rpc('generate_missing_receipts');
      
      if (error) throw error;

      const created = data?.filter((r: any) => r.status === 'created').length || 0;
      const errors = data?.filter((r: any) => r.status.startsWith('error')).length || 0;

      toast({
        title: "Backfill Complete",
        description: `Created ${created} receipts, ${errors} errors`,
        duration: 10000,
      });
    } catch (error: any) {
      showErrorToastWithCopy("Backfilling receipts", error);
    } finally {
      setBackfilling(false);
    }
  };

  const fixReceiptEmails = async () => {
    if (!confirm("This will correct placeholder emails (unknown@donor.com) with real donor emails. Continue?")) {
      return;
    }

    setFixingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-receipt-emails');
      
      if (error) throw error;

      toast({
        title: "Emails Fixed",
        description: `Corrected ${data.corrected} emails, ${data.failed} failures. Review the receipts and then send.`,
        duration: 10000,
      });
    } catch (error: any) {
      showErrorToastWithCopy("Fixing receipt emails", error);
    } finally {
      setFixingEmails(false);
    }
  };

  const backfillDonationEmails = async () => {
    if (!confirm("This will update donation records with missing emails by looking up donor profiles. Continue?")) {
      return;
    }

    setBackfillingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-donation-emails');
      
      if (error) throw error;

      toast({
        title: data.message || "Backfill Complete",
        description: `✅ ${data.cleared || data.updated || 0} cleared | ❌ ${data.failed || 0} failed`,
        duration: 10000,
      });
    } catch (error: any) {
      showErrorToastWithCopy("Backfilling donation emails", error);
    } finally {
      setBackfillingEmails(false);
    }
  };

  const sendCorrectedReceipts = async () => {
    if (!confirm("This will send receipt emails to all corrected addresses. Continue?")) {
      return;
    }

    setSendingCorrected(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-corrected-receipts', {
        body: { receiptIds: null }
      });
      
      if (error) throw error;

      toast({
        title: "Receipts Sent",
        description: `Sent ${data.sent} emails, ${data.failed} failures`,
        duration: 10000,
      });
    } catch (error: any) {
      showErrorToastWithCopy("Sending corrected receipts", error);
    } finally {
      setSendingCorrected(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Data Maintenance Tools</CardTitle>
              <CardDescription>
                Tools for fixing, recovering, and maintaining donation and sponsorship data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="reconciliation" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto w-full">
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="receipts">Receipt Tools</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
        </TabsList>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Automated Reconciliation Status
              </CardTitle>
              <CardDescription>
                Recent automatic job runs that sync sponsorships with Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Incomplete Sponsorship Recovery */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Incomplete Sponsorship Recovery</h3>
                    <Badge variant={lastRecoveryJob?.status === 'success' ? 'default' : 'destructive'}>
                      {lastRecoveryJob?.status || 'Never run'}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Last run: {lastRecoveryJob?.ran_at ? format(new Date(lastRecoveryJob.ran_at), 'PPp') : 'Never'}
                    </p>
                    {lastRecoveryJob && (
                      <>
                        <div className="flex gap-3 flex-wrap">
                          <span>Checked: {lastRecoveryJob.checked_count || 0}</span>
                          <span className="text-green-600">Fixed: {lastRecoveryJob.updated_count || 0}</span>
                          <span className="text-yellow-600">Skipped: {lastRecoveryJob.skipped_count || 0}</span>
                          <span className="text-red-600">Errors: {lastRecoveryJob.error_count || 0}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            setSelectedJobLog(lastRecoveryJob);
                            setJobLogsDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Logs
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Sync */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Sponsorship Status Sync</h3>
                    <Badge variant={lastSyncJob?.status === 'success' ? 'default' : 'destructive'}>
                      {lastSyncJob?.status || 'Never run'}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Last run: {lastSyncJob?.ran_at ? format(new Date(lastSyncJob.ran_at), 'PPp') : 'Never'}
                    </p>
                    {lastSyncJob && (
                      <>
                        <div className="flex gap-3 flex-wrap">
                          <span>Checked: {lastSyncJob.checked_count || 0}</span>
                          <span className="text-green-600">Updated: {lastSyncJob.updated_count || 0}</span>
                          <span className="text-red-600">Errors: {lastSyncJob.error_count || 0}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            setSelectedJobLog(lastSyncJob);
                            setJobLogsDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Logs
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={runRecoveryNow}
                  disabled={runningRecovery}
                  variant="outline"
                  size="sm"
                >
                  {runningRecovery && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Recovery Now
                </Button>
                <Button 
                  onClick={runSyncNow}
                  disabled={runningSync}
                  variant="outline"
                  size="sm"
                >
                  {runningSync && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Status Sync Now
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedJobLog(lastRecoveryJob);
                    setJobLogsDialogOpen(true);
                  }}
                >
                  View Full Job History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt Tools Tab */}
        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Receipt Management Tools
              </CardTitle>
              <CardDescription>
                Tools for generating, fixing, and sending receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recover Missing Receipts</CardTitle>
                    <CardDescription className="text-xs">
                      Attempts to recover all missing receipts by looking up Stripe data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={recoverAllMissingReceipts} 
                      variant="outline" 
                      size="sm" 
                      disabled={generatingDonationReceipts}
                      className="w-full"
                    >
                      {generatingDonationReceipts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                      {generatingDonationReceipts ? "Recovering..." : "Recover All"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Backfill Missing Receipts</CardTitle>
                    <CardDescription className="text-xs">
                      Generate receipts for donations that are missing them
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={backfillMissingReceipts} 
                      variant="outline" 
                      size="sm" 
                      disabled={backfilling}
                      className="w-full"
                    >
                      {backfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                      {backfilling ? "Backfilling..." : "Backfill Receipts"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recalculate Amounts</CardTitle>
                    <CardDescription className="text-xs">
                      Recalculate amounts to match what was actually charged in Stripe
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={recalculateAmounts} 
                      variant="outline" 
                      size="sm" 
                      disabled={recalculating}
                      className="w-full"
                    >
                      {recalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                      {recalculating ? "Recalculating..." : "Recalculate"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Correction Workflow
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Three-step process to fix emails and send corrected receipts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={fixReceiptEmails} 
                      variant="outline" 
                      size="sm" 
                      disabled={fixingEmails}
                    >
                      {fixingEmails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      1. Fix Emails
                    </Button>
                    <Button 
                      onClick={sendCorrectedReceipts} 
                      variant="outline" 
                      size="sm" 
                      disabled={sendingCorrected}
                    >
                      {sendingCorrected ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      2. Send Receipts
                    </Button>
                    <Button 
                      onClick={backfillDonationEmails} 
                      variant="outline" 
                      size="sm" 
                      disabled={backfillingEmails}
                    >
                      {backfillingEmails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      3. Backfill Donation Emails
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <RecalculateAmountsTest />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery">
          <DonationRecoveryManager />
        </TabsContent>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates">
          <DuplicateTransactionsDetector />
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="space-y-6">
          <StripeCustomerChecker />
          <DonationDebugger />
          <DonationHistoryDebugger />
        </TabsContent>

        {/* Cleanup Tab */}
        <TabsContent value="cleanup">
          <DeleteFakeDonations />
        </TabsContent>
      </Tabs>

      <ReconciliationJobLogsDialog
        open={jobLogsDialogOpen}
        onOpenChange={setJobLogsDialogOpen}
        jobLog={selectedJobLog}
      />
    </div>
  );
};
