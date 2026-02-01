import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Search, Coins } from "lucide-react";

interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  related_item_id: string | null;
  metadata: unknown;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

export const CoinTransactionsManager = () => {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stats, setStats] = useState({ totalEarned: 0, totalSpent: 0, transactionCount: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch stats and transactions in parallel
    const [statsResult, transactionsResult] = await Promise.all([
      supabase.rpc("get_coin_transaction_stats"),
      supabase
        .from("coin_transactions")
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500)
    ]);

    // Handle stats from RPC
    if (statsResult.error) {
      console.error("Error fetching stats:", statsResult.error);
    } else if (statsResult.data && statsResult.data[0]) {
      setStats({
        transactionCount: Number(statsResult.data[0].total_count) || 0,
        totalEarned: Number(statsResult.data[0].total_earned) || 0,
        totalSpent: Number(statsResult.data[0].total_spent) || 0
      });
    }

    // Handle transactions for table
    if (transactionsResult.error) {
      console.error("Error fetching transactions:", transactionsResult.error);
    } else {
      setTransactions(transactionsResult.data || []);
    }
    
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === "" || 
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || tx.transaction_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(transactions.map(t => t.transaction_type))];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              {stats.transactionCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Coins Earned</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-green-600">
              <ArrowUpCircle className="h-5 w-5" />
              +{stats.totalEarned.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Coins Spent</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
              <ArrowDownCircle className="h-5 w-5" />
              -{stats.totalSpent.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Coin Transactions</CardTitle>
          <CardDescription>View all coin shop transactions across users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {tx.profiles?.display_name || "Unknown User"}
                          </span>
                          {tx.profiles?.email && (
                            <span className="text-xs text-muted-foreground">
                              {tx.profiles.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.transaction_type === "earned" ? "default" : "secondary"}>
                          {tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={tx.amount > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing {filteredTransactions.length} of {transactions.length} transactions (last 500)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
