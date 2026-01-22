import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image, AlertCircle } from "lucide-react";
import { VendorBestieAssetSelector } from "./VendorBestieAssetSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface LinkedBestie {
  id: string;
  bestie_id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_number: number | null;
  require_vendor_asset_approval: boolean;
  selected_assets_count: number;
}

interface VendorBestieAssetManagerProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

export const VendorBestieAssetManager = ({ vendorId, theme }: VendorBestieAssetManagerProps) => {
  const [besties, setBesties] = useState<LinkedBestie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBestie, setSelectedBestie] = useState<LinkedBestie | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLinkedBesties();
  }, [vendorId]);

  const loadLinkedBesties = async () => {
    setLoading(true);
    try {
      // Get approved bestie requests
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

      const bestieIds = requests.map(r => r.bestie_id);

      // Get bestie profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, avatar_number')
        .in('id', bestieIds);

      if (profilesError) throw profilesError;

      // Get guardian settings
      const { data: guardianSettings } = await supabase
        .from('caregiver_bestie_links')
        .select('bestie_id, require_vendor_asset_approval')
        .in('bestie_id', bestieIds);

      // Get asset counts for each bestie
      const { data: assetCounts } = await supabase
        .from('vendor_bestie_assets')
        .select('bestie_id, approval_status')
        .eq('vendor_id', vendorId)
        .in('bestie_id', bestieIds);

      const linkedBesties = requests.map(req => {
        const profile = profiles?.find(p => p.id === req.bestie_id);
        const settings = guardianSettings?.find(s => s.bestie_id === req.bestie_id);
        const approvedCount = assetCounts?.filter(
          a => a.bestie_id === req.bestie_id && a.approval_status === 'approved'
        ).length || 0;
        
        return {
          id: req.id,
          bestie_id: req.bestie_id,
          display_name: profile?.display_name || 'Bestie',
          avatar_url: profile?.avatar_url || null,
          avatar_number: profile?.avatar_number || null,
          require_vendor_asset_approval: settings?.require_vendor_asset_approval || false,
          selected_assets_count: approvedCount
        };
      });

      setBesties(linkedBesties);
    } catch (error) {
      console.error('Error loading linked besties:', error);
      toast({
        title: "Error",
        description: "Failed to load linked besties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card 
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (besties.length === 0) {
    return (
      <Card 
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Bestie Assets
          </CardTitle>
          <CardDescription>
            Select assets from your linked besties to feature on your store page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have any linked besties yet. Link to a bestie first to select their assets.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Bestie Assets
          </CardTitle>
          <CardDescription>
            Select images, voice notes, or videos from your linked besties to feature on your store page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {besties.map((bestie) => (
              <div
                key={bestie.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
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
                  <p className="font-medium">{bestie.display_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {bestie.selected_assets_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {bestie.selected_assets_count} asset{bestie.selected_assets_count !== 1 ? 's' : ''} featured
                      </Badge>
                    )}
                    {bestie.require_vendor_asset_approval && (
                      <Badge variant="outline" className="text-xs">
                        Requires Approval
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedBestie(bestie)}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Select Assets
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asset Selector Dialog */}
      {selectedBestie && (
        <VendorBestieAssetSelector
          vendorId={vendorId}
          bestieId={selectedBestie.bestie_id}
          bestieName={selectedBestie.display_name}
          requiresApproval={selectedBestie.require_vendor_asset_approval}
          isOpen={!!selectedBestie}
          onClose={() => {
            setSelectedBestie(null);
            loadLinkedBesties(); // Refresh to update counts
          }}
        />
      )}
    </>
  );
};
