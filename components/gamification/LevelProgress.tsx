"use client"

import { useEffect, useState } from "react";
import { getUserPoints } from "@/lib/gamification/points";
import type { UserPoints } from "@/types/gamification";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function LevelProgress({ className }: Props) {
  const [points, setPoints] = useState<UserPoints | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getUserPoints();
      setPoints(data);
    })();
  }, []);

  const safePoints: UserPoints = points ?? {
    user_id: "",
    total_points: 0,
    level: 1,
    updated_at: new Date().toISOString(),
  };

  // Simple level math: level up every 1000 points
  const nextLevelThreshold = safePoints.level * 1000;
  const progressPercent = Math.min(
    (safePoints.total_points / nextLevelThreshold) * 100,
    100
  );

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <span className="text-sm font-medium text-muted-foreground">
        Level {safePoints.level}
      </span>
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className="h-2 bg-emerald-500 rounded"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 mt-1">
        {safePoints.total_points}/{nextLevelThreshold} XP
      </span>
    </div>
  );
}
