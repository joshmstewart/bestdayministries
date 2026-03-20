import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

interface BulkImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedRows: ParsedRow[];
  detectedHeaders: string[];
  fileName: string;
  initialMapping: ColumnMapping;
}

const UNMAPPED = -1;

const stateTimezones: Record<string, string> = {
  CT: "America/New_York", DE: "America/New_York", FL: "America/New_York", GA: "America/New_York",
  IN: "America/New_York", KY: "America/New_York", ME: "America/New_York", MD: "America/New_York",
  MA: "America/New_York", MI: "America/New_York", NH: "America/New_York", NJ: "America/New_York",
  NY: "America/New_York", NC: "America/New_York", OH: "America/New_York", PA: "America/New_York",
  RI: "America/New_York", SC: "America/New_York", VT: "America/New_York", VA: "America/New_York",
  WV: "America/New_York", DC: "America/New_York",
  AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago",
  KS: "America/Chicago", LA: "America/Chicago", MN: "America/Chicago", MS: "America/Chicago",
  MO: "America/Chicago", NE: "America/Chicago", ND: "America/Chicago", OK: "America/Chicago",
  SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", WI: "America/Chicago",
  AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Denver", MT: "America/Denver",
  NM: "America/Denver", UT: "America/Denver", WY: "America/Denver",
  CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};

const provinceTimezones: Record<string, string> = {
  ON: "America/Toronto", QC: "America/Montreal", BC: "America/Vancouver",
  AB: "America/Edmonton", MB: "America/Winnipeg", SK: "America/Regina",
  NS: "America/Halifax", NB: "America/Moncton", NL: "America/St_Johns",
  PE: "America/Halifax", YT: "America/Whitehorse", NT: "America/Yellowknife", NU: "America/Iqaluit",
};

const stateNameMap: Record<string, string> = {
  CALIFORNIA: "CA", TEXAS: "TX", FLORIDA: "FL", "NEW YORK": "NY", COLORADO: "CO",
  WASHINGTON: "WA", OREGON: "OR", ARIZONA: "AZ", NEVADA: "NV", UTAH: "UT",
  ONTARIO: "ON", QUEBEC: "QC", "BRITISH COLUMBIA": "BC", ALBERTA: "AB",
};

function deriveTimezone(state?: string): string | undefined {
  if (!state) return undefined;
  const upper = state.toUpperCase().trim();
  if (stateTimezones[upper]) return stateTimezones[upper];
  if (provinceTimezones[upper]) return provinceTimezones[upper];
  const abbrev = stateNameMap[upper];
  if (abbrev) return stateTimezones[abbrev] || provinceTimezones[abbrev];
  return undefined;
}

export const BulkImportPreview = ({
  open,
  onOpenChange,
  parsedRows,
  detectedHeaders,
  fileName,
  initialMapping,
}: BulkImportPreviewProps) => {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);
  const [isImporting, setIsImporting] = useState(false);
  const [existingEmails, setExistingEmails] = useState<Set<string> | null>(null);
  const queryClient = useQueryClient();

  // Load existing emails once dialog opens
  useState(() => {
    if (open && !existingEmails) {
      supabase
        .from("newsletter_subscribers")
        .select("email")
        .then(({ data }) => {
          setExistingEmails(new Set(data?.map(e => e.email.toLowerCase()) || []));
        });
    }
  });

  const dataRows = useMemo(() => {
    // Skip header row if headers were detected
    const hasHeaders = detectedHeaders.length > 0 && detectedHeaders.some(h => h.toLowerCase().includes("email") || h.toLowerCase().includes("name"));
    return hasHeaders ? parsedRows.slice(1) : parsedRows;
  }, [parsedRows, detectedHeaders]);

  const extractedSubscribers = useMemo(() => {
    if (mapping.email === UNMAPPED) return [];

    return dataRows
      .map(row => {
        const email = row.columns[mapping.email]?.trim().toLowerCase();
        if (!email || !email.includes("@")) return null;

        const name = mapping.name !== UNMAPPED ? row.columns[mapping.name]?.trim() : undefined;
        const city = mapping.city !== UNMAPPED ? row.columns[mapping.city]?.trim() : undefined;
        const state = mapping.state !== UNMAPPED ? row.columns[mapping.state]?.trim() : undefined;
        const country = mapping.country !== UNMAPPED ? row.columns[mapping.country]?.trim() : undefined;
        const timezone = deriveTimezone(state);

        return { email, name, city, state, country, timezone };
      })
      .filter(Boolean) as Array<{
        email: string;
        name?: string;
        city?: string;
        state?: string;
        country?: string;
        timezone?: string;
      }>;
  }, [dataRows, mapping]);

  const duplicateCount = useMemo(() => {
    if (!existingEmails) return 0;
    return extractedSubscribers.filter(s => existingEmails.has(s.email)).length;
  }, [extractedSubscribers, existingEmails]);

  const newSubscribers = useMemo(() => {
    if (!existingEmails) return extractedSubscribers;
    return extractedSubscribers.filter(s => !existingEmails.has(s.email));
  }, [extractedSubscribers, existingEmails]);

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value === "none" ? UNMAPPED : parseInt(value) }));
  };

  const handleImport = async () => {
    if (newSubscribers.length === 0) {
      toast.info("No new subscribers to import");
      return;
    }

    setIsImporting(true);
    try {
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < newSubscribers.length; i += batchSize) {
        const batch = newSubscribers.slice(i, i + batchSize).map(sub => ({
          email: sub.email,
          status: "active" as const,
          source: "bulk_import",
          location_city: sub.city || null,
          location_state: sub.state || null,
          location_country: sub.country || null,
          timezone: sub.timezone || null,
        }));

        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert(batch);

        if (error) throw error;
        inserted += batch.length;
      }

      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscriber-stats"] });

      toast.success(`Added ${inserted} new subscribers`, {
        description: duplicateCount > 0 ? `${duplicateCount} duplicates skipped` : undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Bulk import error:", error);
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscriber-stats"] });
      toast.error("Import encountered an issue - some subscribers may have been added");
    } finally {
      setIsImporting(false);
    }
  };

  const columnOptions = detectedHeaders.length > 0
    ? detectedHeaders.map((h, i) => ({ label: h || `Column ${i + 1}`, value: i.toString() }))
    : (parsedRows[0]?.columns || []).map((_, i) => ({ label: `Column ${i + 1}`, value: i.toString() }));

  const previewRows = dataRows.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Preview
          </DialogTitle>
          <DialogDescription>
            Review detected data from <span className="font-medium">{fileName}</span> before importing
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{extractedSubscribers.length}</p>
            <p className="text-xs text-muted-foreground">Emails found</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{newSubscribers.length}</p>
            <p className="text-xs text-muted-foreground">New to import</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{duplicateCount}</p>
            <p className="text-xs text-muted-foreground">Already exist</p>
          </Card>
        </div>

        {/* Column Mapping */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Column Mapping</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(["email", "name", "city", "state", "country"] as const).map(field => (
              <div key={field} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">
                  {field} {field === "email" && <span className="text-destructive">*</span>}
                </label>
                <Select
                  value={mapping[field] === UNMAPPED ? "none" : mapping[field].toString()}
                  onValueChange={(v) => handleMappingChange(field, v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Not mapped —</SelectItem>
                    {columnOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Table */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Preview ({Math.min(previewRows.length, 8)} of {dataRows.length} rows)
          </h4>
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  {mapping.name !== UNMAPPED && (
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                  )}
                  {mapping.city !== UNMAPPED && (
                    <th className="px-3 py-2 text-left font-medium">City</th>
                  )}
                  {mapping.state !== UNMAPPED && (
                    <th className="px-3 py-2 text-left font-medium">State</th>
                  )}
                  {mapping.country !== UNMAPPED && (
                    <th className="px-3 py-2 text-left font-medium">Country</th>
                  )}
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewRows.map((row, i) => {
                  const email = mapping.email !== UNMAPPED ? row.columns[mapping.email]?.trim().toLowerCase() : "";
                  const isValid = email && email.includes("@");
                  const isDuplicate = isValid && existingEmails?.has(email);

                  return (
                    <tr key={i} className={isDuplicate ? "bg-amber-50/50" : isValid ? "" : "bg-red-50/50"}>
                      <td className="px-3 py-2 font-mono">{email || "—"}</td>
                      {mapping.name !== UNMAPPED && (
                        <td className="px-3 py-2">{row.columns[mapping.name]?.trim() || "—"}</td>
                      )}
                      {mapping.city !== UNMAPPED && (
                        <td className="px-3 py-2">{row.columns[mapping.city]?.trim() || "—"}</td>
                      )}
                      {mapping.state !== UNMAPPED && (
                        <td className="px-3 py-2">{row.columns[mapping.state]?.trim() || "—"}</td>
                      )}
                      {mapping.country !== UNMAPPED && (
                        <td className="px-3 py-2">{row.columns[mapping.country]?.trim() || "—"}</td>
                      )}
                      <td className="px-3 py-2">
                        {!isValid ? (
                          <Badge variant="destructive" className="text-[10px]">Invalid</Badge>
                        ) : isDuplicate ? (
                          <Badge variant="secondary" className="text-[10px]">Exists</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-green-600">New</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warnings */}
        {mapping.email === UNMAPPED && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            No email column mapped — please select which column contains email addresses.
          </div>
        )}

        {newSubscribers.length > 0 && mapping.email !== UNMAPPED && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md p-3">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Ready to import {newSubscribers.length} new subscriber{newSubscribers.length !== 1 ? "s" : ""}.
            {duplicateCount > 0 && ` ${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""} will be skipped.`}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || mapping.email === UNMAPPED || newSubscribers.length === 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${newSubscribers.length} Subscriber${newSubscribers.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
