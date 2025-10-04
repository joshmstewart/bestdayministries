import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image, Mic, Video, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BestieAsset {
  id: string;
  type: 'image' | 'voice_note' | 'video';
  url: string;
  title?: string;
  source: string;
}

interface SelectedAsset {
  id: string;
  asset_type: string;
  asset_url: string;
  asset_title: string | null;
  approval_status: string;
  approved_at: string | null;
}

interface VendorBestieAssetSelectorProps {
  vendorId: string;
  bestieId: string;
  bestieName: string;
  requiresApproval: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const VendorBestieAssetSelector = ({
  vendorId,
  bestieId,
  bestieName,
  requiresApproval,
  isOpen,
  onClose,
}: VendorBestieAssetSelectorProps) => {
  const [availableAssets, setAvailableAssets] = useState<BestieAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      loadSelectedAssets();
    }
  }, [isOpen, bestieId, vendorId]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const assets: BestieAsset[] = [];

      // Load featured bestie images and voice notes
      const { data: featuredBesties } = await supabase
        .from("featured_besties")
        .select("id, image_url, voice_note_url, bestie_name")
        .eq("bestie_id", bestieId)
        .eq("approval_status", "approved");

      if (featuredBesties) {
        featuredBesties.forEach((fb) => {
          if (fb.image_url) {
            assets.push({
              id: `fb-img-${fb.id}`,
              type: 'image',
              url: fb.image_url,
              title: fb.bestie_name,
              source: 'Featured Bestie Post'
            });
          }
          if (fb.voice_note_url) {
            assets.push({
              id: `fb-voice-${fb.id}`,
              type: 'voice_note',
              url: fb.voice_note_url,
              title: fb.bestie_name,
              source: 'Featured Bestie Voice Note'
            });
          }
        });
      }

      // Load profile avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", bestieId)
        .single();

      if (profile?.avatar_url) {
        assets.push({
          id: `profile-avatar`,
          type: 'image',
          url: profile.avatar_url,
          title: `${profile.display_name}'s Avatar`,
          source: 'Profile Picture'
        });
      }

      setAvailableAssets(assets);
    } catch (error) {
      console.error("Error loading assets:", error);
      toast({
        title: "Error",
        description: "Failed to load bestie assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedAssets = async () => {
    try {
      const { data } = await supabase
        .from("vendor_bestie_assets")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("bestie_id", bestieId);

      if (data) {
        setSelectedAssets(data);
      }
    } catch (error) {
      console.error("Error loading selected assets:", error);
    }
  };

  const isAssetSelected = (assetUrl: string) => {
    return selectedAssets.some(sa => sa.asset_url === assetUrl);
  };

  const getAssetStatus = (assetUrl: string) => {
    return selectedAssets.find(sa => sa.asset_url === assetUrl)?.approval_status;
  };

  const handleToggleAsset = async (asset: BestieAsset) => {
    const isSelected = isAssetSelected(asset.url);

    if (isSelected) {
      // Remove asset
      setSaving(true);
      try {
        const { error } = await supabase
          .from("vendor_bestie_assets")
          .delete()
          .eq("vendor_id", vendorId)
          .eq("asset_url", asset.url);

        if (error) throw error;

        toast({
          title: "Asset removed",
          description: "The asset has been removed from your store",
        });

        await loadSelectedAssets();
      } catch (error) {
        console.error("Error removing asset:", error);
        toast({
          title: "Error",
          description: "Failed to remove asset",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    } else {
      // Add asset
      setSaving(true);
      try {
        const approvalStatus = requiresApproval ? 'pending_approval' : 'approved';
        
        const { error } = await supabase
          .from("vendor_bestie_assets")
          .insert({
            vendor_id: vendorId,
            bestie_id: bestieId,
            asset_type: asset.type,
            asset_url: asset.url,
            asset_title: asset.title,
            approval_status: approvalStatus,
            ...(approvalStatus === 'approved' && { approved_at: new Date().toISOString() })
          });

        if (error) throw error;

        toast({
          title: "Asset added",
          description: requiresApproval 
            ? "The asset has been submitted for guardian approval" 
            : "The asset is now displayed on your store",
        });

        await loadSelectedAssets();
      } catch (error) {
        console.error("Error adding asset:", error);
        toast({
          title: "Error",
          description: "Failed to add asset",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Assets from {bestieName}</DialogTitle>
          <DialogDescription>
            Choose images, voice notes, or videos to feature on your store page.
            {requiresApproval && " These assets will require guardian approval before being displayed."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : availableAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No assets available from this bestie yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableAssets.map((asset) => {
              const isSelected = isAssetSelected(asset.url);
              const status = getAssetStatus(asset.url);

              return (
                <Card
                  key={asset.id}
                  className={`p-4 cursor-pointer transition-all relative ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => !saving && handleToggleAsset(asset)}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {asset.type === 'image' ? (
                    <img
                      src={asset.url}
                      alt={asset.title || 'Asset'}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-md mb-2 flex items-center justify-center">
                      {getAssetIcon(asset.type)}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm font-medium truncate">{asset.title}</p>
                    <p className="text-xs text-muted-foreground">{asset.source}</p>
                    
                    {status && (
                      <Badge
                        variant={
                          status === 'approved'
                            ? 'default'
                            : status === 'pending_approval'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {status === 'pending_approval' ? 'Pending' : status}
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
