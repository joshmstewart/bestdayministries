import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, RefreshCw, Eye, Package, Truck, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ShippingLog {
  id: string;
  created_at: string;
  user_id: string | null;
  session_id: string | null;
  order_id: string | null;
  destination_zip: string | null;
  origin_zip: string | null;
  items: unknown;
  total_weight_oz: number | null;
  box_dimensions: unknown;
  calculation_source: string;
  carrier: string | null;
  service_name: string | null;
  decision_reason: string | null;
  fallback_used: boolean | null;
  fallback_reason: string | null;
  rate_cents: number | null;
  estimated_days: number | null;
  api_request: unknown;
  api_response: unknown;
  api_error: string | null;
  calculation_time_ms: number | null;
}

const sourceColors: Record<string, string> = {
  shipstation: "bg-blue-500",
  easypost: "bg-purple-500",
  flat_rate: "bg-amber-500",
  free_shipping: "bg-green-500",
};

const carrierColors: Record<string, string> = {
  usps: "bg-blue-600",
  ups: "bg-amber-600",
  fedex: "bg-purple-600",
  dhl: "bg-red-600",
};

export function ShippingCalculationLog() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ShippingLog | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["shipping-calculation-logs", sourceFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("shipping_calculation_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (sourceFilter !== "all") {
        query = query.eq("calculation_source", sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShippingLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.destination_zip?.includes(searchLower) ||
      log.origin_zip?.includes(searchLower) ||
      log.carrier?.toLowerCase().includes(searchLower) ||
      log.service_name?.toLowerCase().includes(searchLower) ||
      log.decision_reason?.toLowerCase().includes(searchLower)
    );
  });

  const formatCents = (cents: number | null) => {
    if (cents === null) return "—";
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Calculation Log
            </CardTitle>
            <CardDescription>
              Audit trail for all shipping rate calculations across the platform
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ZIP, carrier, service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="shipstation">ShipStation</SelectItem>
              <SelectItem value="easypost">EasyPost</SelectItem>
              <SelectItem value="flat_rate">Flat Rate</SelectItem>
              <SelectItem value="free_shipping">Free Shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !filteredLogs?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No shipping calculations logged yet</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Carrier / Service</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Time (ms)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(log.created_at), "M/d/yy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {log.origin_zip || "?"} → {log.destination_zip || "?"}
                        </div>
                        {log.total_weight_oz && (
                          <div className="text-xs text-muted-foreground">
                            {log.total_weight_oz} oz
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${sourceColors[log.calculation_source] || "bg-gray-500"} text-white`}
                        >
                          {log.calculation_source}
                        </Badge>
                        {log.fallback_used && (
                          <Badge variant="outline" className="ml-1 text-amber-600 border-amber-600">
                            fallback
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.carrier && (
                          <Badge
                            variant="outline"
                            className={`${carrierColors[log.carrier.toLowerCase()] || "bg-gray-500"} text-white border-0`}
                          >
                            {log.carrier.toUpperCase()}
                          </Badge>
                        )}
                        {log.service_name && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.service_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCents(log.rate_cents)}
                        </div>
                        {log.estimated_days && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.estimated_days}d
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.calculation_time_ms !== null ? (
                          <span className={log.calculation_time_ms > 2000 ? "text-amber-600" : ""}>
                            {log.calculation_time_ms}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} - {page * pageSize + (filteredLogs?.length || 0)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(filteredLogs?.length || 0) < pageSize}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Calculation Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Time</div>
                      <div className="font-medium">
                        {format(new Date(selectedLog.created_at), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Source</div>
                      <Badge className={`${sourceColors[selectedLog.calculation_source] || "bg-gray-500"} text-white`}>
                        {selectedLog.calculation_source}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                      <div className="font-medium text-lg">
                        {formatCents(selectedLog.rate_cents)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Calc Time</div>
                      <div className="font-medium">
                        {selectedLog.calculation_time_ms ?? "—"} ms
                      </div>
                    </div>
                  </div>

                  {/* Route & Package */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Route & Package</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Origin ZIP:</span>{" "}
                        <span className="font-mono">{selectedLog.origin_zip || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Destination ZIP:</span>{" "}
                        <span className="font-mono">{selectedLog.destination_zip || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Weight:</span>{" "}
                        {selectedLog.total_weight_oz ? `${selectedLog.total_weight_oz} oz` : "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Box:</span>{" "}
                        {selectedLog.box_dimensions
                          ? JSON.stringify(selectedLog.box_dimensions)
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Carrier & Decision */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Carrier & Decision</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Carrier:</span>{" "}
                        {selectedLog.carrier?.toUpperCase() || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Service:</span>{" "}
                        {selectedLog.service_name || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Days:</span>{" "}
                        {selectedLog.estimated_days ?? "—"}
                      </div>
                      {selectedLog.decision_reason && (
                        <div>
                          <span className="text-muted-foreground">Decision Reason:</span>{" "}
                          {selectedLog.decision_reason}
                        </div>
                      )}
                      {selectedLog.fallback_used && (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          Fallback used: {selectedLog.fallback_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  {selectedLog.items && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Items</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(selectedLog.items, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* API Request/Response */}
                  {(selectedLog.api_request || selectedLog.api_response || selectedLog.api_error) && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">API Details</h4>
                      {selectedLog.api_error && (
                        <div className="mb-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                          Error: {selectedLog.api_error}
                        </div>
                      )}
                      {selectedLog.api_request && (
                        <div className="mb-2">
                          <div className="text-xs text-muted-foreground mb-1">Request:</div>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(selectedLog.api_request, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.api_response && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Response:</div>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(selectedLog.api_response, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* IDs */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Log ID: {selectedLog.id}</div>
                    {selectedLog.user_id && <div>User ID: {selectedLog.user_id}</div>}
                    {selectedLog.order_id && <div>Order ID: {selectedLog.order_id}</div>}
                    {selectedLog.session_id && <div>Session: {selectedLog.session_id}</div>}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
