"use client"

import { useState, useEffect } from "react"

interface DiversificationScoreProps {
  score: number
}

export function DiversificationScore({ score }: DiversificationScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const duration = 1500
    const startTime = Date.now()
    const endValue = score * 100

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smoother animation
      const easeOutQuad = (t) => t * (2 - t)
      const easedProgress = easeOutQuad(progress)

      setAnimatedScore(easedProgress * endValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [score])

  // Determine color and label based on score
  const getScoreColor = () => {
    if (score >= 0.8) return "text-green-500"
    if (score >= 0.6) return "text-green-400"
    if (score >= 0.4) return "text-yellow-500"
    if (score >= 0.2) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreLabel = () => {
    if (score >= 0.8) return "Excellent"
    if (score >= 0.6) return "Good"
    if (score >= 0.4) return "Fair"
    if (score >= 0.2) return "Poor"
    return "Very Poor"
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />

          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={
              score >= 0.8
                ? "#10b981"
                : score >= 0.6
                  ? "#34d399"
                  : score >= 0.4
                    ? "#fbbf24"
                    : score >= 0.2
                      ? "#f97316"
                      : "#ef4444"
            }
            strokeWidth="10"
            strokeDasharray={`${animatedScore * 2.83} 283`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />

          {/* Score text */}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className={`text-3xl font-bold ${getScoreColor()}`}
            fill="currentColor"
          >
            {Math.round(animatedScore)}
          </text>

          {/* Label */}
          <text
            x="50"
            y="65"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs text-gray-500"
            fill="currentColor"
          >
            out of 100
          </text>
        </svg>
      </div>

      <div className={`text-xl font-bold mt-2 ${getScoreColor()}`}>{getScoreLabel()}</div>

      <div className="text-sm text-muted-foreground text-center mt-1">
        {score >= 0.6
          ? "Your portfolio is well-diversified"
          : score >= 0.4
            ? "Your portfolio could use more diversification"
            : "Your portfolio needs significant diversification"}
      </div>
    </div>
  )
}

