import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Module-level cache so all components share fetched avatar URLs
const avatarUrlCache = new Map<string, string>();
const pendingFetches = new Map<string, Promise<string | null>>();

async function fetchAvatarUrl(avatarId: string): Promise<string | null> {
  if (avatarUrlCache.has(avatarId)) {
    return avatarUrlCache.get(avatarId)!;
  }

  // Deduplicate concurrent fetches for the same ID
  if (pendingFetches.has(avatarId)) {
    return pendingFetches.get(avatarId)!;
  }

  const promise = (async (): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from("fitness_avatars")
        .select("preview_image_url")
        .eq("id", avatarId)
        .maybeSingle();
      const url = data?.preview_image_url || null;
      if (url) {
        avatarUrlCache.set(avatarId, url);
      }
      pendingFetches.delete(avatarId);
      return url;
    } catch {
      pendingFetches.delete(avatarId);
      return null;
    }
  })();

  pendingFetches.set(avatarId, promise);
  return promise;
}

/**
 * Returns the preview_image_url for a fitness avatar by its ID.
 * Uses a shared module-level cache to avoid redundant DB calls.
 */
export function useProfileAvatarUrl(profileAvatarId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(
    profileAvatarId ? avatarUrlCache.get(profileAvatarId) ?? null : null
  );

  useEffect(() => {
    if (!profileAvatarId) {
      setUrl(null);
      return;
    }

    // Check cache synchronously first
    const cached = avatarUrlCache.get(profileAvatarId);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;
    fetchAvatarUrl(profileAvatarId).then((result) => {
      if (!cancelled) setUrl(result);
    });

    return () => { cancelled = true; };
  }, [profileAvatarId]);

  return url;
}

/** Pre-populate the cache with known avatar URLs (e.g., from a batch query) */
export function primeAvatarUrlCache(entries: Array<{ id: string; preview_image_url: string }>) {
  for (const entry of entries) {
    if (entry.preview_image_url) {
      avatarUrlCache.set(entry.id, entry.preview_image_url);
    }
  }
}
