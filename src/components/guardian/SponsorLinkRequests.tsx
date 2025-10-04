import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, Check, X, Loader2 } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";

interface SponsorRequest {
  id: string;
  sponsor_id: string;
  bestie_id: string;
  message: string | null;
  status: string;
  requested_at: string;
  sponsor_profile: {
    display_name: string;
    avatar_number: number | null;
  };
  bestie_profile: {
    display_name: string;
  };
}

interface SponsorLinkRequestsProps {
  guardianId: string;
}

export const SponsorLinkRequests = ({ guardianId }: SponsorLinkRequestsProps) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SponsorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [guardianId]);

  const loadRequests = async () => {
    try {
      // Get pending sponsor link requests for guardian's linked besties
      const { data: linkedBesties } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id")
        .eq("caregiver_id", guardianId);

      if (!linkedBesties || linkedBesties.length === 0) {
        setRequests([]);
        return;
      }

      const bestieIds = linkedBesties.map(link => link.bestie_id);

      const { data: requestsData, error } = await supabase
        .from("sponsor_bestie_requests")
        .select(`
          id,
          sponsor_id,
          bestie_id,
          message,
          status,
          requested_at,
          sponsor_profile:profiles!sponsor_bestie_requests_sponsor_id_fkey(display_name, avatar_number),
          bestie_profile:profiles!sponsor_bestie_requests_bestie_id_fkey(display_name)
        `)
        .in("bestie_id", bestieIds)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      setRequests((requestsData || []) as any);
    } catch (error: any) {
      console.error("Error loading sponsor requests:", error);
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, sponsorName: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from("sponsor_bestie_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: guardianId
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request approved",
        description: `${sponsorName} can now display their sponsor page link`
      });

      loadRequests();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, sponsorName: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from("sponsor_bestie_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: guardianId
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: `${sponsorName}'s request has been declined`
      });

      loadRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No pending sponsor link requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AvatarDisplay
                  avatarNumber={request.sponsor_profile?.avatar_number || null}
                  displayName={request.sponsor_profile?.display_name || "Sponsor"}
                  size="md"
                />
                <div>
                  <CardTitle className="text-lg">
                    {request.sponsor_profile?.display_name || "Sponsor"}
                  </CardTitle>
                  <CardDescription>
                    wants to link with {request.bestie_profile?.display_name}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">
                <Heart className="w-3 h-3 mr-1" />
                Sponsor
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.message && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm italic">"{request.message}"</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Requested {new Date(request.requested_at).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleApprove(request.id, request.sponsor_profile?.display_name || "Sponsor")}
                disabled={actionLoading === request.id}
                className="flex-1"
              >
                {actionLoading === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleReject(request.id, request.sponsor_profile?.display_name || "Sponsor")}
                disabled={actionLoading === request.id}
                variant="destructive"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
