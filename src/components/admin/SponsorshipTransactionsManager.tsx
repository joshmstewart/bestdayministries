import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { Loader2, Search, ExternalLink, DollarSign, Calendar, User, Mail, X, Copy, FileText, CheckCircle, XCircle, Clock, Trash2, Download, ChevronDown, BarChart3 } from "lucide-react";
import { format, startOfMonth, eachMonthOfInterval } from "date-fns";
import { RevenueChartDialog } from "./RevenueChartDialog";

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    email?: string | null;
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
  const [filterStatus, setFilterStatus] = useState<string[]>(["active", "pending", "paused", "completed", "scheduled_cancel"]);
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
  const [revenuePeriod, setRevenuePeriod] = useState<string>('all-time');
  const [revenueChartOpen, setRevenueChartOpen] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, transactions, filterBestie, filterStatus, filterFrequency, filterType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Load sponsorships (the original source with real statuses)
      const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .select('*')
        .order('started_at', { ascending: false });

      if (sponsorshipsError) {
        console.error('Error loading sponsorships:', sponsorshipsError);
        throw sponsorshipsError;
      }

      // Load ALL donations (not just one)
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('*')
        .order('started_at', { ascending: false });

      if (donationsError) {
        console.error('Error loading donations:', donationsError);
        throw donationsError;
      }

      // Load sponsor_besties for designation mapping
      const { data: sponsorBesties } = await supabase
        .from('sponsor_besties')
        .select('id, bestie_name, bestie_id');
      
      const sponsorBestieMap = new Map(
        (sponsorBesties || []).map(sb => [sb.id, sb])
      );

      // Get unique profile IDs from both tables
      const profileIds = [...new Set([
        ...(sponsorshipsData || []).map(s => s.sponsor_id).filter((id): id is string => id !== null),
        ...(donationsData || []).map(d => d.donor_id).filter((id): id is string => id !== null),
      ])];

      // Fetch profiles
      let profilesMap: Record<string, any> = {};
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles_public')
          .select('id, display_name, avatar_url, email')
          .in('id', profileIds);
        
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map(p => [p.id, p])
          );
        }
      }

      // Fetch receipts to get receipt info for each transaction
      const { data: receiptsData } = await supabase
        .from('sponsorship_receipts')
        .select('id, sponsorship_id, receipt_number, created_at, transaction_id');
      
      const receiptsMap = new Map<string, any>();
      (receiptsData || []).forEach(r => {
        if (r.sponsorship_id) {
          receiptsMap.set(r.sponsorship_id, r);
        }
        // Also map by transaction_id for donations (format: donation_{id})
        if (r.transaction_id?.startsWith('donation_')) {
          const donationId = r.transaction_id.replace('donation_', '');
          receiptsMap.set(donationId, r);
        }
      });

      // Transform sponsorships to transactions
      const sponsorshipTransactions: Transaction[] = (sponsorshipsData || []).map(s => {
        const sponsorBestie = s.sponsor_bestie_id ? sponsorBestieMap.get(s.sponsor_bestie_id) : null;
        const receipt = receiptsMap.get(s.id);
        
        return {
          id: s.id,
          sponsor_id: s.sponsor_id,
          sponsor_email: s.sponsor_email,
          bestie_id: s.bestie_id,
          sponsor_bestie_id: s.sponsor_bestie_id,
          amount: s.amount || 0,
          frequency: s.frequency || 'one-time',
          status: s.status || 'active',
          stripe_subscription_id: s.stripe_subscription_id,
          stripe_customer_id: s.stripe_customer_id,
          stripe_mode: s.stripe_mode,
          started_at: s.started_at,
          ended_at: s.ended_at,
          transaction_type: 'sponsorship' as const,
          sponsor_profile: s.sponsor_id ? profilesMap[s.sponsor_id] : undefined,
          bestie_profile: undefined,
          sponsor_bestie: sponsorBestie ? { bestie_name: sponsorBestie.bestie_name } : undefined,
          receipt_number: receipt?.receipt_number || null,
          receipt_generated_at: receipt?.created_at || null,
        };
      });

      // Transform donations to transactions
      const donationTransactions: Transaction[] = (donationsData || []).map(d => {
        const receipt = receiptsMap.get(d.id);

        const profileEmail = d.donor_id ? (profilesMap[d.donor_id]?.email ?? null) : null;
        const resolvedEmail = (d.donor_email || profileEmail || null) as string | null;
        
        return {
          id: d.id,
          sponsor_id: d.donor_id,
          sponsor_email: resolvedEmail,
          bestie_id: null,
          sponsor_bestie_id: null,
          amount: d.amount || 0,
          frequency: d.frequency || 'one-time',
          status: d.status || 'pending',
          stripe_subscription_id: d.stripe_subscription_id,
          stripe_customer_id: d.stripe_customer_id,
          stripe_mode: d.stripe_mode,
          started_at: d.started_at || d.created_at,
          ended_at: d.ended_at,
          transaction_type: 'donation' as const,
          sponsor_profile: d.donor_id ? profilesMap[d.donor_id] : undefined,
          bestie_profile: undefined,
          sponsor_bestie: undefined,
          receipt_number: receipt?.receipt_number || null,
          receipt_generated_at: receipt?.created_at || null,
        };
      });

      // Combine and sort by date
      const allTransactions = [...sponsorshipTransactions, ...donationTransactions]
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('🔴 [TRANSACTIONS] Fatal error:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const sponsorName = t.sponsor_profile?.display_name?.toLowerCase() || '';
        const sponsorEmail = (t.sponsor_email || t.sponsor_profile?.email || '').toLowerCase();
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

    // Apply status filter (multi-select)
    if (filterStatus.length > 0) {
      filtered = filtered.filter(t => {
        // Handle scheduled_cancel as both a real status and pseudo-status (for legacy data)
        const isScheduledCancel = t.status === 'scheduled_cancel' || (t.status === 'active' && t.ended_at);
        if (isScheduledCancel && filterStatus.includes('scheduled_cancel')) {
          return true;
        }
        // Don't show scheduled_cancel items under "active" unless explicitly selected
        if (isScheduledCancel && !filterStatus.includes('scheduled_cancel')) {
          return false;
        }
        return filterStatus.includes(t.status);
      });
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
    setFilterStatus(["active", "pending", "paused", "completed", "scheduled_cancel"]);
    setFilterFrequency("all");
    setFilterType("all");
  };

  const allStatusOptions = [
    { value: "active", label: "Active" },
    { value: "scheduled_cancel", label: "Scheduled to Cancel" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "paused", label: "Paused" },
    { value: "duplicate", label: "Duplicate" },
    { value: "test", label: "Test" },
  ];

  const toggleStatusFilter = (status: string) => {
    setFilterStatus(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
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
    // Handle scheduled_cancel status (both new direct status and legacy active+ended_at)
    if (status === 'scheduled_cancel' || (status === 'active' && endedAt)) {
      const cancelDate = endedAt ? new Date(endedAt).toLocaleDateString() : null;
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700" title={cancelDate ? `Cancels on ${cancelDate}` : undefined}>
          Scheduled to Cancel
        </Badge>
      );
    }
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      cancelled: "destructive",
      paused: "secondary",
      pending: "outline",
      completed: "default",
    };
    return (
      <Badge variant={variants[status] || "outline"} className={status === 'completed' ? 'bg-green-600' : ''}>
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


  const deleteIndividualTransaction = async (
    transactionId: string, 
    donorName: string, 
    isPendingOrDuplicate: boolean = false
  ) => {
    const messageType = isPendingOrDuplicate ? 'pending/duplicate transaction' : 'test transaction';
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
        description: `Transaction has been deleted`,
      });
      
      // Update local state immediately
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
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

  // Calculate current month start
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  // Identify first transaction per subscription (for "New" badge)
  // Group by stripe_subscription_id, find the earliest started_at for each
  const firstTransactionIds = new Set<string>();
  const subscriptionFirstDates = new Map<string, { id: string; date: Date }>();
  
  transactions.forEach(t => {
    if (t.frequency === 'monthly' && t.stripe_subscription_id) {
      const startDate = new Date(t.started_at);
      const existing = subscriptionFirstDates.get(t.stripe_subscription_id);
      if (!existing || startDate < existing.date) {
        subscriptionFirstDates.set(t.stripe_subscription_id, { id: t.id, date: startDate });
      }
    }
  });
  
  subscriptionFirstDates.forEach(value => {
    firstTransactionIds.add(value.id);
  });

  // Generate available months from earliest transaction to now
  const availableMonths = useMemo(() => {
    const liveTx = transactions.filter(t => t.stripe_mode === 'live');
    if (liveTx.length === 0) return [];
    
    const dates = liveTx.map(t => new Date(t.started_at));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const now = new Date();
    
    const months = eachMonthOfInterval({ start: startOfMonth(earliest), end: now });
    return months.map(m => ({
      value: format(m, "yyyy-MM"),
      label: format(m, "MMMM yyyy")
    })).reverse(); // Most recent first
  }, [transactions]);

  // Revenue from receipts (stored separately for accurate individual payment tracking)
  const [revenueFromReceipts, setRevenueFromReceipts] = useState<{total: number, byMonth: Record<string, number>}>({ total: 0, byMonth: {} });
  
  useEffect(() => {
    const loadRevenue = async () => {
      const { data: receipts } = await supabase
        .from('sponsorship_receipts')
        .select('amount, created_at, stripe_mode')
        .eq('stripe_mode', 'live');
      
      if (receipts) {
        const total = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
        const byMonth: Record<string, number> = {};
        
        receipts.forEach(r => {
          const date = new Date(r.created_at);
          const key = format(date, "yyyy-MM");
          byMonth[key] = (byMonth[key] || 0) + (r.amount || 0);
        });
        
        setRevenueFromReceipts({ total, byMonth });
      }
    };
    loadRevenue();
  }, []);

  // Calculate revenue for selected period using receipts data
  const getRevenueForPeriod = (period: string) => {
    if (period === 'all-time') {
      return revenueFromReceipts.total;
    }
    return revenueFromReceipts.byMonth[period] || 0;
  };

  // Calculate stats (Live mode only) - now properly counting individual payments
  const liveSuccessfulTransactions = transactions.filter(t => 
    t.stripe_mode === 'live' && 
    ['paid', 'completed', 'active', 'succeeded'].includes(t.status?.toLowerCase() || '')
  );

  // Get unique active subscriptions (those with recent payments)
  const activeSubscriptions = new Set(
    liveSuccessfulTransactions
      .filter(t => t.frequency === 'monthly' && t.stripe_subscription_id)
      .map(t => t.stripe_subscription_id)
  );

  const stats = {
    total: transactions.length,
    active: activeSubscriptions.size,
    cancelled: 0, // Not applicable for individual transactions view
    totalMonthlyRevenue: liveSuccessfulTransactions
      .filter(t => t.frequency === 'monthly')
      .reduce((sum, t) => sum + t.amount, 0),
    totalOneTime: liveSuccessfulTransactions
      .filter(t => t.frequency === 'one-time')
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total Revenue - Featured Card */}
        <Card className="lg:col-span-2 bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="font-medium text-base">Total Revenue</CardDescription>
              <div className="flex items-center gap-2">
                <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
                  <SelectTrigger className="w-auto h-8 px-3 text-sm bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-time">All Time</SelectItem>
                    {availableMonths.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => setRevenueChartOpen(true)}
                  title="View revenue charts"
                >
                  <BarChart3 className="h-4 w-4" />
                  Charts
                </Button>
              </div>
            </div>
            <CardTitle className="text-4xl lg:text-5xl text-primary mt-2">
              {formatAmount(getRevenueForPeriod(revenuePeriod))}
            </CardTitle>
            <div className="flex gap-6 mt-4 pt-4 border-t border-primary/10">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Recurring</p>
                <p className="text-xl font-semibold">{formatAmount(stats.totalMonthlyRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">One-Time</p>
                <p className="text-xl font-semibold">{formatAmount(stats.totalOneTime)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Secondary Stats - Compact */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Transactions</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Active Subscriptions</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
        </div>
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
            <Button onClick={loadTransactions} variant="outline" size="sm">
              <Loader2 className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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

              <div className="flex-1 min-w-[200px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {filterStatus.length === allStatusOptions.length 
                          ? "All Statuses" 
                          : filterStatus.length === 0 
                            ? "No Status Selected"
                            : `${filterStatus.length} Status${filterStatus.length > 1 ? 'es' : ''}`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background" align="start">
                    {allStatusOptions.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={filterStatus.includes(option.value)}
                        onCheckedChange={() => toggleStatusFilter(option.value)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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

              {(filterType !== "all" || filterBestie !== "all" || filterStatus.length !== allStatusOptions.length || filterFrequency !== "all" || searchTerm) && (
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
                          {(() => {
                            const email = (transaction.sponsor_email || transaction.sponsor_profile?.email || '').trim();
                            if (!email) return null;
                            return (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span>{email}</span>
                            </div>
                            );
                          })()}
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFrequencyBadge(transaction.frequency)}
                          {firstTransactionIds.has(transaction.id) && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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
                          {(transaction.stripe_mode === 'test' || transaction.status === 'duplicate' || transaction.status === 'pending') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteIndividualTransaction(
                                transaction.id,
                                transaction.sponsor_profile?.display_name || transaction.sponsor_email || 'this donor',
                                transaction.status === 'duplicate' || transaction.status === 'pending'
                              )}
                              title={
                                transaction.status === 'duplicate' ? 'Delete Duplicate Transaction' : 
                                transaction.status === 'pending' ? 'Delete Pending Transaction' : 
                                'Delete Test Transaction'
                              }
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

      {/* Revenue Chart Dialog */}
      <RevenueChartDialog
        open={revenueChartOpen}
        onOpenChange={setRevenueChartOpen}
        transactions={transactions}
      />

    </div>
  );
};
