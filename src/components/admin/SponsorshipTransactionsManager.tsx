import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getFullErrorText } from "@/lib/errorUtils";
import { Loader2, Search, ExternalLink, DollarSign, Calendar, User, Mail, X, Copy, FileText, CheckCircle, XCircle, Clock, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { ReconciliationJobLogsDialog } from "./ReconciliationJobLogsDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transaction {
  id: string;
  sponsor_id: string | null;
  sponsor_email: string | null;
  bestie_id: string | null;
  sponsor_bestie_id: string | null;
  amount: number;
  frequency: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_mode: string | null;
  started_at: string;
  ended_at: string | null;
  transaction_type: 'sponsorship' | 'donation';
  receipt_number: string | null;
  receipt_generated_at: string | null;
  sponsor_profile?: {
    display_name: string;
    avatar_url: string | null;
  };
  bestie_profile?: {
    display_name: string;
    avatar_url: string | null;
  };
  sponsor_bestie?: {
    bestie_name: string;
  };
}

export const SponsorshipTransactionsManager = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBestie, setFilterBestie] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrequency, setFilterFrequency] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [selectedSponsorshipId, setSelectedSponsorshipId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [receiptDetails, setReceiptDetails] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [resendingReceipt, setResendingReceipt] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState<string>('');
  const [recalculating, setRecalculating] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [generatingDonationReceipts, setGeneratingDonationReceipts] = useState(false);
  const [fixingEmails, setFixingEmails] = useState(false);
  const [sendingCorrected, setSendingCorrected] = useState(false);
  const [backfillingEmails, setBackfillingEmails] = useState(false);
  const [runningRecovery, setRunningRecovery] = useState(false);
  const [runningSync, setRunningSync] = useState(false);
  const [lastRecoveryJob, setLastRecoveryJob] = useState<any>(null);
  const [lastSyncJob, setLastSyncJob] = useState<any>(null);
  const [jobLogsDialogOpen, setJobLogsDialogOpen] = useState(false);
  const [selectedJobLog, setSelectedJobLog] = useState<any>(null);
  const [jobLogs, setJobLogs] = useState<any[]>([]);
  const [loadingJobLogs, setLoadingJobLogs] = useState(false);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [errorSearchTerm, setErrorSearchTerm] = useState("");
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
      copyText: fullText,
    });
  };

  useEffect(() => {
    loadTransactions();
    loadReconciliationJobStatus();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, transactions, filterBestie, filterStatus, filterFrequency, filterType]);

  const loadTransactions = async () => {
    console.log('🔵 [TRANSACTIONS] Starting loadTransactions...');
    try {
      setLoading(true);
      
      // Load sponsorships
      console.log('🔵 [TRANSACTIONS] Fetching sponsorships...');
      const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .select(`
          *,
          sponsor_bestie:sponsor_besties(bestie_name)
        `)
        .order('started_at', { ascending: false });
      
      // Load receipts for sponsorships and donations
      console.log('🔵 [TRANSACTIONS] Fetching receipts...');
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('sponsorship_receipts')
        .select('id, sponsorship_id, receipt_number, created_at, sponsor_email')
        .order('created_at', { ascending: false });

      if (sponsorshipsError) {
        console.error('🔴 [TRANSACTIONS] Sponsorships query failed:', {
          message: sponsorshipsError.message,
          code: sponsorshipsError.code,
          details: sponsorshipsError.details,
          hint: sponsorshipsError.hint,
        });
        throw sponsorshipsError;
      }
      console.log('✅ [TRANSACTIONS] Sponsorships loaded:', sponsorshipsData?.length || 0);
      
      if (receiptsError) {
        console.error('🔴 [TRANSACTIONS] Receipts query failed:', receiptsError);
        // Don't throw, just log - receipts are optional
      }
      console.log('✅ [TRANSACTIONS] Receipts loaded:', receiptsData?.length || 0);
      
      // Create receipts map by sponsorship_id (include email for display)
      const receiptsMap: Record<string, { receipt_number: string; created_at: string; email: string | null }> = {};
      if (receiptsData) {
        receiptsData.forEach(r => {
          if (r.sponsorship_id) {
            receiptsMap[r.sponsorship_id] = {
              receipt_number: r.receipt_number,
              created_at: r.created_at,
              email: r.sponsor_email || null,
            };
          }
        });
      }

      // Load donations
      console.log('🔵 [TRANSACTIONS] Fetching donations...');
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('*')
        .order('started_at', { ascending: false });

      if (donationsError) {
        console.error('🔴 [TRANSACTIONS] Donations query failed:', {
          message: donationsError.message,
          code: donationsError.code,
          details: donationsError.details,
          hint: donationsError.hint,
        });
        throw donationsError;
      }
      console.log('✅ [TRANSACTIONS] Donations loaded:', donationsData?.length || 0);

      // Map donation receipts via logs
      const donationIds = (donationsData || []).map(d => d.id);
      let donationReceiptsByDonationId: Record<string, { receipt_number: string; created_at: string; email: string | null }> = {};
      
      if (donationIds.length > 0 && receiptsData && receiptsData.length > 0) {
        const { data: donationLogs } = await supabase
          .from('receipt_generation_logs')
          .select('donation_id, receipt_id, stage')
          .in('donation_id', donationIds)
          .in('stage', ['webhook_receipt_created', 'receipt_created', 'backfill_receipt_created']);

        const receiptsById = new Map(
          receiptsData.map(r => [r.id, r] as const)
        );

        (donationLogs || []).forEach(log => {
          if (!log.receipt_id) return; // Skip logs with null receipt_id

          const r = receiptsById.get(log.receipt_id);
          if (r && log.donation_id) {
            donationReceiptsByDonationId[log.donation_id] = {
              receipt_number: r.receipt_number,
              created_at: r.created_at,
              email: r.sponsor_email || null,
            };
          }
        });
      }

      // Get unique profile IDs from both sponsorships and donations
      const sponsorIds = [...new Set(
        (sponsorshipsData || [])
          .map(s => s.sponsor_id)
          .filter((id): id is string => id !== null)
      )];
      
      const bestieIds = [...new Set(
        (sponsorshipsData || [])
          .map(s => s.bestie_id)
          .filter((id): id is string => id !== null)
      )];
      
      const donorIds = [...new Set(
        (donationsData || [])
          .map(d => d.donor_id)
          .filter((id): id is string => id !== null)
      )];

      const allProfileIds = [...new Set([...sponsorIds, ...bestieIds, ...donorIds])];
      
      console.log('🔵 [TRANSACTIONS] Profile IDs to fetch:', {
        totalUnique: allProfileIds.length,
        sponsorIds: sponsorIds.length,
        bestieIds: bestieIds.length,
        donorIds: donorIds.length,
        allIds: allProfileIds,
      });

      // Fetch all profiles at once using profiles_public view to avoid RLS issues
      let profilesMap: Record<string, any> = {};
      if (allProfileIds.length > 0) {
        console.log('🔵 [TRANSACTIONS] Fetching profiles from profiles_public...');
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles_public')
          .select('id, display_name, avatar_url, email')
          .in('id', allProfileIds);
        
        if (profilesError) {
          console.error('🔴 [TRANSACTIONS] Profiles query failed:', {
            message: profilesError.message,
            code: profilesError.code,
            details: profilesError.details,
            hint: profilesError.hint,
            requestedIds: allProfileIds,
          });
          throw profilesError;
        }
        
        console.log('✅ [TRANSACTIONS] Profiles loaded:', profilesData?.length || 0);
        
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map(p => [p.id, p])
          );
        }
      }

      // Transform sponsorships
      console.log('🔵 [TRANSACTIONS] Transforming sponsorships...');
      const sponsorships: Transaction[] = (sponsorshipsData || []).map(s => {
        const receipt = receiptsMap[s.id];
        return {
          ...s,
          sponsor_email: s.sponsor_email || receipt?.email || null,
          transaction_type: 'sponsorship' as const,
          sponsor_profile: s.sponsor_id ? profilesMap[s.sponsor_id] : undefined,
          bestie_profile: s.bestie_id ? profilesMap[s.bestie_id] : undefined,
          receipt_number: receipt?.receipt_number || null,
          receipt_generated_at: receipt?.created_at || null,
        };
      });

      // Transform donations
      console.log('🔵 [TRANSACTIONS] Transforming donations...');
      const donations: Transaction[] = (donationsData || []).map(d => {
        const receipt = donationReceiptsByDonationId[d.id];
        return {
          id: d.id,
          sponsor_id: d.donor_id,
          sponsor_email: d.donor_email || receipt?.email || (d.donor_id ? profilesMap[d.donor_id]?.email : null),
          bestie_id: null,
          sponsor_bestie_id: null,
          amount: d.amount_charged || d.amount,
          frequency: d.frequency,
          status: d.status,
          stripe_subscription_id: d.stripe_subscription_id,
          stripe_customer_id: d.stripe_customer_id,
          stripe_mode: d.stripe_mode,
          started_at: d.started_at,
          ended_at: d.ended_at,
          transaction_type: 'donation' as const,
          sponsor_profile: d.donor_id ? profilesMap[d.donor_id] : undefined,
          receipt_number: receipt?.receipt_number || null,
          receipt_generated_at: receipt?.created_at || null,
        };
      });

      // Merge and sort by date
      const allTransactions = [...sponsorships, ...donations].sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );

      console.log('✅ [TRANSACTIONS] Transformation complete:', {
        totalTransactions: allTransactions.length,
        sponsorships: sponsorships.length,
        donations: donations.length,
      });

      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('🔴 [TRANSACTIONS] Fatal error:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('🔵 [TRANSACTIONS] loadTransactions completed');
    }
  };

  const loadReconciliationJobStatus = async () => {
    try {
      // Load last recovery job
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

      // Load last sync job
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
      console.error('Error loading reconciliation job status:', error);
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
      await loadTransactions();
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
      await loadTransactions();
    } catch (error: any) {
      showErrorToastWithCopy("Running sync", error);
    } finally {
      setRunningSync(false);
    }
  };

  const loadJobLogs = async () => {
    setLoadingJobLogs(true);
    try {
      const { data, error } = await supabase
        .from('reconciliation_job_logs')
        .select('*')
        .order('ran_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setJobLogs(data || []);
    } catch (error) {
      console.error('Error loading job logs:', error);
      toast({
        title: "Error",
        description: "Failed to load job logs",
        variant: "destructive",
      });
    } finally {
      setLoadingJobLogs(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const sponsorName = t.sponsor_profile?.display_name?.toLowerCase() || '';
        const sponsorEmail = t.sponsor_email?.toLowerCase() || '';
        const bestieName = t.sponsor_bestie?.bestie_name?.toLowerCase() || 
                           t.bestie_profile?.display_name?.toLowerCase() || '';
        const subscriptionId = t.stripe_subscription_id?.toLowerCase() || '';
        
        return sponsorName.includes(term) ||
               sponsorEmail.includes(term) ||
               bestieName.includes(term) ||
               subscriptionId.includes(term);
      });
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.transaction_type === filterType);
    }

    // Apply bestie filter (only for sponsorships)
    if (filterBestie !== "all") {
      filtered = filtered.filter(t => 
        t.transaction_type === 'sponsorship' && t.sponsor_bestie_id === filterBestie
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      if (filterStatus === "scheduled_cancel") {
        filtered = filtered.filter(t => t.status === 'active' && t.ended_at);
      } else {
        filtered = filtered.filter(t => t.status === filterStatus);
      }
    }

    // Apply frequency filter
    if (filterFrequency !== "all") {
      filtered = filtered.filter(t => t.frequency === filterFrequency);
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBestie("all");
    setFilterStatus("all");
    setFilterFrequency("all");
    setFilterType("all");
  };

  // Get unique besties for filter dropdown
  const uniqueBesties = Array.from(
    new Map(
      transactions
        .filter(t => t.transaction_type === 'sponsorship' && t.sponsor_bestie)
        .map(t => [t.sponsor_bestie_id, t.sponsor_bestie?.bestie_name])
    )
  ).map(([id, name]) => ({ id, name }));

  const getStatusBadge = (status: string, endedAt: string | null) => {
    // If status is active but has ended_at, it's scheduled to cancel
    if (status === 'active' && endedAt) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          Scheduled to Cancel
        </Badge>
      );
    }
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      cancelled: "destructive",
      paused: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getModeBadge = (mode: string | null) => {
    if (!mode) return null;
    
    return (
      <Badge variant={mode === 'live' ? 'default' : 'secondary'} className={mode === 'live' ? 'bg-green-600' : ''}>
        {mode === 'live' ? 'Live' : 'Test'}
      </Badge>
    );
  };

  const getFrequencyBadge = (frequency: string) => {
    return (
      <Badge variant="outline">
        {frequency === 'monthly' ? 'Monthly' : 'One-Time'}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const openStripeSubscription = (subscriptionId: string, mode: string) => {
    const baseUrl = mode === 'live' 
      ? 'https://dashboard.stripe.com'
      : 'https://dashboard.stripe.com/test';
    window.open(`${baseUrl}/subscriptions/${subscriptionId}`, '_blank', 'noopener,noreferrer');
  };

  const copyTransactionId = async () => {
    if (!selectedTransactionId) return;
    
    try {
      await navigator.clipboard.writeText(selectedTransactionId);
      toast({
        title: "Copied!",
        description: "Transaction ID copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
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
      // Recalculate sponsorships
      const { data: sponsorshipData, error: sponsorshipError } = await supabase.functions.invoke('recalculate-sponsorship-amounts');
      if (sponsorshipError) throw sponsorshipError;
      sponsorshipUpdates = sponsorshipData?.updatedCount || 0;

      // Recalculate donations
      const { data: donationData, error: donationError } = await supabase.functions.invoke('recalculate-donation-amounts');
      if (donationError) throw donationError;
      donationUpdates = donationData?.updatedCount || 0;

      toast({
        title: "Success",
        description: `Updated ${sponsorshipUpdates} sponsorships and ${donationUpdates} donations`,
      });
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error recalculating amounts:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate amounts",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  const backfillMissingReceipts = async () => {
    if (!confirm("This will generate receipts for all active sponsorships that are missing receipts. Continue?")) {
      return;
    }

    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-sponsorship-receipts');
      
      if (error) throw error;

      // Prepare detailed message with copy button if there are errors
      if (data.errors && data.errors.length > 0) {
        const errorDetails = JSON.stringify(data.errors, null, 2);
        console.error('Backfill errors:', data.errors);
        
        toast({
          title: data.failed > 0 ? "Partial Success" : "Success",
          description: (
            <div className="space-y-2">
              <p>{data.message}</p>
              {data.failed > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {data.failed} sponsorship{data.failed > 1 ? 's' : ''} failed. Click to copy error details.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(errorDetails);
                      toast({ title: "Error details copied to clipboard" });
                    }}
                    className="text-xs underline hover:no-underline"
                  >
                    Copy Error Details
                  </button>
                </>
              )}
            </div>
          ),
          duration: 10000,
        });
      } else {
        toast({
          title: "Success",
          description: data.message,
        });
      }
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error backfilling receipts:', error);
      const errorMessage = error.message || "Failed to backfill receipts";
      
      toast({
        title: "Error",
        description: (
          <div className="space-y-2">
            <p>{errorMessage}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(error, null, 2));
                toast({ title: "Error details copied to clipboard" });
              }}
              className="text-xs underline hover:no-underline"
            >
              Copy Error Details
            </button>
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setBackfilling(false);
    }
  };

  const recoverAllMissingReceipts = async () => {
    if (!confirm("This will scan ALL donations and sponsorships and automatically create missing receipts. Continue?")) {
      return;
    }

    setGeneratingDonationReceipts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-missing-donation-receipts', {
        body: {}
      });
      
      if (error) throw error;

      toast({
        title: "Recovery Complete",
        description: data.message,
        action: data.logs ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(data.logs.join('\n'));
              toast({ title: "Logs copied to clipboard" });
            }}
          >
            Copy Logs
          </Button>
        ) : undefined,
      });
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error recovering receipts:', error);
      showErrorToastWithCopy("Recovering receipts", error);
    } finally {
      setGeneratingDonationReceipts(false);
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
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error fixing receipt emails:', error);
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

      console.log('📊 Backfill results:', data);

      // Show detailed results
      const clearedCount = data.cleared || data.updated || 0;
      const failedCount = data.failed || 0;
      const detailsText = data.details?.slice(0, 10).map((d: any) => 
        `${d.donationId.slice(0, 8)}: ${d.status} - ${d.reason || d.oldEmail || d.email || 'OK'}`
      ).join('\n') || 'No details available';

      const copyFull = [
        data.message || 'Backfill Complete',
        `✅ ${clearedCount} cleared | ❌ ${failedCount} failed`,
        detailsText,
        data.details && data.details.length > 10
          ? `Showing first 10 of ${data.details.length} results`
          : ''
      ]
        .filter(Boolean)
        .join('\n\n');

      toast({
        title: data.message || "Backfill Complete",
        description: (
          <div className="space-y-2">
            <p className="text-sm">
              ✅ {clearedCount} cleared | ❌ {failedCount} failed
            </p>
            {data.details && data.details.length > 0 && (
              <>
                <pre className="text-xs font-mono max-h-40 overflow-auto whitespace-pre-wrap bg-muted/50 p-2 rounded">
                  {detailsText}
                </pre>
                {data.details.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 10 of {data.details.length} results
                  </p>
                )}
              </>
            )}
          </div>
        ),
        duration: 20000,
        copyText: copyFull,
      });
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error backfilling donation emails:', error);
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
        body: { receiptIds: null } // Send all corrected receipts
      });
      
      if (error) throw error;

      toast({
        title: "Receipts Sent",
        description: `Sent ${data.sent} emails, ${data.failed} failures`,
        duration: 10000,
      });
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error sending corrected receipts:', error);
      showErrorToastWithCopy("Sending corrected receipts", error);
    } finally {
      setSendingCorrected(false);
    }
  };

  const deleteTestTransactions = async () => {
    if (!confirm("Are you sure you want to delete ALL test mode transactions (sponsorships AND donations)? This cannot be undone.")) {
      return;
    }

    try {
      // Delete test sponsorships
      const { error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .delete()
        .eq('stripe_mode', 'test');

      if (sponsorshipsError) throw sponsorshipsError;

      // Delete test donations
      const { error: donationsError } = await supabase
        .from('donations')
        .delete()
        .eq('stripe_mode', 'test');

      if (donationsError) throw donationsError;

      toast({
        title: "Success",
        description: "All test transactions have been deleted",
      });
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error deleting test transactions:', error);
      showErrorToastWithCopy("Deleting test transactions", error);
    }
  };

  const deleteIndividualTransaction = async (
    transactionId: string, 
    donorName: string, 
    isDuplicate: boolean = false
  ) => {
    const messageType = isDuplicate ? 'duplicate transaction' : 'test transaction';
    if (!confirm(`Are you sure you want to delete the ${messageType} for ${donorName}? This cannot be undone.`)) {
      return;
    }

    try {
      // Always attempt to delete from BOTH tables since we only have a single id
      const { error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .delete()
        .eq('id', transactionId);

      const { error: donationsError } = await supabase
        .from('donations')
        .delete()
        .eq('id', transactionId);
      
      // If both deletes errored, surface the problem
      if (sponsorshipsError && donationsError) {
        console.error('Error deleting from sponsorships:', sponsorshipsError);
        console.error('Error deleting from donations:', donationsError);
        throw donationsError ?? sponsorshipsError;
      }

      toast({
        title: "Success",
        description: `${isDuplicate ? 'Duplicate transaction' : 'Test transaction'} has been deleted`,
      });
      
      await loadTransactions();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const loadAuditLogs = async (transactionId: string, transactionType: 'sponsorship' | 'donation') => {
    setLoadingLogs(true);
    setReceiptDetails(null);
    setReceiptHtml('');
    
    try {
      // Query logs based on transaction type
      const { data: logs, error: logsError } = await supabase
        .from('receipt_generation_logs')
        .select('*')
        .eq(
          transactionType === 'sponsorship' ? 'sponsorship_id' : 'donation_id',
          transactionId
        )
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;
      setAuditLogs(logs || []);

      // ALWAYS fetch the actual receipt as primary content
      let receipt = null;
      
      if (transactionType === 'sponsorship') {
        const { data, error } = await supabase
          .from('sponsorship_receipts')
          .select('*')
          .eq('sponsorship_id', transactionId)
          .maybeSingle();
        
        if (!error && data) receipt = data;
      } else {
        // For donations: prioritize receipt_id from logs (authoritative link)
        const receiptLog = (logs || []).find(l => l.receipt_id);
        if (receiptLog) {
          const { data: receiptDirect, error: receiptDirectError } = await supabase
            .from('sponsorship_receipts')
            .select('*')
            .eq('id', receiptLog.receipt_id)
            .maybeSingle();

          if (!receiptDirectError && receiptDirect) {
            receipt = receiptDirect;
          }
        }

        // If still nothing (older donations with no logs), fall back to existing logic
        if (!receipt) {
          const { data: donationData } = await supabase
            .from('donations')
            .select('id, donor_email, amount')
            .eq('id', transactionId)
            .maybeSingle();

          if (donationData) {
            // Try transaction_id = donation UUID
            const { data: receiptByTxId } = await supabase
              .from('sponsorship_receipts')
              .select('*')
              .eq('transaction_id', transactionId)
              .maybeSingle();

            if (receiptByTxId) {
              receipt = receiptByTxId;
            } else if (donationData.donor_email) {
            // CRITICAL FIX: Try transaction_id = 'donation_{uuid}' format
            const { data: receiptByPrefixedId } = await supabase
              .from('sponsorship_receipts')
              .select('*')
              .eq('transaction_id', 'donation_' + transactionId)
              .maybeSingle();

            if (receiptByPrefixedId) {
              receipt = receiptByPrefixedId;
            } else if (donationData.donor_email) {
              // Only run email-based fallback if donor_email is not null
              const { data: receiptByEmail } = await supabase
                .from('sponsorship_receipts')
                .select('*')
                .eq('sponsor_email', donationData.donor_email)
                .eq('amount', donationData.amount)
                .eq('bestie_name', 'General Support')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (receiptByEmail) receipt = receiptByEmail;
            }
            }
          }
        }
      }

      if (receipt) {
        setReceiptDetails(receipt);
        // Generate full HTML receipt for display
        await generateReceiptHtml(receipt);
      }

      setSelectedSponsorshipId(transactionId);
      setAuditLogsOpen(true);
    } catch (error) {
      console.error('Error loading receipt:', error);
      toast({ 
        title: "Failed to load receipt", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const generateReceiptHtml = async (receipt: any) => {
    try {
      // Fetch receipt settings
      const { data: settings } = await supabase
        .from('receipt_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!settings) {
        throw new Error('Receipt settings not configured');
      }

      // Fetch logo URL
      const { data: logoSetting } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'logo_url')
        .maybeSingle();

      let logoUrl: string | null = null;
      if (logoSetting?.setting_value) {
        try {
          logoUrl = typeof logoSetting.setting_value === 'string' 
            ? JSON.parse(logoSetting.setting_value)
            : logoSetting.setting_value;
        } catch {
          logoUrl = logoSetting.setting_value as string;
        }
      }

      const isSponsorship = receipt.sponsorship_id !== null;
      const receiptType = isSponsorship ? 'Sponsorship' : 'Donation';
      
      const receiptMessage = isSponsorship 
        ? (settings.sponsorship_receipt_message || settings.receipt_message || '')
        : (settings.donation_receipt_message || settings.receipt_message || '');
      
      const taxNotice = isSponsorship
        ? (settings.sponsorship_tax_deductible_notice || settings.tax_deductible_notice || '')
        : (settings.donation_tax_deductible_notice || settings.tax_deductible_notice || '');

      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(receipt.amount);

      const formattedDate = new Date(receipt.transaction_date || receipt.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const frequencyText = receipt.frequency === 'monthly' ? 'Monthly Recurring' : 'One-Time';
      const sponsorName = receipt.sponsor_name || 'Donor';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${receiptType} Receipt</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); border-radius: 8px 8px 0 0;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 200px; height: auto; margin-bottom: 20px; border-radius: 12px;" />` : ''}
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">${settings.organization_name}</h1>
                      <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">${receiptType} Receipt</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px;">
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">Dear ${sponsorName},</p>
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">${receiptMessage}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <table role="presentation" style="width: 100%; border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                        <tr>
                          <td style="padding: 20px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
                            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${receiptType} Details</h2>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 20px;">
                            <table role="presentation" style="width: 100%;">
                              ${isSponsorship ? `<tr><td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Bestie Sponsored:</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${receipt.bestie_name}</td></tr>` : ''}
                              <tr><td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Amount:</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${formattedAmount}</td></tr>
                              <tr><td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Frequency:</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${frequencyText}</td></tr>
                              <tr><td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Date:</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${formattedDate}</td></tr>
                              <tr><td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Transaction ID:</td><td style="padding: 8px 0; font-size: 12px; font-weight: 600; color: #111827; text-align: right; word-break: break-all;">${receipt.transaction_id}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <div style="padding: 20px; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px;">
                        <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #92400E;">Tax-Deductible Donation</h3>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350F;">${taxNotice}</p>
                        ${settings.organization_ein ? `<p style="margin: 10px 0 0; font-size: 14px; color: #78350F;"><strong>Tax ID:</strong> ${settings.organization_ein}</p>` : ''}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px 40px; border-top: 1px solid #E5E7EB;">
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="text-align: center;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 150px; height: auto; margin-bottom: 12px; border-radius: 8px;" />` : ''}
                            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">${settings.organization_name}</p>
                            ${settings.organization_address ? `<p style="margin: 0 0 8px; font-size: 13px; color: #6B7280;">${settings.organization_address}</p>` : ''}
                            ${settings.website_url ? `<p style="margin: 0; font-size: 13px;"><a href="${settings.website_url}" style="color: #D97706; text-decoration: none;">${settings.website_url.replace('https://', '').replace('http://', '')}</a></p>` : ''}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #6B7280;">Please keep this receipt for your tax records.</p>
                      ${receipt.frequency === 'monthly' ? `<p style="margin: 10px 0 0; font-size: 12px; color: #6B7280;">You will receive a receipt each time your monthly sponsorship is processed.</p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      setReceiptHtml(html);
    } catch (error) {
      console.error('Error generating receipt HTML:', error);
      toast({
        title: "Failed to generate receipt",
        description: "Could not generate receipt display",
        variant: "destructive"
      });
    }
  };

  const downloadReceipt = () => {
    if (!receiptHtml) return;
    
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptDetails.receipt_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Receipt downloaded successfully",
    });
  };

  const resendReceiptEmail = async () => {
    if (!receiptDetails) return;
    
    setResendingReceipt(true);
    try {
      const { error } = await supabase.functions.invoke('send-sponsorship-receipt', {
        body: receiptDetails.sponsorship_id ? {
          sponsorshipId: receiptDetails.sponsorship_id,
        } : {
          // For donations, pass all receipt details directly from receipt record
          sponsorEmail: receiptDetails.sponsor_email,
          sponsorName: receiptDetails.sponsor_name || undefined,
          bestieName: receiptDetails.bestie_name || 'General Support',
          amount: parseFloat(receiptDetails.amount),
          frequency: receiptDetails.frequency,
          transactionId: receiptDetails.transaction_id || receiptDetails.id,
          transactionDate: receiptDetails.sent_at || receiptDetails.created_at,
          stripeMode: receiptDetails.stripe_mode || 'live',
        },
      });

      if (error) throw error;

      toast({
        title: "Receipt resent",
        description: "The receipt has been resent to the customer",
      });
    } catch (error: any) {
      console.error('Error resending receipt:', error);
      toast({
        title: "Failed to resend receipt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResendingReceipt(false);
    }
  };

  const generateMissingReceipt = async (transactionId: string, transactionType: 'sponsorship' | 'donation') => {
    setGeneratingReceipt(true);
    try {
      if (transactionType === 'donation') {
        // Use manual-complete-donation function
        const { error } = await supabase.functions.invoke('manual-complete-donation', {
          body: { donationId: transactionId },
        });
        if (error) throw error;
      } else {
        // Use send-sponsorship-receipt function
        const { error } = await supabase.functions.invoke('send-sponsorship-receipt', {
          body: { sponsorshipId: transactionId },
        });
        if (error) throw error;
      }

      toast({
        title: "Receipt generated",
        description: "Receipt has been generated and sent to the customer",
      });
      
      await loadTransactions();
      if (auditLogsOpen && selectedSponsorshipId === transactionId) {
        await loadAuditLogs(transactionId, transactionType);
      }
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Failed to generate receipt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const getStageIcon = (stage: string, status: string) => {
    if (status === 'failure') {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getStageName = (stage: string) => {
    const stageNames: Record<string, string> = {
      'webhook_received': 'Webhook Received',
      'sponsorship_create': 'Sponsorship Created',
      'receipt_trigger': 'Receipt Triggered',
      'receipt_generation_start': 'Receipt Generation Started',
      'settings_fetch': 'Settings Fetched',
      'email_send': 'Email Sent',
      'database_insert': 'Database Insert'
    };
    return stageNames[stage] || stage;
  };

  // Calculate stats (Live mode only)
  const stats = {
    total: transactions.length,
    active: transactions.filter(t => t.status === 'active').length,
    cancelled: transactions.filter(t => t.status === 'cancelled').length,
    totalMonthlyRevenue: transactions
      .filter(t => t.status === 'active' && t.frequency === 'monthly' && t.stripe_mode === 'live')
      .reduce((sum, t) => sum + t.amount, 0),
    totalOneTime: transactions
      .filter(t => t.frequency === 'one-time' && t.stripe_mode === 'live')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reconciliation Jobs Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Reconciliation Status</CardTitle>
          <CardDescription>
            Recent automatic job runs that sync sponsorships with Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Last Incomplete Sponsorship Recovery */}
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

            {/* Last Status Sync */}
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
                loadJobLogs();
                setJobLogsDialogOpen(true);
              }}
            >
              View Full Job History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Revenue</CardDescription>
            <CardTitle className="text-3xl">{formatAmount(stats.totalMonthlyRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>One-Time Total</CardDescription>
            <CardTitle className="text-3xl">{formatAmount(stats.totalOneTime)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                View and manage all donations and sponsorships
            </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={recoverAllMissingReceipts} variant="outline" size="sm" disabled={generatingDonationReceipts}>
                <FileText className="w-4 h-4 mr-2" />
                {generatingDonationReceipts ? "Recovering..." : "Recover All Missing Receipts"}
              </Button>
              <Button onClick={backfillMissingReceipts} variant="outline" size="sm" disabled={backfilling}>
                <FileText className="w-4 h-4 mr-2" />
                {backfilling ? "Backfilling..." : "Backfill Missing Receipts"}
              </Button>
              <Button onClick={recalculateAmounts} variant="outline" size="sm" disabled={recalculating}>
                <DollarSign className="w-4 h-4 mr-2" />
                {recalculating ? "Recalculating..." : "Recalculate Amounts"}
              </Button>
              <Button onClick={backfillDonationEmails} variant="outline" size="sm" disabled={backfillingEmails}>
                <Mail className="w-4 h-4 mr-2" />
                {backfillingEmails ? "Backfilling..." : "3. Backfill Donation Emails"}
              </Button>
              <Button onClick={fixReceiptEmails} variant="outline" size="sm" disabled={fixingEmails}>
                <Mail className="w-4 h-4 mr-2" />
                {fixingEmails ? "Fixing..." : "1. Fix Emails"}
              </Button>
              <Button onClick={sendCorrectedReceipts} size="sm" disabled={sendingCorrected}>
                <Mail className="w-4 h-4 mr-2" />
                {sendingCorrected ? "Sending..." : "2. Send Receipts"}
              </Button>
              <Button onClick={deleteTestTransactions} variant="destructive" size="sm">
                Delete Test Transactions
              </Button>
              <Button onClick={loadTransactions} variant="outline" size="sm">
                <Loader2 className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by donor name, email, bestie name, or subscription ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[150px]">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sponsorship">Sponsorships</SelectItem>
                    <SelectItem value="donation">Donations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Select value={filterBestie} onValueChange={setFilterBestie}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Bestie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Besties</SelectItem>
                    {uniqueBesties.map((bestie) => (
                      <SelectItem key={bestie.id} value={bestie.id}>
                        {bestie.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled_cancel">Scheduled to Cancel</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Select value={filterFrequency} onValueChange={setFilterFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one-time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(filterType !== "all" || filterBestie !== "all" || filterStatus !== "all" || filterFrequency !== "all" || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Donor/Sponsor</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No transactions match your search' : 'No transactions yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'sponsorship' ? 'default' : 'secondary'}>
                          {transaction.transaction_type === 'sponsorship' ? 'Sponsorship' : 'Donation'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {transaction.sponsor_profile?.display_name || 'Guest'}
                            </span>
                          </div>
                          {transaction.sponsor_email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span>{transaction.sponsor_email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {transaction.transaction_type === 'sponsorship' 
                            ? (transaction.sponsor_bestie?.bestie_name || 
                               transaction.bestie_profile?.display_name || 
                               'Unknown')
                            : 'General Fund'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{formatAmount(transaction.amount)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getFrequencyBadge(transaction.frequency)}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status, transaction.ended_at)}</TableCell>
                      <TableCell>{getModeBadge(transaction.stripe_mode)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(transaction.started_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(transaction.ended_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           {/* Receipt Status with Generate Button */}
                          {transaction.receipt_number ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadAuditLogs(transaction.id, transaction.transaction_type)}
                              title={`View Receipt: ${transaction.receipt_number}`}
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          ) : (transaction.status === 'active' || transaction.status === 'completed') ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateMissingReceipt(transaction.id, transaction.transaction_type)}
                              disabled={generatingReceipt}
                              title="Generate missing receipt"
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              title="Receipt not applicable"
                              className="text-gray-400"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Audit Logs - Available for both sponsorships and donations */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadAuditLogs(transaction.id, transaction.transaction_type)}
                            title="View Receipt Generation Logs"
                            disabled={loadingLogs}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          
                          {/* Stripe Links */}
                          {transaction.stripe_subscription_id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransactionId(transaction.stripe_subscription_id);
                                  setTransactionDialogOpen(true);
                                }}
                                title="View Subscription ID"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openStripeSubscription(
                                  transaction.stripe_subscription_id!,
                                  transaction.stripe_mode || 'test'
                                )}
                                title="Open in Stripe Dashboard"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </>
                          ) : transaction.stripe_customer_id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransactionId(transaction.stripe_customer_id);
                                  setTransactionDialogOpen(true);
                                }}
                                title="View Customer ID"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(
                                  `https://dashboard.stripe.com${transaction.stripe_mode === 'test' ? '/test' : ''}/customers/${transaction.stripe_customer_id}`,
                                  '_blank'
                                )}
                                title="Open Customer in Stripe"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </>
                          ) : transaction.frequency === 'monthly' ? (
                            <Badge variant="secondary" className="text-xs">
                              No Subscription ID
                            </Badge>
                          ) : null}
                          {(transaction.stripe_mode === 'test' || transaction.status === 'duplicate') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteIndividualTransaction(
                                transaction.id,
                                transaction.sponsor_profile?.display_name || transaction.sponsor_email || 'this donor',
                                transaction.status === 'duplicate'
                              )}
                              title={transaction.status === 'duplicate' ? 'Delete Duplicate Transaction' : 'Delete Test Transaction'}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Dialog */}
      <Dialog open={auditLogsOpen} onOpenChange={setAuditLogsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details & Audit Log</DialogTitle>
            <DialogDescription>
              Receipt information and generation process logs
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[600px] pr-4">
            {loadingLogs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* PRIMARY: Receipt Details */}
                {receiptDetails ? (
                  <div className="space-y-4">
                    {/* Full HTML Receipt Display */}
                    {receiptHtml && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Receipt
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={downloadReceipt}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={resendReceiptEmail}
                              disabled={resendingReceipt}
                            >
                              {resendingReceipt ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Mail className="w-4 h-4 mr-2" />
                              )}
                              Resend Email
                            </Button>
                          </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                          <iframe
                            srcDoc={receiptHtml}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="Receipt Preview"
                          />
                        </div>
                      </div>
                    )}

                    {/* Metadata Card */}
                    {receiptDetails && (
                      <div className="p-4 border rounded-lg bg-card">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Receipt Metadata
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Receipt #:</span>
                            <span className="font-mono text-xs">{receiptDetails.receipt_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-semibold">${receiptDetails.amount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-mono text-xs">{receiptDetails.sponsor_email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sent:</span>
                            <span>{format(new Date(receiptDetails.generated_at || receiptDetails.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          {receiptDetails.resend_email_id && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Email ID:</span>
                              <span className="font-mono text-xs">{receiptDetails.resend_email_id.slice(0, 20)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SECONDARY: Process Logs */}
                    {auditLogs.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Generation Process Logs
                        </h3>
                        <div className="space-y-3">
                          {auditLogs.map((log) => (
                            <div key={log.id} className="border-l-2 border-primary/20 pl-4 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{log.stage.replace(/_/g, ' ').toUpperCase()}</span>
                                <Badge variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}>
                                  {log.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                              </p>
                              {log.error_message && (
                                <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {auditLogs.length === 0 && (
                      <div className="p-3 border rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                          Receipt created manually - no automated generation logs available
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No receipt found for this transaction
                    </p>
                    <Button
                      onClick={() => generateMissingReceipt(selectedSponsorshipId!, transactions.find(t => t.id === selectedSponsorshipId)?.transaction_type || 'sponsorship')}
                      disabled={generatingReceipt}
                    >
                      {generatingReceipt ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Receipt...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate & Send Receipt Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Transaction ID Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction ID</DialogTitle>
            <DialogDescription>
              Stripe subscription ID for this sponsorship
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md font-mono text-sm break-all">
              {selectedTransactionId}
            </div>
            <Button onClick={copyTransactionId} className="w-full gap-2">
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job History Dialog */}
      <Dialog open={jobLogsDialogOpen} onOpenChange={setJobLogsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Reconciliation Job History</DialogTitle>
            <DialogDescription>
              View all automatic reconciliation job runs and their detailed error logs
            </DialogDescription>
          </DialogHeader>
          
          {loadingJobLogs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : jobLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No job logs yet
            </div>
          ) : (
            <div className="space-y-4">
              {/* Error Search */}
              {jobLogs.some(log => log.errors && Array.isArray(log.errors) && log.errors.length > 0) && (
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search errors by sponsorship ID, Stripe ID, or error message..."
                    value={errorSearchTerm}
                    onChange={(e) => setErrorSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              )}

              <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
                <div className="space-y-4">
                  {jobLogs.map((log) => {
                    const isExpanded = expandedJobIds.has(log.id);
                    const hasErrors = log.errors && Array.isArray(log.errors) && log.errors.length > 0;
                    
                    // Filter errors based on search term
                    const filteredErrors = hasErrors && errorSearchTerm.trim()
                      ? log.errors.filter((err: any) => {
                          const searchLower = errorSearchTerm.toLowerCase();
                          return (
                            err.sponsorship_id?.toLowerCase().includes(searchLower) ||
                            err.stripe_subscription_id?.toLowerCase().includes(searchLower) ||
                            err.subscription_id?.toLowerCase().includes(searchLower) ||
                            err.error?.toLowerCase().includes(searchLower) ||
                            err.error_message?.toLowerCase().includes(searchLower)
                          );
                        })
                      : log.errors;

                    const displayErrorCount = hasErrors && errorSearchTerm.trim() 
                      ? filteredErrors.length 
                      : log.error_count;

                    return (
                      <Card key={log.id} className="border-2">
                        <CardContent className="p-4">
                          {/* Job Summary Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="font-semibold text-sm">
                                {log.job_name === 'recover-incomplete-sponsorships' 
                                  ? 'Incomplete Sponsorship Recovery' 
                                  : 'Sponsorship Status Sync'}
                              </div>
                              <Badge variant={log.status === 'success' ? 'default' : log.status === 'partial_failure' ? 'secondary' : 'destructive'}>
                                {log.status}
                              </Badge>
                              <Badge variant={log.stripe_mode === 'live' ? 'default' : 'outline'}>
                                {log.stripe_mode}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.ran_at), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm">
                              <div>
                                <span className="text-muted-foreground">Checked: </span>
                                <span className="font-medium">{log.checked_count}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fixed: </span>
                                <span className="font-medium text-green-600">{log.updated_count || log.fixed_count || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Skipped: </span>
                                <span className="font-medium text-yellow-600">{log.skipped_count || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Errors: </span>
                                <span className="font-medium text-destructive">{displayErrorCount}</span>
                              </div>
                              
                              {hasErrors && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedJobIds);
                                    if (isExpanded) {
                                      newExpanded.delete(log.id);
                                    } else {
                                      newExpanded.add(log.id);
                                    }
                                    setExpandedJobIds(newExpanded);
                                  }}
                                >
                                  {isExpanded ? 'Hide Errors' : 'Show Errors'}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Last Error Preview (when collapsed) */}
                          {!isExpanded && hasErrors && filteredErrors.length > 0 && (
                            <div className="mt-3 p-2 bg-destructive/5 border-l-2 border-destructive rounded text-xs">
                              <span className="text-muted-foreground">Last error: </span>
                              <span className="font-mono">
                                {filteredErrors[0].error_message || filteredErrors[0].error || 'Unknown error'}
                              </span>
                            </div>
                          )}

                          {/* Expandable Error Details */}
                          {isExpanded && hasErrors && (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold">
                                  Error Details ({filteredErrors.length} {filteredErrors.length === 1 ? 'error' : 'errors'})
                                </h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const errorText = filteredErrors.map((err: any, idx: number) => 
                                      `Error ${idx + 1}:\n` +
                                      `  Sponsorship ID: ${err.sponsorship_id || 'N/A'}\n` +
                                      `  Stripe ID: ${err.stripe_subscription_id || err.subscription_id || 'N/A'}\n` +
                                      `  Error: ${err.error_message || err.error || 'Unknown'}\n`
                                    ).join('\n');
                                    
                                    navigator.clipboard.writeText(
                                      `Job: ${log.job_name}\n` +
                                      `Run: ${format(new Date(log.ran_at), 'MMM d, yyyy h:mm a')}\n` +
                                      `Status: ${log.status}\n` +
                                      `Total Errors: ${filteredErrors.length}\n\n` +
                                      errorText
                                    );
                                    toast({
                                      title: "Copied",
                                      description: `${filteredErrors.length} errors copied to clipboard`,
                                    });
                                  }}
                                >
                                  <Copy className="w-3 h-3 mr-2" />
                                  Copy All Errors
                                </Button>
                              </div>

                              <ScrollArea className="max-h-96 border rounded-lg">
                                <div className="divide-y">
                                  {filteredErrors.map((err: any, idx: number) => {
                                    const errorText = 
                                      `Sponsorship ID: ${err.sponsorship_id || 'N/A'}\n` +
                                      `Stripe ID: ${err.stripe_subscription_id || err.subscription_id || 'N/A'}\n` +
                                      `Error: ${err.error_message || err.error || 'Unknown'}`;

                                    return (
                                      <div key={idx} className="p-3 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs">
                                              <span className="text-muted-foreground font-medium">#{idx + 1}</span>
                                              {err.sponsorship_id && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2 font-mono text-xs hover:bg-primary/10"
                                                  onClick={() => {
                                                    setSearchTerm(err.sponsorship_id);
                                                    setJobLogsDialogOpen(false);
                                                  }}
                                                  title="Filter transactions by this ID"
                                                >
                                                  {err.sponsorship_id.slice(0, 8)}...
                                                </Button>
                                              )}
                                            </div>
                                            
                                            <div className="text-sm space-y-1">
                                              {(err.stripe_subscription_id || err.subscription_id) && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-muted-foreground text-xs">Stripe ID:</span>
                                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                    {err.stripe_subscription_id || err.subscription_id}
                                                  </code>
                                                </div>
                                              )}
                                              
                                              <div className="flex items-start gap-2">
                                                <span className="text-muted-foreground text-xs shrink-0">Error:</span>
                                                <p className="text-xs text-destructive font-mono flex-1 break-words">
                                                  {err.error_message || err.error || 'Unknown error'}
                                                </p>
                                              </div>
                                            </div>
                                          </div>

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0 h-8 w-8 p-0"
                                            onClick={() => {
                                              navigator.clipboard.writeText(errorText);
                                              toast({
                                                title: "Copied",
                                                description: "Error details copied to clipboard",
                                              });
                                            }}
                                            title="Copy this error"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReconciliationJobLogsDialog
        open={jobLogsDialogOpen}
        onOpenChange={setJobLogsDialogOpen}
        jobLog={selectedJobLog}
      />
    </div>
  );
};
