"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import FlameIcon from "@/components/ui/FlameIcon"; // you may need to create this SVG component

export default function StreakCounter() {
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // Query consecutive activity days
      const { data } = await supabase.rpc("get_current_streak", {
        p_user_id: user.id,
      });
      setStreak(data as number);
    })();
  }, []);

  const streakText = streak > 0 ? `${streak} day streak` : "No streak yet";

  return (
    <div className="flex items-center space-x-1 text-orange-500 font-medium">
      <FlameIcon className="w-4 h-4" />
      <span>{streakText}</span>
    </div>
  );
}
