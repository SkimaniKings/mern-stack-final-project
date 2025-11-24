"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { UserAchievement } from "@/types/gamification";
import Image from "next/image";

export default function BadgeGrid() {
  const [badges, setBadges] = useState<UserAchievement[]>([]);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase
        .from("user_achievements")
        .select("*, achievement: achievements(*)")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false });
      setBadges((data as any) || []);
    })();
  }, []);

  if (!badges.length) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      {badges.map((ua) => (
        <div
          key={ua.achievement_id}
          className="flex flex-col items-center text-center"
        >
          <Image
            src={(ua.achievement?.icon ?? "/badge-default.svg") as string}
            alt={(ua.achievement?.name ?? 'Badge') as string}
            width={64}
            height={64}
          />
          <span className="text-sm mt-2">{ua.achievement?.name}</span>
        </div>
      ))}
    </div>
  );
}
