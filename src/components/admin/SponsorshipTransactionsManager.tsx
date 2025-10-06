import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ExternalLink, DollarSign, Calendar, User, Mail, X, Copy, FileText } from "lucide-react";
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

interface Sponsorship {
  id: string;
  sponsor_id: string | null;
  sponsor_email: string | null;
  bestie_id: string | null;
  sponsor_bestie_id: string;
  amount: number;
  frequency: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_mode: string | null;
  started_at: string;
  ended_at: string | null;
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
  const [sponsorships, setSponshorships] = useState<Sponsorship[]>([]);
  const [filteredSponshorships, setFilteredSponshorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBestie, setFilterBestie] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrequency, setFilterFrequency] = useState<string>("all");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSponshorships();
  }, []);

  useEffect(() => {
    filterSponshorships();
  }, [searchTerm, sponsorships, filterBestie, filterStatus, filterFrequency]);

  const loadSponshorships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sponsorships')
        .select(`
          *,
          sponsor_profile:profiles!sponsorships_sponsor_id_fkey(display_name, avatar_url),
          bestie_profile:profiles!sponsorships_bestie_id_fkey(display_name, avatar_url),
          sponsor_bestie:sponsor_besties(bestie_name)
        `)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSponshorships(data || []);
    } catch (error: any) {
      console.error('Error loading sponsorships:', error);
      toast({
        title: "Error",
        description: "Failed to load sponsorships",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSponshorships = () => {
    let filtered = [...sponsorships];

    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const sponsorName = s.sponsor_profile?.display_name?.toLowerCase() || '';
        const sponsorEmail = s.sponsor_email?.toLowerCase() || '';
        const bestieName = s.sponsor_bestie?.bestie_name?.toLowerCase() || 
                           s.bestie_profile?.display_name?.toLowerCase() || '';
        const subscriptionId = s.stripe_subscription_id?.toLowerCase() || '';
        
        return sponsorName.includes(term) ||
               sponsorEmail.includes(term) ||
               bestieName.includes(term) ||
               subscriptionId.includes(term);
      });
    }

    // Apply bestie filter
    if (filterBestie !== "all") {
      filtered = filtered.filter(s => 
        s.sponsor_bestie_id === filterBestie
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      if (filterStatus === "scheduled_cancel") {
        filtered = filtered.filter(s => s.status === 'active' && s.ended_at);
      } else {
        filtered = filtered.filter(s => s.status === filterStatus);
      }
    }

    // Apply frequency filter
    if (filterFrequency !== "all") {
      filtered = filtered.filter(s => s.frequency === filterFrequency);
    }

    setFilteredSponshorships(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBestie("all");
    setFilterStatus("all");
    setFilterFrequency("all");
  };

  // Get unique besties for filter dropdown
  const uniqueBesties = Array.from(
    new Map(
      sponsorships
        .filter(s => s.sponsor_bestie)
        .map(s => [s.sponsor_bestie_id, s.sponsor_bestie?.bestie_name])
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

  // Calculate stats
  const stats = {
    total: sponsorships.length,
    active: sponsorships.filter(s => s.status === 'active').length,
    cancelled: sponsorships.filter(s => s.status === 'cancelled').length,
    totalMonthlyRevenue: sponsorships
      .filter(s => s.status === 'active' && s.frequency === 'monthly')
      .reduce((sum, s) => sum + s.amount, 0),
    totalOneTime: sponsorships
      .filter(s => s.frequency === 'one-time')
      .reduce((sum, s) => sum + s.amount, 0),
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
            <CardDescription>Total Sponsorships</CardDescription>
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
              <CardTitle>Sponsorship Transactions</CardTitle>
              <CardDescription>
                View and manage all sponsorship payments and subscriptions
              </CardDescription>
            </div>
            <Button onClick={loadSponshorships} variant="outline" size="sm">
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
                placeholder="Search by sponsor name, email, bestie name, or subscription ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
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

              {(filterBestie !== "all" || filterStatus !== "all" || filterFrequency !== "all" || searchTerm) && (
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
                  <TableHead>Sponsor</TableHead>
                  <TableHead>Bestie</TableHead>
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
                {filteredSponshorships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No sponsorships match your search' : 'No sponsorships yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSponshorships.map((sponsorship) => (
                    <TableRow key={sponsorship.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {sponsorship.sponsor_profile?.display_name || 'Guest'}
                            </span>
                          </div>
                          {sponsorship.sponsor_email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span>{sponsorship.sponsor_email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {sponsorship.sponsor_bestie?.bestie_name || 
                           sponsorship.bestie_profile?.display_name || 
                           'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{formatAmount(sponsorship.amount)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getFrequencyBadge(sponsorship.frequency)}</TableCell>
                      <TableCell>{getStatusBadge(sponsorship.status, sponsorship.ended_at)}</TableCell>
                      <TableCell>{getModeBadge(sponsorship.stripe_mode)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(sponsorship.started_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sponsorship.ended_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sponsorship.stripe_subscription_id && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransactionId(sponsorship.stripe_subscription_id);
                                  setTransactionDialogOpen(true);
                                }}
                                title="View Transaction ID"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openStripeSubscription(
                                  sponsorship.stripe_subscription_id!,
                                  sponsorship.stripe_mode || 'test'
                                )}
                                title="Open in Stripe Dashboard"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </>
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
