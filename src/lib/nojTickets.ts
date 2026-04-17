// Shared helpers for counting Night of Joy tickets claimed and the cap.
// Used by admin (NojGuestList) and public page (NightOfJoy).

import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_NOJ_TICKET_CAP = 280;

export interface NojDonationRow {
  designation: string | null;
  status: string;
  stripe_mode: string;
}

const SPONSOR_TIER_TICKETS: Array<{ match: RegExp; tickets: number }> = [
  { match: /Best Day Ever Sponsor[^$]*\$10[,]?000/i, tickets: 8 },
  { match: /Best Day Ever Sponsor[^$]*\$5[,]?000/i, tickets: 6 },
  { match: /Bestie Champion[^$]*\$2[,]?500/i, tickets: 4 },
  { match: /Joy Builder[^$]*\$1[,]?000/i, tickets: 2 },
];

/** Count tickets implied by a single donation/sponsorship designation. */
export function getTicketsFromDesignation(designation: string | null): number {
  if (!designation) return 0;
  const d = designation.replace(/A Night of Joy\s*[–-]\s*/i, "");

  // Paid ticket combos: "(2× General Admission, 1× Besties)" — sum the leading numbers.
  const paidMatches = [...d.matchAll(/(\d+)\s*×/g)];
  if (paidMatches.length > 0) {
    return paidMatches.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
  }

  // Free-ticket records use trailing "×N"
  const freeMatch = d.match(/×\s*(\d+)/);
  if (freeMatch) return parseInt(freeMatch[1], 10);

  // Sponsor tiers — match by name + amount.
  for (const tier of SPONSOR_TIER_TICKETS) {
    if (tier.match.test(d)) return tier.tickets;
  }

  // Unknown sponsor tier (e.g. Heart of Joy / Shine / custom) — no included tickets.
  return 0;
}

/** Sum tickets across confirmed (completed/active) live-mode rows. Excludes test + archived. */
export function countClaimedTickets(rows: NojDonationRow[]): number {
  return rows.reduce((sum, r) => {
    if (r.stripe_mode === "test") return sum;
    if (r.status !== "completed" && r.status !== "active") return sum;
    return sum + getTicketsFromDesignation(r.designation);
  }, 0);
}

/** Load cap + claimed count from DB. */
export async function loadNojTicketStats(): Promise<{ cap: number; claimed: number; remaining: number }> {
  const [{ data: capSetting }, { data: rows }] = await Promise.all([
    supabase.from("app_settings").select("setting_value").eq("setting_key", "noj_ticket_cap").maybeSingle(),
    supabase
      .from("donations")
      .select("designation, status, stripe_mode")
      .like("designation", "A Night of Joy%"),
  ]);

  let cap = DEFAULT_NOJ_TICKET_CAP;
  const v = capSetting?.setting_value;
  if (typeof v === "number") cap = v;
  else if (typeof v === "string") cap = parseInt(v, 10) || DEFAULT_NOJ_TICKET_CAP;
  else if (v && typeof v === "object" && "cap" in (v as any)) cap = Number((v as any).cap) || DEFAULT_NOJ_TICKET_CAP;

  const claimed = countClaimedTickets((rows || []) as NojDonationRow[]);
  return { cap, claimed, remaining: Math.max(0, cap - claimed) };
}
