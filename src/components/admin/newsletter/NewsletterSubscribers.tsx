import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Upload, Loader2, Info, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SectionLoadingState } from "@/components/common";
import { BulkImportPreview } from "./BulkImportPreview";

interface ParsedRow {
  columns: string[];
}

interface ColumnMapping {
  email: number;
  name: number;
  city: number;
  state: number;
  country: number;
}

const UNMAPPED = -1;

/** Try to auto-detect column mapping from header strings */
function autoDetectMapping(headers: string[]): ColumnMapping {
  const lower = headers.map(h => h.toLowerCase());

  const emailIdx = lower.findIndex(h => h.includes("email") && !h.includes("status"));
  const nameIdx = lower.findIndex(h => h.includes("name") && !h.includes("email"));
  const cityIdx = lower.findIndex(h => h.includes("city"));
  const stateIdx = lower.findIndex(h => h.includes("state") || h.includes("province"));
  const countryIdx = lower.findIndex(h => h.includes("country"));

  return {
    email: emailIdx >= 0 ? emailIdx : UNMAPPED,
    name: nameIdx >= 0 ? nameIdx : UNMAPPED,
    city: cityIdx >= 0 ? cityIdx : UNMAPPED,
    state: stateIdx >= 0 ? stateIdx : UNMAPPED,
    country: countryIdx >= 0 ? countryIdx : UNMAPPED,
  };
}

/** Parse CSV text into rows */
function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const rows: ParsedRow[] = lines.map(line => ({
    columns: line.split(",").map(col => col.trim().replace(/^["']|["']$/g, "")),
  }));

  // Check if first row looks like a header
  const firstRow = rows[0].columns.map(c => c.toLowerCase());
  const looksLikeHeader = firstRow.some(c => c.includes("email") || c.includes("name"));

  return {
    headers: looksLikeHeader ? rows[0].columns : [],
    rows,
  };
}

/** Parse simple text content (from PDF extraction) — expects lines of "Name | Email" or similar */
function parseTextTable(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter: tab, pipe, or multi-space
  const firstLines = lines.slice(0, 5).join("\n");
  let splitRegex: RegExp;
  if (firstLines.includes("\t")) {
    splitRegex = /\t+/;
  } else if (firstLines.includes("|")) {
    splitRegex = /\s*\|\s*/;
  } else {
    // Multi-space separator
    splitRegex = /\s{2,}/;
  }

  const rows: ParsedRow[] = lines.map(line => ({
    columns: line.split(splitRegex).map(col => col.trim()).filter(Boolean),
  }));

  const firstRow = rows[0].columns.map(c => c.toLowerCase());
  const looksLikeHeader = firstRow.some(c => c.includes("email") || c.includes("name"));

  return {
    headers: looksLikeHeader ? rows[0].columns : [],
    rows,
  };
}

/** Extract text from PDF using edge function */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  const { data, error } = await supabase.functions.invoke("extract-pdf-text", {
    body: { pdf_base64: base64 },
  });

  if (error) throw new Error("Failed to extract text from PDF");
  return data?.text || "";
}

export const NewsletterSubscribers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    rows: ParsedRow[];
    headers: string[];
    fileName: string;
    mapping: ColumnMapping;
  } | null>(null);

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      let allSubscribers: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("newsletter_subscribers")
          .select("*")
          .order("subscribed_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allSubscribers = [...allSubscribers, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }

      return allSubscribers;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["newsletter-subscriber-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true });

      const { count: active } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      return { total, active };
    },
  });

  const filteredSubscribers = subscribers?.filter((sub) => {
    const matchesSearch = sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.location_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.location_state?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil((filteredSubscribers?.length || 0) / pageSize);
  const paginatedSubscribers = filteredSubscribers?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    if (!subscribers) return;

    const headers = ["Email", "Status", "City", "State", "Country", "Timezone", "Subscribed At"];
    const csvContent = [
      headers.join(","),
      ...subscribers.map((sub) =>
        [
          sub.email,
          sub.status,
          sub.location_city || "",
          sub.location_state || "",
          sub.location_country || "",
          sub.timezone || "",
          format(new Date(sub.subscribed_at), "yyyy-MM-dd HH:mm:ss"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge>Active</Badge>;
      case "unsubscribed":
        return <Badge variant="secondary">Unsubscribed</Badge>;
      case "bounced":
        return <Badge variant="destructive">Bounced</Badge>;
      case "complained":
        return <Badge variant="destructive">Complained</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);

    try {
      let parsed: { headers: string[]; rows: ParsedRow[] };
      const isPDF = file.name.toLowerCase().endsWith(".pdf");

      if (isPDF) {
        const text = await extractTextFromPDF(file);
        if (!text.trim()) {
          toast.error("Could not extract text from PDF. Try converting to CSV first.");
          return;
        }
        parsed = parseTextTable(text);
      } else {
        const text = await file.text();
        // Check if it's tab/pipe separated vs CSV
        const firstLine = text.split(/\r?\n/)[0] || "";
        if (firstLine.includes("\t") || (firstLine.includes("|") && !firstLine.includes(","))) {
          parsed = parseTextTable(text);
        } else {
          parsed = parseCSV(text);
        }
      }

      if (parsed.rows.length === 0) {
        toast.error("No data found in file");
        return;
      }

      // Auto-detect column mapping
      let mapping: ColumnMapping;
      if (parsed.headers.length > 0) {
        mapping = autoDetectMapping(parsed.headers);
      } else {
        // Try to guess: find column with most emails
        const colCount = parsed.rows[0]?.columns.length || 0;
        let bestEmailCol = UNMAPPED;
        let bestEmailCount = 0;

        for (let c = 0; c < colCount; c++) {
          const emailCount = parsed.rows.filter(r => r.columns[c]?.includes("@")).length;
          if (emailCount > bestEmailCount) {
            bestEmailCount = emailCount;
            bestEmailCol = c;
          }
        }

        mapping = { email: bestEmailCol, name: UNMAPPED, city: UNMAPPED, state: UNMAPPED, country: UNMAPPED };

        // If 2 columns and one is email, the other is likely name
        if (colCount === 2 && bestEmailCol >= 0) {
          mapping.name = bestEmailCol === 0 ? 1 : 0;
        }
      }

      setPreviewData({
        rows: parsed.rows,
        headers: parsed.headers,
        fileName: file.name,
        mapping,
      });
      setPreviewOpen(true);
    } catch (error) {
      console.error("File parse error:", error);
      toast.error("Failed to parse file. Check the format and try again.");
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
            <p className="text-3xl font-bold">{stats?.total || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active Subscribers</p>
            <p className="text-3xl font-bold">{stats?.active || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Retention Rate</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Percentage of subscribers who remain active (haven't unsubscribed)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-3xl font-bold">
              {stats?.total ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or location..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complained</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.txt,.pdf"
          onChange={handleFileSelected}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsingFile}
        >
          {isParsingFile ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Bulk Import
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <SectionLoadingState message="Loading subscribers..." />
      ) : filteredSubscribers?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No subscribers found
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Timezone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedSubscribers?.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{subscriber.email}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(subscriber.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      {subscriber.location_city && subscriber.location_state
                        ? `${subscriber.location_city}, ${subscriber.location_state}`
                        : subscriber.location_country || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{subscriber.timezone || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(subscriber.subscribed_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSubscribers?.length || 0)} of {filteredSubscribers?.length || 0} subscribers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Preview Dialog */}
      {previewData && (
        <BulkImportPreview
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) setPreviewData(null);
          }}
          parsedRows={previewData.rows}
          detectedHeaders={previewData.headers}
          fileName={previewData.fileName}
          initialMapping={previewData.mapping}
        />
      )}
    </div>
  );
};
