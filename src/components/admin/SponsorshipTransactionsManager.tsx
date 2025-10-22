import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ExternalLink, DollarSign, Calendar, User, Mail, X, Copy, FileText, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
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
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
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
        .select('sponsorship_id, receipt_number, created_at')
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
      
      // Create receipts map by sponsorship_id
      const receiptsMap: Record<string, { receipt_number: string, created_at: string }> = {};
      if (receiptsData) {
        receiptsData.forEach(r => {
          if (r.sponsorship_id) {
            receiptsMap[r.sponsorship_id] = {
              receipt_number: r.receipt_number,
              created_at: r.created_at
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
          .select('id, display_name, avatar_url')
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
        const receipt = receiptsMap[d.id];
        return {
          id: d.id,
          sponsor_id: d.donor_id,
          sponsor_email: d.donor_email,
          bestie_id: null,
          sponsor_bestie_id: null,
          amount: d.amount,
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
      toast({
        title: "Error",
        description: "Failed to delete test transactions",
        variant: "destructive",
      });
    }
  };

  const deleteIndividualTransaction = async (transactionId: string, donorName: string) => {
    if (!confirm(`Are you sure you want to delete the test transaction for ${donorName}? This cannot be undone.`)) {
      return;
    }

    try {
      // Try to delete from sponsorships first
      const { error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .delete()
        .eq('id', transactionId);

      // If not found in sponsorships, try donations
      if (sponsorshipsError) {
        const { error: donationsError } = await supabase
          .from('donations')
          .delete()
          .eq('id', transactionId);
        
        if (donationsError) throw donationsError;
      }

      toast({
        title: "Success",
        description: "Test transaction has been deleted",
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

  const loadAuditLogs = async (sponsorshipId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('receipt_generation_logs')
        .select('*')
        .eq('sponsorship_id', sponsorshipId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAuditLogs(data || []);
      setSelectedSponsorshipId(sponsorshipId);
      setAuditLogsOpen(true);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({ 
        title: "Failed to load audit logs", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoadingLogs(false);
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
                          {/* Receipt Status */}
                          {transaction.receipt_number ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransactionId(transaction.receipt_number);
                                setTransactionDialogOpen(true);
                              }}
                              title={`Receipt: ${transaction.receipt_number}`}
                              className="text-green-600"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          ) : (transaction.status === 'active' || transaction.status === 'completed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              title="No receipt generated"
                              className="text-yellow-600"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Audit Logs */}
                          {transaction.transaction_type === 'sponsorship' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadAuditLogs(transaction.id)}
                              title="View Receipt Generation Logs"
                              disabled={loadingLogs}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          
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
                          {transaction.stripe_mode === 'test' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteIndividualTransaction(
                                transaction.id,
                                transaction.sponsor_profile?.display_name || transaction.sponsor_email || 'this donor'
                              )}
                              title="Delete Test Transaction"
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
            <DialogTitle>Receipt Generation Audit Log</DialogTitle>
            <DialogDescription>
              Detailed log of all stages in the receipt generation process
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px] pr-4">
            {loadingLogs ? (
              <div className="flex items-center justify-center p-8">
                <Clock className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading logs...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No audit logs found for this transaction
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <Card key={log.id} className={log.status === 'failure' ? 'border-destructive' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getStageIcon(log.stage, log.status)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{getStageName(log.stage)}</h4>
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                          {log.error_message && (
                            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                              <strong>Error:</strong> {log.error_message}
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                                View metadata
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
    </div>
  );
};
