import { createClient } from "@supabase/supabase-js";
import { ENV } from "./config.js";
import type { FightResult } from "./fight.js";
import { FIGHTERS } from "./config.js";

// Service-role client (server-side only). Never expose this key to the frontend.
export const supabase =
  ENV.SUPABASE_URL && ENV.SUPABASE_SERVICE_KEY
    ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
      })
    : null;

export async function saveFight(r: FightResult) {
  if (!supabase) return null;
  const winnerName =
    r.winner === "draw"
      ? "Draw"
      : FIGHTERS[r.winner === "blue" ? r.blue : r.red].name;
  const { data, error } = await supabase
    .from("fights")
    .insert({
      thesis: r.thesis,
      blue: r.blue,
      red: r.red,
      winner: r.winner,
      winner_name: winnerName,
      method: r.method,
      ko_round: r.koRound,
      hp_blue: r.hpBlue,
      hp_red: r.hpRed,
      punches: r.punches,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string | undefined;
}

export async function getLeaderboard(limit = 10) {
  if (!supabase) return [];
  // "Noise" = most recent decisive fights; tweak ordering as you like.
  const { data, error } = await supabase
    .from("fights")
    .select("id, thesis, winner_name, method, ko_round, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function addToWaitlist(entry: {
  email?: string;
  wallet?: string;
}) {
  if (!supabase) return null;
  const { error } = await supabase.from("waitlist").insert({
    email: entry.email ?? null,
    wallet: entry.wallet ?? null,
  });
  // Ignore duplicate unique-violation errors (already signed up)
  if (error && error.code !== "23505") throw error;
  return true;
}
