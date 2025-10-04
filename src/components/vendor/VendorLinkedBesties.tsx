import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Heart, Star, Loader2, X } from "lucide-react";

interface LinkedBestie {
  id: string;
  request_id: string;
  bestie_id: string;
  display_name: string;
  avatar_number: number | null;
  avatar_url: string | null;
  friend_code: string | null;
  status: string;
  is_featured: boolean;
}

interface VendorLinkedBestiesProps {
  vendorId: string;
}

export const VendorLinkedBesties = ({ vendorId }: VendorLinkedBestiesProps) => {
  const [besties, setBesties] = useState<LinkedBestie[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadLinkedBesties();
    loadPendingRequests();
  }, [vendorId]);

  const loadLinkedBesties = async () => {
    try {
      // Get current vendor data
      const { data: vendor } = await supabase
        .from('vendors')
        .select('featured_bestie_id')
        .eq('id', vendorId)
        .single();

      // Get approved requests
      const { data: requests, error: requestsError } = await supabase
        .from('vendor_bestie_requests')
        .select('id, bestie_id, status')
        .eq('vendor_id', vendorId)
        .eq('status', 'approved');

      if (requestsError) throw requestsError;
      if (!requests || requests.length === 0) {
        setBesties([]);
        setLoading(false);
        return;
      }

      // Get bestie profiles separately
      const bestieIds = requests.map(r => r.bestie_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_number, avatar_url, friend_code')
        .in('id', bestieIds);

      if (profilesError) throw profilesError;

      const linkedBesties = requests.map(req => {
        const profile = profiles?.find(p => p.id === req.bestie_id);
        return {
          id: req.id,
          request_id: req.id,
          bestie_id: req.bestie_id,
          display_name: profile?.display_name || 'Bestie',
          avatar_number: profile?.avatar_number,
          avatar_url: profile?.avatar_url,
          friend_code: profile?.friend_code,
          status: req.status,
          is_featured: vendor?.featured_bestie_id === req.bestie_id
        };
      });

      setBesties(linkedBesties);
    } catch (error) {
      console.error('Error loading linked besties:', error);
      toast.error("Failed to load linked besties");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data: requests, error: requestsError } = await supabase
        .from('vendor_bestie_requests')
        .select('id, bestie_id, status, message, requested_at')
        .eq('vendor_id', vendorId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;
      if (!requests || requests.length === 0) {
        setPendingRequests([]);
        return;
      }

      // Get bestie profiles separately
      const bestieIds = requests.map(r => r.bestie_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, friend_code')
        .in('id', bestieIds);

      if (profilesError) throw profilesError;

      const pendingWithProfiles = requests.map(req => ({
        ...req,
        profiles: profiles?.find(p => p.id === req.bestie_id)
      }));

      setPendingRequests(pendingWithProfiles);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const handleFeature = async (bestieId: string) => {
    setActionLoading(bestieId);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ featured_bestie_id: bestieId })
        .eq('id', vendorId);

      if (error) throw error;

      toast.success("Featured bestie updated!");
      loadLinkedBesties();
    } catch (error) {
      console.error('Error updating featured bestie:', error);
      toast.error("Failed to update featured bestie");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfeature = async () => {
    setActionLoading('unfeature');
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ featured_bestie_id: null })
        .eq('id', vendorId);

      if (error) throw error;

      toast.success("Featured bestie removed");
      loadLinkedBesties();
    } catch (error) {
      console.error('Error removing featured bestie:', error);
      toast.error("Failed to remove featured bestie");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('vendor_bestie_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Request cancelled");
      loadPendingRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error("Failed to cancel request");
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

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Link Requests</CardTitle>
            <CardDescription>
              Waiting for guardian approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {(request.profiles as any)?.display_name || 'Bestie'}
                      </p>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                        Pending Approval
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Friend Code: {(request.profiles as any)?.friend_code}
                    </p>
                    {request.message && (
                      <p className="text-xs text-muted-foreground mt-1">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelRequest(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Besties */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Besties</CardTitle>
          <CardDescription>
            Besties connected to your store. You can feature one on your profile page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {besties.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No linked besties yet. Use the form above to send a link request.
            </p>
          ) : (
            <div className="space-y-3">
              {besties.map((bestie) => (
                <div 
                  key={bestie.id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={bestie.avatar_url || `/placeholder.svg`} 
                      alt={bestie.display_name}
                    />
                    <AvatarFallback>
                      {bestie.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{bestie.display_name}</p>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Approved
                      </Badge>
                      {bestie.is_featured && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    {bestie.friend_code && (
                      <p className="text-sm text-muted-foreground">
                        {bestie.friend_code}
                      </p>
                    )}
                  </div>

                  {bestie.is_featured ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnfeature}
                      disabled={actionLoading === 'unfeature'}
                    >
                      {actionLoading === 'unfeature' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Unfeature'
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeature(bestie.bestie_id)}
                      disabled={actionLoading === bestie.bestie_id}
                    >
                      {actionLoading === bestie.bestie_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Star className="mr-1 h-3 w-3" />
                          Feature
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
