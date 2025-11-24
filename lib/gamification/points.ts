import { supabase } from "../supabase/client";
import type { UserPoints } from "../../types/gamification";

/**
 * Adds points to the current user and returns updated totals.
 */
export async function addPoints(points: number): Promise<UserPoints | null> {
  const client = supabase;
  if (!client) return null;

  const {
    data: { session },
  } = await client.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await client.rpc("award_points", {
    p_user_id: user.id,
    p_points: points,
  });
  if (error) {
    console.error("Failed to award points", error);
    return null;
  }

  // Fetch updated row
  const { data: pointsRow } = await client
    .from("user_points")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return pointsRow as UserPoints;
}

/**
 * Retrieves the point totals for the logged-in user.
 */
export async function getUserPoints(): Promise<UserPoints | null> {
  const client = supabase;
  if (!client) return null;
  const {
    data: { session },
  } = await client.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await client
    .from("user_points")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return (data ?? null) as UserPoints | null;
}
