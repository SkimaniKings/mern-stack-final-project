"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { formatDistanceToNow, format } from "date-fns"
import type { Goal, GoalStatus } from "@/app/actions/goals"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Target, Award, Clock, DollarSign, BarChart3, Share2 } from "lucide-react"

// Goal category icons
const categoryIcons: Record<string, React.ReactNode> = {
  retirement: <Clock className="h-4 w-4" />,
  education: <BarChart3 className="h-4 w-4" />,
  home_purchase: <DollarSign className="h-4 w-4" />,
  emergency_fund: <DollarSign className="h-4 w-4" />,
  vacation: <DollarSign className="h-4 w-4" />,
  car_purchase: <DollarSign className="h-4 w-4" />,
  debt_payoff: <DollarSign className="h-4 w-4" />,
  wedding: <DollarSign className="h-4 w-4" />,
  business: <DollarSign className="h-4 w-4" />,
  other: <DollarSign className="h-4 w-4" />,
}

// Priority colors
const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

// Status badges
const statusBadges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  active: { variant: "default", label: "Active" },
  paused: { variant: "outline", label: "Paused" },
  achieved: { variant: "secondary", label: "Achieved" },
  cancelled: { variant: "destructive", label: "Cancelled" },
}

interface GoalCardProps {
  goal: Goal
  showCelebration?: boolean
}

export function GoalCard({ goal, showCelebration = false }: GoalCardProps) {
  const [celebrating, setCelebrating] = useState(showCelebration)

  // Calculate progress percentage
  const progressPercentage =
    goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0

  // Format dates
  const formattedStartDate = format(new Date(goal.start_date), "MMM d, yyyy")
  const formattedTargetDate = goal.end_date ? format(new Date(goal.end_date), "MMM d, yyyy") : "No target date"
  const timeRemaining = goal.end_date ? formatDistanceToNow(new Date(goal.end_date), { addSuffix: true }) : "No deadline"

  // Format amounts
  const formattedTargetAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(goal.target_amount)

  const formattedCurrentAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(goal.current_amount || 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {celebrating && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          onAnimationComplete={() => setTimeout(() => setCelebrating(false), 3000)}
        >
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-500"
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: Math.random() * 3 + 1,
                  opacity: [1, 0],
                }}
                transition={{
                  duration: Math.random() * 2 + 1,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-yellow-500"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            Goal Achieved! 🎉
          </motion.div>
        </motion.div>
      )}

      <Card className={`overflow-hidden ${goal.status === "achieved" ? "border-green-500 border-2" : ""}`}>
        {goal.image_url && (
          <div className="relative h-48 w-full">
            <Image src={goal.image_url || "/placeholder.svg"} alt={goal.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold text-white">{goal.name}</h3>
              <div className="flex items-center mt-1">
                <Badge variant={statusBadges[goal.status].variant}>{statusBadges[goal.status].label}</Badge>
                <div className={`ml-2 w-3 h-3 rounded-full ${priorityColors[goal.priority]}`} />
              </div>
            </div>
          </div>
        )}

        <CardHeader className="p-3 sm:p-4 pb-0">
          {!goal.image_url && (
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="space-y-1 w-full sm:w-auto">
                <CardTitle className="text-base sm:text-lg">{goal.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                  {goal.description}
                </CardDescription>
              </div>
              <Badge variant={statusBadges[goal.status].variant}>{statusBadges[goal.status].label}</Badge>
            </div>
          )}

          <div className="mt-2">
            <div className="flex flex-col xs:flex-row justify-between text-xs sm:text-sm text-muted-foreground">
              <span>Progress ({Math.round(progressPercentage)}%)</span>
              <span className="mt-1 xs:mt-0">
                {formattedCurrentAmount} of {formattedTargetAmount}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2 mt-1" />
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">Target Date</div>
              <div className="text-sm sm:text-base font-medium">{formattedTargetDate}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">Priority</div>
              <div className="text-sm sm:text-base font-medium">
                {goal.priority === 1 ? "High" : goal.priority === 2 ? "Medium" : "Low"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-xs sm:text-sm">{formattedStartDate}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-xs sm:text-sm">{timeRemaining}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2">
            <div className="flex items-center">
              <Award className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-xs sm:text-sm">
                {goal.priority === 1 ? "High" : goal.priority === 2 ? "Medium" : "Low"} Priority
              </span>
            </div>
          </div>

          {goal.milestones && goal.milestones.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Milestones</h4>
              <div className="space-y-2">
                {goal.milestones.slice(0, 2).map((milestone: any) => (
                  <div key={milestone.id} className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${milestone.is_completed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span className="text-sm truncate">{milestone.name}</span>
                  </div>
                ))}
                {goal.milestones.length > 2 && (
                  <div className="text-sm text-muted-foreground">+{goal.milestones.length - 2} more milestones</div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <div className="w-full flex justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/goals/${goal.id}`}>View Details</Link>
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

