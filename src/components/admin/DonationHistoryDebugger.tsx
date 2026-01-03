import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, CheckCircle2, XCircle, ArrowRight, Database, Cloud, Merge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface DebugItem {
  stripeId: string;
  type: "charge" | "invoice" | "subscription";
  rawStripeData: any;
  relatedData: {
    checkoutSession?: any;
    subscription?: any;
    paymentIntent?: any;
    invoice?: any;
  };
  metadata: {
    fromCharge?: any;
    fromInvoice?: any;
    fromSubscription?: any;
    fromCheckoutSession?: any;
    merged?: any;
  };
  databaseMatches: {
    sponsorship?: any;
    donation?: any;
    sponsorBestie?: any;
  };
  mappingResult: {
    isMarketplace: boolean;
    marketplaceReason?: string;
    isInvoiceBacked: boolean;
    designation: string;
    designationReason: string;
    finalOutput: any;
  };
}

interface DebugResponse {
  email: string;
  stripeMode: string;
  customerId: string;
  summary: {
    totalCharges: number;
    totalInvoices: number;
    totalSubscriptions: number;
    totalCheckoutSessions: number;
    invoiceLinkedCharges: number;
    dbSponsorships: number;
    dbDonations: number;
  };
  items: DebugItem[];
  error?: string;
}

export const DonationHistoryDebugger = () => {
  const [email, setEmail] = useState("");
  const [stripeMode, setStripeMode] = useState<"test" | "live">("live");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const { toast } = useToast();

  const runDebug = async () => {
    if (!email) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("debug-donation-history", {
        body: { email, stripe_mode: stripeMode, limit: 10 },
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "Debug Error", description: data.error, variant: "destructive" });
      }

      setResult(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderJson = (obj: any, maxHeight = "200px") => {
    if (!obj || Object.keys(obj).length === 0) return <span className="text-muted-foreground text-xs">Empty</span>;
    return (
      <pre className={`text-xs bg-muted p-2 rounded overflow-auto`} style={{ maxHeight }}>
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Donation History Debugger</CardTitle>
          <CardDescription>
            Analyze how Stripe data gets mapped to donation history. Shows raw Stripe data, metadata sources, database
            matches, and final output mapping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="debug-email">Email Address</Label>
              <Input
                id="debug-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="w-[120px]">
              <Label>Stripe Mode</Label>
              <Select value={stripeMode} onValueChange={(v) => setStripeMode(v as "test" | "live")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runDebug} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Debug
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Customer</div>
                  <div className="font-mono text-xs">{result.customerId}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Stripe Mode</div>
                  <Badge variant={result.stripeMode === "live" ? "default" : "secondary"}>{result.stripeMode}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mt-4 text-center">
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.totalCharges}</div>
                  <div className="text-xs text-muted-foreground">Charges</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.totalInvoices}</div>
                  <div className="text-xs text-muted-foreground">Invoices</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.totalSubscriptions}</div>
                  <div className="text-xs text-muted-foreground">Subscriptions</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.totalCheckoutSessions}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.invoiceLinkedCharges}</div>
                  <div className="text-xs text-muted-foreground">Inv-Linked</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.dbSponsorships}</div>
                  <div className="text-xs text-muted-foreground">DB Sponsor</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-lg font-bold">{result.summary.dbDonations}</div>
                  <div className="text-xs text-muted-foreground">DB Donations</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <div className="space-y-4">
            {result.items.map((item) => (
              <Card key={item.stripeId} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === "charge" ? "outline" : "default"}>
                        {item.type.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-sm">{item.stripeId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.mappingResult.isMarketplace && <Badge variant="destructive">Marketplace</Badge>}
                      {item.mappingResult.isInvoiceBacked && item.type === "charge" && (
                        <Badge variant="secondary">Invoice-Backed</Badge>
                      )}
                      <Badge
                        variant={
                          item.mappingResult.finalOutput.status === "INCLUDED" ? "default" : "secondary"
                        }
                      >
                        {item.mappingResult.finalOutput.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {/* Raw Stripe Data */}
                    <AccordionItem value="stripe">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Raw Stripe Data
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>{renderJson(item.rawStripeData)}</AccordionContent>
                    </AccordionItem>

                    {/* Related Data */}
                    {Object.keys(item.relatedData).length > 0 && (
                      <AccordionItem value="related">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Related Stripe Objects
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>{renderJson(item.relatedData)}</AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Metadata */}
                    <AccordionItem value="metadata">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Merge className="h-4 w-4" />
                          Metadata (Sources & Merged)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">From Charge</h4>
                            {renderJson(item.metadata.fromCharge, "100px")}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">From Invoice</h4>
                            {renderJson(item.metadata.fromInvoice, "100px")}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">From Subscription</h4>
                            {renderJson(item.metadata.fromSubscription, "100px")}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">From Checkout Session</h4>
                            {renderJson(item.metadata.fromCheckoutSession, "100px")}
                          </div>
                        </div>
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">
                            Merged Metadata (used for mapping)
                          </h4>
                          {renderJson(item.metadata.merged)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Database Matches */}
                    <AccordionItem value="database">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Database Matches
                          {item.databaseMatches.sponsorship && (
                            <Badge variant="outline" className="ml-2">
                              Sponsorship Found
                            </Badge>
                          )}
                          {item.databaseMatches.donation && (
                            <Badge variant="outline" className="ml-2">
                              Donation Found
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Sponsorship Record</h4>
                            {item.databaseMatches.sponsorship ? (
                              renderJson(item.databaseMatches.sponsorship)
                            ) : (
                              <span className="text-xs text-muted-foreground">No matching sponsorship</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Donation Record</h4>
                            {item.databaseMatches.donation ? (
                              renderJson(item.databaseMatches.donation)
                            ) : (
                              <span className="text-xs text-muted-foreground">No matching donation</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Sponsor Bestie</h4>
                            {item.databaseMatches.sponsorBestie ? (
                              <div className="text-sm">
                                <span className="font-medium">{item.databaseMatches.sponsorBestie.name}</span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  ({item.databaseMatches.sponsorBestie.id})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No sponsor bestie</span>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Mapping Result */}
                    <AccordionItem value="result">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          {item.mappingResult.finalOutput.status === "INCLUDED" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          Final Mapping Result
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Marketplace:</span>
                              {item.mappingResult.isMarketplace ? (
                                <Badge variant="destructive">Yes</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Invoice-Backed:</span>
                              {item.mappingResult.isInvoiceBacked ? (
                                <Badge variant="secondary">Yes</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Designation</h4>
                            <div className="text-sm font-medium">{item.mappingResult.designation}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.mappingResult.designationReason}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Final Output</h4>
                            {renderJson(item.mappingResult.finalOutput)}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
