import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Trash2, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface DuplicateGroup {
  stripe_id: string;
  stripe_id_type: 'subscription_id' | 'payment_intent_id' | 'checkout_session_id';
  donations: Array<{
    id: string;
    donor_email: string;
    donor_id: string | null;
    amount: number;
    frequency: string;
    status: string;
    stripe_mode: string | null;
    created_at: string;
  }>;
  sponsorships: Array<{
    id: string;
    sponsor_email: string;
    sponsor_id: string | null;
    bestie_id: string | null;
    sponsor_bestie_id: string | null;
    amount: number;
    frequency: string;
    status: string;
    stripe_mode: string | null;
    created_at: string;
  }>;
}

export function DuplicateTransactionsDetector() {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState<{
    type: 'donation' | 'sponsorship';
    id: string;
    stripeId: string;
  } | null>(null);

  const detectDuplicates = async () => {
    setLoading(true);
    try {
      // Fetch all donations and sponsorships with Stripe IDs
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, donor_email, donor_id, amount, frequency, status, stripe_mode, created_at, stripe_subscription_id, stripe_payment_intent_id, stripe_checkout_session_id')
        .order('created_at', { ascending: true });

      if (donationsError) throw donationsError;

      const { data: sponsorships, error: sponsorshipsError } = await supabase
        .from('sponsorships')
        .select('id, sponsor_email, sponsor_id, bestie_id, sponsor_bestie_id, amount, frequency, status, stripe_mode, started_at, stripe_subscription_id')
        .order('started_at', { ascending: true });

      if (sponsorshipsError) throw sponsorshipsError;

      // Group by Stripe IDs to find duplicates
      const stripeIdMap = new Map<string, DuplicateGroup>();

      // Process donations
      donations?.forEach(donation => {
        const ids = [
          { id: donation.stripe_subscription_id, type: 'subscription_id' as const },
          { id: donation.stripe_payment_intent_id, type: 'payment_intent_id' as const },
          { id: donation.stripe_checkout_session_id, type: 'checkout_session_id' as const },
        ];

        ids.forEach(({ id, type }) => {
          if (id) {
            if (!stripeIdMap.has(id)) {
              stripeIdMap.set(id, {
                stripe_id: id,
                stripe_id_type: type,
                donations: [],
                sponsorships: [],
              });
            }
            stripeIdMap.get(id)!.donations.push({
              id: donation.id,
              donor_email: donation.donor_email || 'Unknown',
              donor_id: donation.donor_id,
              amount: donation.amount,
              frequency: donation.frequency,
              status: donation.status,
              stripe_mode: donation.stripe_mode,
              created_at: donation.created_at,
            });
          }
        });
      });

      // Process sponsorships
      sponsorships?.forEach(sponsorship => {
        const ids = [
          { id: sponsorship.stripe_subscription_id, type: 'subscription_id' as const },
        ];

        ids.forEach(({ id, type }) => {
          if (id) {
            if (!stripeIdMap.has(id)) {
              stripeIdMap.set(id, {
                stripe_id: id,
                stripe_id_type: type,
                donations: [],
                sponsorships: [],
              });
            }
            stripeIdMap.get(id)!.sponsorships.push({
              id: sponsorship.id,
              sponsor_email: sponsorship.sponsor_email || 'Unknown',
              sponsor_id: sponsorship.sponsor_id,
              bestie_id: sponsorship.bestie_id,
              sponsor_bestie_id: sponsorship.sponsor_bestie_id,
              amount: sponsorship.amount,
              frequency: sponsorship.frequency,
              status: sponsorship.status,
              stripe_mode: sponsorship.stripe_mode,
              created_at: sponsorship.started_at,
            });
          }
        });
      });

      // Filter to only groups with duplicates (multiple donations OR multiple sponsorships OR both)
      const duplicateGroups = Array.from(stripeIdMap.values()).filter(
        group => 
          group.donations.length > 1 || 
          group.sponsorships.length > 1 || 
          (group.donations.length > 0 && group.sponsorships.length > 0)
      );

      setDuplicates(duplicateGroups);
      
      if (duplicateGroups.length === 0) {
        toast.success("No duplicates found! Your data is clean.");
      } else {
        toast.warning(`Found ${duplicateGroups.length} duplicate groups that need attention.`);
      }
    } catch (error) {
      console.error("Error detecting duplicates:", error);
      toast.error("Failed to detect duplicates: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedForDeletion) return;

    try {
      const { error } = await supabase
        .from(selectedForDeletion.type === 'donation' ? 'donations' : 'sponsorships')
        .delete()
        .eq('id', selectedForDeletion.id);

      if (error) throw error;

      toast.success(`${selectedForDeletion.type} deleted successfully`);
      
      // Remove from local state
      setDuplicates(prev => 
        prev.map(group => {
          if (group.stripe_id !== selectedForDeletion.stripeId) return group;
          
          return {
            ...group,
            donations: selectedForDeletion.type === 'donation' 
              ? group.donations.filter(d => d.id !== selectedForDeletion.id)
              : group.donations,
            sponsorships: selectedForDeletion.type === 'sponsorship'
              ? group.sponsorships.filter(s => s.id !== selectedForDeletion.id)
              : group.sponsorships,
          };
        }).filter(group => 
          group.donations.length > 1 || 
          group.sponsorships.length > 1 || 
          (group.donations.length > 0 && group.sponsorships.length > 0)
        )
      );
      
      setSelectedForDeletion(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Duplicate Transaction Detector</CardTitle>
              <CardDescription>
                Identifies donations and sponsorships that share the same Stripe IDs
              </CardDescription>
            </div>
            <Button
              onClick={detectDuplicates}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Detect Duplicates
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {duplicates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Click "Detect Duplicates" to scan for duplicate transactions</p>
            </div>
          ) : (
            <div className="space-y-6">
              {duplicates.map((group, idx) => {
                const totalRecords = group.donations.length + group.sponsorships.length;
                const allEmails = [
                  ...group.donations.map(d => d.donor_email),
                  ...group.sponsorships.map(s => s.sponsor_email)
                ];
                const uniqueEmails = [...new Set(allEmails)];
                const allAmounts = [
                  ...group.donations.map(d => d.amount),
                  ...group.sponsorships.map(s => s.amount)
                ];
                const uniqueAmounts = [...new Set(allAmounts)];
                
                // Calculate time differences
                const allTimestamps = [
                  ...group.donations.map(d => new Date(d.created_at).getTime()),
                  ...group.sponsorships.map(s => new Date(s.created_at).getTime())
                ].sort();
                const timeSpanMs = allTimestamps[allTimestamps.length - 1] - allTimestamps[0];
                const timeSpanSeconds = (timeSpanMs / 1000).toFixed(2);
                
                return (
                  <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Duplicate Group {idx + 1}</Badge>
                        <Badge variant="outline">{group.stripe_id_type}</Badge>
                        {totalRecords > 2 && (
                          <Badge variant="secondary">{totalRecords} records sharing same ID</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="font-mono text-muted-foreground">
                          <span className="font-semibold">Stripe ID:</span> {group.stripe_id}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Emails:</span> {uniqueEmails.length === 1 ? (
                            <span className="text-green-600">✓ Same email ({uniqueEmails[0]})</span>
                          ) : (
                            <span className="text-orange-600">⚠ Different emails: {uniqueEmails.join(', ')}</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Amounts:</span> {uniqueAmounts.length === 1 ? (
                            <span className="text-green-600">✓ Same amount (${uniqueAmounts[0].toFixed(2)})</span>
                          ) : (
                            <span className="text-orange-600">⚠ Different amounts: {uniqueAmounts.map(a => `$${a.toFixed(2)}`).join(', ')}</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Time span:</span> {timeSpanMs < 5000 ? (
                            <span className="text-green-600">✓ Created within {timeSpanSeconds}s (highly suspicious)</span>
                          ) : timeSpanMs < 60000 ? (
                            <span className="text-yellow-600">⚠ Created within {timeSpanSeconds}s</span>
                          ) : (
                            <span className="text-muted-foreground">Created {timeSpanSeconds}s apart</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Record types:</span> {group.donations.length > 0 && group.sponsorships.length > 0 ? (
                            <span className="text-red-600">⚠ MIXED: {group.donations.length} donation(s) + {group.sponsorships.length} sponsorship(s)</span>
                          ) : group.donations.length > 1 ? (
                            <span className="text-orange-600">⚠ {group.donations.length} donations</span>
                          ) : (
                            <span className="text-orange-600">⚠ {group.sponsorships.length} sponsorships</span>
                          )}
                        </p>
                        {uniqueEmails.length === 1 && uniqueAmounts.length === 1 && timeSpanMs < 5000 && (
                          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                            <p className="text-destructive font-semibold text-xs">
                              🚨 HIGH CONFIDENCE DUPLICATE: Same email, same amount, created within {timeSpanSeconds}s
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {group.donations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">
                          Donations ({group.donations.length})
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>User Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Mode</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.donations.map((donation) => (
                              <TableRow key={donation.id}>
                                <TableCell className="font-mono text-xs">
                                  {donation.donor_email}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={donation.donor_id ? 'default' : 'secondary'}>
                                    {donation.donor_id ? 'Logged In' : 'Guest'}
                                  </Badge>
                                </TableCell>
                                <TableCell>${donation.amount.toFixed(2)}</TableCell>
                                <TableCell>{donation.frequency}</TableCell>
                                <TableCell>
                                  <Badge variant={donation.status === 'active' ? 'default' : 'secondary'}>
                                    {donation.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={donation.stripe_mode === 'live' ? 'default' : 'outline'}>
                                    {donation.stripe_mode || 'N/A'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(donation.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setSelectedForDeletion({
                                      type: 'donation',
                                      id: donation.id,
                                      stripeId: group.stripe_id,
                                    })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {group.sponsorships.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">
                          Sponsorships ({group.sponsorships.length})
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>User Type</TableHead>
                              <TableHead>Bestie ID</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Mode</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.sponsorships.map((sponsorship) => (
                              <TableRow key={sponsorship.id}>
                                <TableCell className="font-mono text-xs">
                                  {sponsorship.sponsor_email}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={sponsorship.sponsor_id ? 'default' : 'secondary'}>
                                    {sponsorship.sponsor_id ? 'Logged In' : 'Guest'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {sponsorship.sponsor_bestie_id || sponsorship.bestie_id || 'N/A'}
                                </TableCell>
                                <TableCell>${sponsorship.amount.toFixed(2)}</TableCell>
                                <TableCell>{sponsorship.frequency}</TableCell>
                                <TableCell>
                                  <Badge variant={sponsorship.status === 'active' ? 'default' : 'secondary'}>
                                    {sponsorship.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={sponsorship.stripe_mode === 'live' ? 'default' : 'outline'}>
                                    {sponsorship.stripe_mode || 'N/A'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(sponsorship.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setSelectedForDeletion({
                                      type: 'sponsorship',
                                      id: sponsorship.id,
                                      stripeId: group.stripe_id,
                                    })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedForDeletion} onOpenChange={() => setSelectedForDeletion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to delete this {selectedForDeletion?.type}? 
              This action cannot be undone and will permanently remove this financial transaction record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
