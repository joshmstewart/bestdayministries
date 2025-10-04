import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Image, Mic, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VendorAssetRequest {
  id: string;
  vendor_business_name: string;
  bestie_name: string;
  asset_type: string;
  asset_url: string;
  asset_title: string | null;
  created_at: string;
}

interface VendorAssetRequestsProps {
  requests: VendorAssetRequest[];
  actionLoading: string | null;
  onAction: (requestId: string, action: 'approve' | 'reject') => void;
}

export const VendorAssetRequests = ({ 
  requests, 
  actionLoading, 
  onAction 
}: VendorAssetRequestsProps) => {
  const { toast } = useToast();

  const handleApprove = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("vendor_bestie_assets")
        .update({
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Asset approved",
        description: "The vendor can now display this asset on their store",
      });

      onAction(requestId, 'approve');
    } catch (error) {
      console.error("Error approving asset:", error);
      toast({
        title: "Error",
        description: "Failed to approve asset",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("vendor_bestie_assets")
        .update({
          approval_status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Asset rejected",
        description: "The vendor will not be able to display this asset",
      });

      onAction(requestId, 'reject');
    } catch (error) {
      console.error("Error rejecting asset:", error);
      toast({
        title: "Error",
        description: "Failed to reject asset",
        variant: "destructive",
      });
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'voice_note':
        return <Mic className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {request.asset_type === 'image' ? (
                <img
                  src={request.asset_url}
                  alt={request.asset_title || 'Asset'}
                  className="w-24 h-24 object-cover rounded-md"
                />
              ) : (
                <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                  {getAssetIcon(request.asset_type)}
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{request.vendor_business_name}</h3>
                  <Badge variant="outline">
                    {getAssetIcon(request.asset_type)}
                    <span className="ml-1 capitalize">{request.asset_type.replace('_', ' ')}</span>
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  Wants to feature {request.asset_title || 'an asset'} from <strong>{request.bestie_name}</strong>
                </p>

                <p className="text-xs text-muted-foreground">
                  Requested {new Date(request.created_at).toLocaleDateString()}
                </p>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
