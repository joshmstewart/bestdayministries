import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import joycoinImage from "@/assets/joycoin.png";

export const CoinsManager = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['users-coins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, coins')
        .order('coins', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['coin-transactions', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', selectedUser)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser,
  });

  const handleAwardCoins = async (userId: string, coinsAmount: number) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!profile) throw new Error('User not found');

      const newBalance = (profile.coins || 0) + coinsAmount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: newBalance })
        .eq('id', userId);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: coinsAmount,
          transaction_type: coinsAmount > 0 ? 'admin_award' : 'admin_deduct',
          description: description || `Admin ${coinsAmount > 0 ? 'awarded' : 'deducted'} coins`,
        });

      if (txError) throw txError;

      toast({
        title: "Success",
        description: `${Math.abs(coinsAmount)} coins ${coinsAmount > 0 ? 'awarded' : 'deducted'}`,
      });

      setAmount("");
      setDescription("");
      setSelectedUser(null);
      refetchUsers();
    } catch (error) {
      console.error('Error managing coins:', error);
      toast({
        title: "Error",
        description: "Failed to update coins",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src={joycoinImage} alt="JoyCoin" className="h-5 w-5" />
            User Coins Management
          </CardTitle>
          <CardDescription>
            View and manage user coin balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.display_name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-right font-semibold">{user.coins?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedUser(user.id)}
                        >
                          <img src={joycoinImage} alt="JoyCoin" className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manage Coins for {user.display_name}</DialogTitle>
                          <DialogDescription>
                            Current balance: {user.coins?.toLocaleString()} coins
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="Enter amount"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              placeholder="Reason for adjustment (optional)"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAwardCoins(user.id, parseInt(amount))}
                              disabled={!amount || parseInt(amount) <= 0}
                              className="flex-1"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Award Coins
                            </Button>
                            <Button
                              onClick={() => handleAwardCoins(user.id, -parseInt(amount))}
                              disabled={!amount || parseInt(amount) <= 0}
                              variant="destructive"
                              className="flex-1"
                            >
                              <Minus className="h-4 w-4 mr-2" />
                              Deduct Coins
                            </Button>
                          </div>
                        </div>

                        {selectedUser === user.id && transactions && transactions.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <History className="h-4 w-4" />
                              Recent Transactions
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {transactions.map((tx) => (
                                <div key={tx.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                                  <div>
                                    <p className="font-medium">{tx.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(tx.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                  <span className={tx.amount > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
