import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface SentSummary {
  id: string;
  user_email: string;
  user_name: string | null;
  tax_year: number;
  total_amount: number;
  sent_at: string;
  resend_email_id: string | null;
  status: string;
}

export function YearEndSummarySentHistory() {
  const [summaries, setSummaries] = useState<SentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadSentHistory();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("year_end_summary_sent_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "year_end_summary_sent",
        },
        () => {
          loadSentHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("year_end_summary_sent")
        .select("*")
        .order("sent_at", { ascending: false });

      if (error) throw error;
      setSummaries(data || []);
    } catch (error: any) {
      console.error("Error loading sent history:", error);
      toast({
        title: "Error",
        description: "Failed to load sent email history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const filteredData = getFilteredSummaries();
    const csv = [
      ["Email", "Name", "Tax Year", "Total Amount", "Sent Date", "Status"],
      ...filteredData.map((s) => [
        s.user_email,
        s.user_name || "N/A",
        s.tax_year,
        `$${parseFloat(s.total_amount.toString()).toFixed(2)}`,
        format(new Date(s.sent_at), "MMM d, yyyy h:mm a"),
        s.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `year-end-summaries-${selectedYear === "all" ? "all" : selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredSummaries = () => {
    return summaries.filter((summary) => {
      const matchesSearch =
        searchTerm === "" ||
        summary.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.user_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesYear =
        selectedYear === "all" || summary.tax_year.toString() === selectedYear;

      return matchesSearch && matchesYear;
    });
  };

  const availableYears = Array.from(
    new Set(summaries.map((s) => s.tax_year))
  ).sort((a, b) => b - a);

  const filteredSummaries = getFilteredSummaries();
  const totalSent = filteredSummaries.length;
  const totalAmount = filteredSummaries.reduce(
    (sum, s) => sum + parseFloat(s.total_amount.toString()),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sent Year-End Summaries</CardTitle>
        <CardDescription>
          View all sent year-end tax summary emails and export records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Sent:</span>{" "}
            <span className="font-semibold">{totalSent}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Amount:</span>{" "}
            <span className="font-semibold">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {filteredSummaries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sent summaries found
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-mono text-sm">
                      {summary.user_email}
                    </TableCell>
                    <TableCell>{summary.user_name || "N/A"}</TableCell>
                    <TableCell>{summary.tax_year}</TableCell>
                    <TableCell>
                      ${parseFloat(summary.total_amount.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(summary.sent_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          summary.status === "sent" ? "default" : "secondary"
                        }
                      >
                        {summary.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}