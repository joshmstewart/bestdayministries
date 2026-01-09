import { useState, useMemo } from "react";
import { format, startOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths, endOfMonth, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Transaction {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  stripe_mode: string | null;
  started_at: string;
}

interface RevenueChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
}

export function RevenueChartDialog({ open, onOpenChange, transactions }: RevenueChartDialogProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [chartView, setChartView] = useState<"monthly" | "daily" | "cumulative">("monthly");

  // Get live transactions only - now counting all individual successful payments
  const liveTransactions = useMemo(() => 
    transactions.filter(t => 
      t.stripe_mode === 'live' && 
      ['paid', 'completed', 'active', 'succeeded'].includes(t.status?.toLowerCase() || '')
    ),
    [transactions]
  );

  // Generate available months from earliest transaction to now
  const availableMonths = useMemo(() => {
    if (liveTransactions.length === 0) return [];
    
    const dates = liveTransactions.map(t => new Date(t.started_at));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const now = new Date();
    
    const months = eachMonthOfInterval({ start: startOfMonth(earliest), end: now });
    return months.map(m => ({
      value: format(m, "yyyy-MM"),
      label: format(m, "MMMM yyyy")
    })).reverse(); // Most recent first
  }, [liveTransactions]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    if (liveTransactions.length === 0) return [];
    
    const dates = liveTransactions.map(t => new Date(t.started_at));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const now = new Date();
    
    const months = eachMonthOfInterval({ start: startOfMonth(earliest), end: now });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthlyRevenue = liveTransactions
        .filter(t => {
          const date = new Date(t.started_at);
          return date >= monthStart && date <= monthEnd && t.frequency === 'monthly';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      const oneTimeRevenue = liveTransactions
        .filter(t => {
          const date = new Date(t.started_at);
          return date >= monthStart && date <= monthEnd && t.frequency === 'one-time';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        month: format(month, "MMM yyyy"),
        shortMonth: format(month, "MMM"),
        monthly: monthlyRevenue,
        oneTime: oneTimeRevenue,
        total: monthlyRevenue + oneTimeRevenue
      };
    });
  }, [liveTransactions]);

  // Daily chart data - for selected month or all time
  const dailyData = useMemo(() => {
    if (liveTransactions.length === 0) return [];
    
    let days: Date[];
    
    if (selectedMonth === "all" || !selectedMonth) {
      // All time - show all days from earliest to now
      const dates = liveTransactions.map(t => new Date(t.started_at));
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
      const now = new Date();
      days = eachDayOfInterval({ start: earliest, end: now });
    } else {
      // Specific month
      const [year, month] = selectedMonth.split("-").map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = endOfMonth(monthStart);
      days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
    
    return days.map(day => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayRevenue = liveTransactions
        .filter(t => {
          const date = new Date(t.started_at);
          return date >= dayStart && date <= dayEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        day: selectedMonth === "all" ? format(day, "M/d") : format(day, "d"),
        fullDate: format(day, "MMM d, yyyy"),
        revenue: dayRevenue
      };
    });
  }, [liveTransactions, selectedMonth]);

  // Cumulative daily data
  const cumulativeData = useMemo(() => {
    if (!dailyData.length) return [];
    
    let cumulative = 0;
    return dailyData.map(d => {
      cumulative += d.revenue;
      return {
        ...d,
        cumulative
      };
    });
  }, [dailyData]);

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revenue Analytics</DialogTitle>
        </DialogHeader>
        
        <Tabs value={chartView} onValueChange={(v) => setChartView(v as typeof chartView)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="monthly">By Month</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
            </TabsList>
            
            {(chartView === "daily" || chartView === "cumulative") && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {availableMonths.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <TabsContent value="monthly" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="shortMonth" className="text-xs" />
                <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label, payload) => payload[0]?.payload?.month || label}
                />
                <Legend />
                <Bar dataKey="monthly" name="Monthly Subscriptions" fill="hsl(var(--primary))" stackId="stack" />
                <Bar dataKey="oneTime" name="One-Time" fill="hsl(var(--secondary))" stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="daily" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" interval={selectedMonth === "all" ? "preserveStartEnd" : 0} />
                <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="cumulative" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" interval={selectedMonth === "all" ? "preserveStartEnd" : 0} />
                <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  name="Cumulative Revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
