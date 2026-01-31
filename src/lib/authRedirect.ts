/**
 * Shared redirect logic for post-login navigation.
 * Used by both email/password login and picture password login.
 */

import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";

export type RedirectDestination = "/community" | "/vendor-dashboard" | string;

interface RedirectOptions {
  /** Explicit redirect path (overrides homepage preference) */
  redirectPath?: string;
  /** Optional bestie ID to append as query param */
  bestieId?: string;
}

/**
 * Determines where to redirect a user after login based on their profile preferences.
 * 
 * @param userId - The user's ID
 * @param options - Optional redirect overrides
 * @returns The path to redirect to
 */
export async function getPostLoginRedirect(
  userId: string,
  options: RedirectOptions = {}
): Promise<RedirectDestination> {
  const { redirectPath, bestieId } = options;

  // If there's an explicit redirect path, use it
  if (redirectPath) {
    return bestieId ? `${redirectPath}?bestieId=${bestieId}` : redirectPath;
  }

  try {
    // Check user's homepage preference from profile using the persistent client
    const { data: profile } = await supabasePersistent
      .from("profiles")
      .select("default_homepage")
      .eq("id", userId)
      .maybeSingle();

    // If user has set vendor-dashboard as their homepage, go there
    if (profile?.default_homepage === "vendor-dashboard") {
      return "/vendor-dashboard";
    }

    // Default: go to community
    return "/community";
  } catch (err) {
    console.error("Error fetching user homepage preference:", err);
    return "/community";
  }
}
