import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if the user should have access to vendor features.
 * This includes:
 * - Owning at least one vendor record
 * - Being an accepted team member of at least one vendor
 */
export async function hasVendorAccess(userId: string): Promise<boolean> {
  const [{ data: owned }, { data: team }] = await Promise.all([
    supabase.from("vendors").select("id").eq("user_id", userId).limit(1),
    supabase
      .from("vendor_team_members")
      .select("id")
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .limit(1),
  ]);

  return (owned?.length ?? 0) > 0 || (team?.length ?? 0) > 0;
}
