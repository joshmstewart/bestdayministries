import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2, Store, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VendorLinkRequest {
  id: string;
  vendor_id: string;
  bestie_id: string;
  message: string | null;
  requested_at: string;
  status: string;
  vendor: {
    business_name: string;
    description: string | null;
    logo_url: string | null;
  };
  bestie: {
    display_name: string;
  };
}

interface VendorLinkRequestsProps {
  onRequestsChange?: () => void;
}

export const VendorLinkRequests = ({ onRequestsChange }: VendorLinkRequestsProps) => {
  const [requests, setRequests] = useState<VendorLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get besties that this guardian is linked to
      const { data: links } = await supabase
        .from('caregiver_bestie_links')
        .select('bestie_id')
        .eq('caregiver_id', user.id);

      if (!links || links.length === 0) {
        setLoading(false);
        return;
      }

      const bestieIds = links.map(link => link.bestie_id);

      // Get pending vendor link requests for these besties
      const { data, error } = await supabase
        .from('vendor_bestie_requests')
        .select(`
          id,
          vendor_id,
          bestie_id,
          message,
          requested_at,
          status
        `)
        .in('bestie_id', bestieIds)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setRequests([]);
        return;
      }

      // Fetch vendor and bestie details separately
      const vendorIds = [...new Set(data.map(r => r.vendor_id))];
      const bestieIdsFromRequests = [...new Set(data.map(r => r.bestie_id))];

      const [vendorsResponse, bestiesResponse] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, business_name, description')
          .in('id', vendorIds),
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', bestieIdsFromRequests)
      ]);

      const vendorsMap = new Map(vendorsResponse.data?.map(v => [v.id, v]) || []);
      const bestiesMap = new Map(bestiesResponse.data?.map(b => [b.id, b]) || []);

      // Transform the data to match our interface
      const transformedData = data.map((item: any) => ({
        id: item.id,
        vendor_id: item.vendor_id,
        bestie_id: item.bestie_id,
        message: item.message,
        requested_at: item.requested_at,
        status: item.status,
        vendor: {
          business_name: vendorsMap.get(item.vendor_id)?.business_name || 'Unknown Vendor',
          description: vendorsMap.get(item.vendor_id)?.description || null,
          logo_url: null
        },
        bestie: {
          display_name: bestiesMap.get(item.bestie_id)?.display_name || 'Bestie'
        }
      }));

      setRequests(transformedData);
    } catch (error) {
      console.error('Error loading vendor link requests:', error);
      toast.error("Failed to load vendor link requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vendor_bestie_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Vendor link approved!");
      loadRequests();
      onRequestsChange?.();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vendor_bestie_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Vendor link rejected");
      loadRequests();
      onRequestsChange?.();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Vendor Link Requests
          </CardTitle>
          <CardDescription>
            Approve vendors who want to link their store to your bestie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No pending vendor link requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Vendor Link Requests
          <Badge variant="secondary">{requests.length}</Badge>
        </CardTitle>
        <CardDescription>
          Vendors requesting to link their store to your bestie's profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Vendor Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        {request.vendor.business_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        wants to link to {request.bestie.display_name}'s profile
                      </p>
                      {request.vendor.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.vendor.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <Heart className="inline h-3 w-3 mr-1 text-primary" />
                        "{request.message}"
                      </p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading !== null}
                      className="flex-1"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading !== null}
                      className="flex-1"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
