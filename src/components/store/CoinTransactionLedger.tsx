import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinIcon } from "@/components/CoinIcon";
import { format } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface CoinTransaction {
  id: string;
  amount: number;
  description: string;
  transaction_type: string;
  created_at: string;
}

interface CoinTransactionLedgerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

export const CoinTransactionLedger = ({
  open,
  onOpenChange,
  currentBalance,
}: CoinTransactionLedgerProps) => {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalEarned = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CoinIcon size={24} />
            Coin Ledger
          </DialogTitle>
          <DialogDescription>
            Your complete transaction history
          </DialogDescription>
        </DialogHeader>

        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-4 text-center border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 flex items-center justify-center gap-1">
              <CoinIcon size={20} />
              {currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
            <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
              <ArrowUpCircle className="h-5 w-5" />
              {totalEarned.toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
            <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
              <ArrowDownCircle className="h-5 w-5" />
              {totalSpent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Transaction Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-[100px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No transactions yet. Start earning coins!
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), "MMM d, yyyy")}
                      <br />
                      <span className="text-xs">
                        {format(new Date(transaction.created_at), "h:mm a")}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          transaction.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.amount > 0 ? (
                          <ArrowUpCircle className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4" />
                        )}
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
