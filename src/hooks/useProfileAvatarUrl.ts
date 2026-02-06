import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AvatarCropSettings {
  url: string;
  cropScale: number; // 1-2 zoom (matches emotion image pattern)
}

// Module-level cache so all components share fetched avatar data
const avatarCache = new Map<string, AvatarCropSettings>();
const pendingFetches = new Map<string, Promise<AvatarCropSettings | null>>();

async function fetchAvatarData(avatarId: string): Promise<AvatarCropSettings | null> {
  if (avatarCache.has(avatarId)) {
    return avatarCache.get(avatarId)!;
  }

  if (pendingFetches.has(avatarId)) {
    return pendingFetches.get(avatarId)!;
  }

  const promise = (async (): Promise<AvatarCropSettings | null> => {
    try {
      const { data } = await supabase
        .from("fitness_avatars")
        .select("preview_image_url, profile_crop_scale")
        .eq("id", avatarId)
        .maybeSingle();
      if (!data?.preview_image_url) {
        pendingFetches.delete(avatarId);
        return null;
      }
      const settings: AvatarCropSettings = {
        url: data.preview_image_url,
        cropScale: data.profile_crop_scale ?? 1,
      };
      avatarCache.set(avatarId, settings);
      pendingFetches.delete(avatarId);
      return settings;
    } catch {
      pendingFetches.delete(avatarId);
      return null;
    }
  })();

  pendingFetches.set(avatarId, promise);
  return promise;
}

/**
 * Returns the avatar URL and crop settings for a fitness avatar by its ID.
 * Uses a shared module-level cache to avoid redundant DB calls.
 */
export function useProfileAvatarUrl(profileAvatarId: string | null | undefined): string | null {
  const data = useProfileAvatarData(profileAvatarId);
  return data?.url ?? null;
}

export function useProfileAvatarData(profileAvatarId: string | null | undefined): AvatarCropSettings | null {
  const [data, setData] = useState<AvatarCropSettings | null>(
    profileAvatarId ? avatarCache.get(profileAvatarId) ?? null : null
  );

  useEffect(() => {
    if (!profileAvatarId) {
      setData(null);
      return;
    }

    const cached = avatarCache.get(profileAvatarId);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    fetchAvatarData(profileAvatarId).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => { cancelled = true; };
  }, [profileAvatarId]);

  return data;
}

/** Pre-populate the cache with known avatar URLs */
export function primeAvatarUrlCache(entries: Array<{ id: string; preview_image_url: string }>) {
  for (const entry of entries) {
    if (entry.preview_image_url) {
      avatarCache.set(entry.id, {
        url: entry.preview_image_url,
        cropScale: 1,
      });
    }
  }
}

/** Invalidate a specific avatar's cache entry (e.g., after admin edits crop) */
export function invalidateAvatarCache(avatarId: string) {
  avatarCache.delete(avatarId);
}
