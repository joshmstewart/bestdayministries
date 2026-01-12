import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, RotateCcw, Loader2 } from "lucide-react";
import { BadgeEarnedDialog } from "@/components/chores/BadgeEarnedDialog";
import { BadgeImageWithZoom } from "@/components/chores/BadgeLightbox";
import { BADGE_DEFINITIONS, BadgeDefinition, BADGE_RARITY_CONFIG } from "@/lib/choreBadgeDefinitions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

export function ChoreBadgeManager() {
  const [testBadge, setTestBadge] = useState<BadgeDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadingBadge, setUploadingBadge] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();

  // Fetch custom badge images from database
  const { data: customImages } = useQuery({
    queryKey: ['chore-badge-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chore_badge_images')
        .select('*');
      if (error) throw error;
      return data?.reduce((acc, item) => {
        acc[item.badge_type] = item.image_url;
        return acc;
      }, {} as Record<string, string>) || {};
    }
  });

  const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak');
  const totalBadges = BADGE_DEFINITIONS.filter(b => b.category === 'total');

  const handleTestBadge = (badge: BadgeDefinition) => {
    setTestBadge(badge);
    setDialogOpen(true);
  };

  const handleUploadClick = (badgeType: string) => {
    fileInputRefs.current[badgeType]?.click();
  };

  const handleFileChange = async (badgeType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBadge(badgeType);

    try {
      // Compress image
      const compressedFile = await compressImage(file, 2, 512, 512);
      
      // Upload to storage
      const fileName = `${badgeType}-${Date.now()}.${compressedFile.type.split('/')[1] || 'png'}`;
      const { error: uploadError } = await supabase.storage
        .from('badge-images')
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('badge-images')
        .getPublicUrl(fileName);

      // Upsert to database
      const { error: dbError } = await supabase
        .from('chore_badge_images')
        .upsert({
          badge_type: badgeType,
          image_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'badge_type' });

      if (dbError) throw dbError;

      toast.success('Badge image uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['chore-badge-images'] });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload badge image');
    } finally {
      setUploadingBadge(null);
      // Reset input
      if (fileInputRefs.current[badgeType]) {
        fileInputRefs.current[badgeType]!.value = '';
      }
    }
  };

  const handleResetToDefault = async (badgeType: string) => {
    try {
      const { error } = await supabase
        .from('chore_badge_images')
        .delete()
        .eq('badge_type', badgeType);

      if (error) throw error;

      toast.success('Reset to default badge image');
      queryClient.invalidateQueries({ queryKey: ['chore-badge-images'] });
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset badge image');
    }
  };

  // Helper to get effective badge with custom image if available
  const getEffectiveBadge = (badge: BadgeDefinition): BadgeDefinition => {
    if (customImages?.[badge.type]) {
      return { ...badge, imageUrl: customImages[badge.type] };
    }
    return badge;
  };

  const renderBadgeRow = (badge: BadgeDefinition) => {
    const effectiveBadge = getEffectiveBadge(badge);
    const hasCustomImage = !!customImages?.[badge.type];
    const isUploading = uploadingBadge === badge.type;
    const rarityConfig = BADGE_RARITY_CONFIG[badge.rarity];

    return (
      <TableRow key={badge.type}>
        <TableCell>
          <BadgeImageWithZoom badge={effectiveBadge} isEarned={true} size="sm" />
        </TableCell>
        <TableCell className="font-medium">{badge.name}</TableCell>
        <TableCell>
          <Badge className={`${rarityConfig.bgClass} text-white text-xs`}>
            {rarityConfig.label}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{badge.description}</TableCell>
        <TableCell>
          <Badge variant="outline">{badge.threshold} days</Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={(el) => { fileInputRefs.current[badge.type] = el; }}
              onChange={(e) => handleFileChange(badge.type, e)}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleUploadClick(badge.type)}
              disabled={isUploading}
              title="Upload custom image"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            {hasCustomImage && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleResetToDefault(badge.type)}
                title="Reset to default"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleTestBadge(effectiveBadge)}
              title="Test celebration"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Streak Badges</CardTitle>
            <CardDescription>
              Badges earned for completing all daily chores multiple days in a row
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24">Rarity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Requirement</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streakBadges.map(renderBadgeRow)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Completion Badges</CardTitle>
            <CardDescription>
              Badges earned for total number of days with all chores completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24">Rarity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Requirement</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalBadges.map(renderBadgeRow)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <BadgeEarnedDialog
        badge={testBadge}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
