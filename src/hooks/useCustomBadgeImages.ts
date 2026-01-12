import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeDefinition, BADGE_DEFINITIONS } from "@/lib/choreBadgeDefinitions";

export function useCustomBadgeImages() {
  const { data: customImages, isLoading } = useQuery({
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
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get badge with custom image if available
  const getBadgeWithCustomImage = (badge: BadgeDefinition): BadgeDefinition => {
    if (customImages?.[badge.type]) {
      return { ...badge, imageUrl: customImages[badge.type] };
    }
    return badge;
  };

  // Get all badges with custom images applied
  const getBadgesWithCustomImages = (): BadgeDefinition[] => {
    return BADGE_DEFINITIONS.map(getBadgeWithCustomImage);
  };

  return {
    customImages: customImages || {},
    isLoading,
    getBadgeWithCustomImage,
    getBadgesWithCustomImages,
  };
}
