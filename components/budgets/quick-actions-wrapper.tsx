"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LineChart, Users, Sparkles, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickActionsWrapper() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement budget analysis
      router.push("/budgets/analysis")
    } catch (error) {
      console.error("Error analyzing budget:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement budget sharing
      router.push("/budgets/share")
    } catch (error) {
      console.error("Error sharing budget:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptimize = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement budget optimization
      router.push("/budgets/optimize")
    } catch (error) {
      console.error("Error optimizing budget:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBudget = async () => {
    setIsLoading(true)
    try {
      router.push("/budgets/manage/create")
    } catch (error) {
      console.error("Error navigating to create budget:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-6">
      <Button
        variant="default"
        className="h-20 flex flex-col items-center justify-center gap-2"
        onClick={handleCreateBudget}
        disabled={isLoading}
      >
        <Plus className="h-6 w-6" />
        Create Budget
      </Button>
      <Button
        variant="outline"
        className="h-20 flex flex-col items-center justify-center gap-2"
        onClick={handleAnalyze}
        disabled={isLoading}
      >
        <LineChart className="h-6 w-6" />
        Analyze
      </Button>
      <Button
        variant="outline"
        className="h-20 flex flex-col items-center justify-center gap-2"
        onClick={handleShare}
        disabled={isLoading}
      >
        <Users className="h-6 w-6" />
        Share
      </Button>
      <Button
        variant="outline"
        className="h-20 flex flex-col items-center justify-center gap-2"
        onClick={handleOptimize}
        disabled={isLoading}
      >
        <Sparkles className="h-6 w-6" />
        Optimize
      </Button>
    </div>
  )
}
