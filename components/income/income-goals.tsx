"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Trash2, Trophy, Plus, PartyPopper, Target, CalendarDays } from "lucide-react"
import Confetti from "react-confetti"
import { format } from "date-fns"

interface IncomeGoal {
  id: string
  target_amount: number
  target_date: string
  current_progress: number
  is_celebrated: boolean
  created_at: string
}

export function IncomeGoals() {
  const { toast } = useToast()
  const [goals, setGoals] = useState<IncomeGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({
    targetAmount: "",
    targetDate: ""
  })
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<IncomeGoal | null>(null)
  const [newProgress, setNewProgress] = useState("")

  // Fetch goals on component mount
  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/income/goals")
      if (response.ok) {
        const data = await response.json()
        setGoals(data)
      } else {
        toast({
          title: "Error fetching goals",
          description: "Failed to load your income goals",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching goals:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addGoal = async () => {
    if (!newGoal.targetAmount || isNaN(Number(newGoal.targetAmount)) || Number(newGoal.targetAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid target amount",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/income/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetAmount: Number(newGoal.targetAmount),
          targetDate: newGoal.targetDate || null
        })
      })

      if (response.ok) {
        const goal = await response.json()
        setGoals([...goals, goal])
        setNewGoal({ targetAmount: "", targetDate: "" })
        setIsAddingGoal(false)
        toast({
          title: "Goal added",
          description: "Your income goal has been created"
        })
      } else {
        const error = await response.json()
        toast({
          title: "Failed to add goal",
          description: error.error || "An error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error adding goal:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const updateProgress = async () => {
    if (!selectedGoal) return
    
    if (isNaN(Number(newProgress)) || Number(newProgress) < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid progress amount",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/income/goals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: selectedGoal.id,
          currentProgress: Number(newProgress)
        })
      })

      if (response.ok) {
        const updatedGoal = await response.json()
        
        // Check if goal was just achieved
        const wasAchieved = Number(newProgress) >= Number(selectedGoal.target_amount) && 
                           !selectedGoal.is_celebrated &&
                           !updatedGoal.is_celebrated
        
        setGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g))
        setIsUpdatingProgress(false)
        setSelectedGoal(null)
        setNewProgress("")
        
        toast({
          title: "Progress updated",
          description: "Your goal progress has been updated"
        })
        
        // Trigger celebration if goal was just achieved
        if (wasAchieved) {
          celebrateGoal(updatedGoal.id)
        }
      } else {
        const error = await response.json()
        toast({
          title: "Failed to update progress",
          description: error.error || "An error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error updating progress:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      const response = await fetch(`/api/income/goals?id=${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setGoals(goals.filter(g => g.id !== id))
        toast({
          title: "Goal deleted",
          description: "Your income goal has been deleted"
        })
      } else {
        const error = await response.json()
        toast({
          title: "Failed to delete goal",
          description: error.error || "An error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting goal:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const celebrateGoal = async (goalId: string) => {
    setCelebratingGoalId(goalId)
    setShowConfetti(true)
    
    // Update the goal's celebrated status
    try {
      await fetch("/api/income/goals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: goalId,
          isCelebrated: true
        })
      })
      
      // Update local state
      setGoals(goals.map(g => g.id === goalId ? {...g, is_celebrated: true} : g))
      
    } catch (error) {
      console.error("Error marking goal as celebrated:", error)
    }
    
    // Stop confetti after 5 seconds
    setTimeout(() => {
      setShowConfetti(false)
      setCelebratingGoalId(null)
    }, 5000)
  }

  // Calculate progress percentage
  const getProgressPercentage = (goal: IncomeGoal) => {
    const percentage = (Number(goal.current_progress) / Number(goal.target_amount)) * 100
    return Math.min(percentage, 100) // Cap at 100%
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />}
      
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Income Goals</CardTitle>
              <CardDescription>Set and track your income milestones</CardDescription>
            </div>
            <Button onClick={() => setIsAddingGoal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No income goals yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Set income targets to track your progress and celebrate achievements
              </p>
              <Button onClick={() => setIsAddingGoal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create Your First Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <Card key={goal.id} className={`relative overflow-hidden ${celebratingGoalId === goal.id ? 'border-yellow-400 shadow-yellow-200 dark:shadow-yellow-900' : ''}`}>
                  {goal.is_celebrated && (
                    <div className="absolute top-2 right-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                  )}
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {formatCurrency(Number(goal.target_amount))}
                        </h3>
                        {goal.target_date && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedGoal(goal)
                            setNewProgress(goal.current_progress.toString())
                            setIsUpdatingProgress(true)
                          }}
                        >
                          Update
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {formatCurrency(Number(goal.current_progress))} of {formatCurrency(Number(goal.target_amount))}
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(goal)} className="h-2" />
                    </div>
                    
                    {getProgressPercentage(goal) >= 100 && !goal.is_celebrated && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3 border-dashed border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                        onClick={() => celebrateGoal(goal.id)}
                      >
                        <PartyPopper className="h-4 w-4 mr-2" /> Celebrate Achievement!
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Goal Dialog */}
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Income Goal</DialogTitle>
            <DialogDescription>
              Set a new income target to track your progress
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  $
                </span>
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="10000"
                  className="pl-7"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date (Optional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingGoal(false)}>Cancel</Button>
            <Button onClick={addGoal}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Update Progress Dialog */}
      <Dialog open={isUpdatingProgress} onOpenChange={setIsUpdatingProgress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              Update your current progress toward this goal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Goal:</span>
              <span className="font-medium">
                {selectedGoal && formatCurrency(Number(selectedGoal.target_amount))}
              </span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currentProgress">Current Progress</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  $
                </span>
                <Input
                  id="currentProgress"
                  type="number"
                  placeholder="5000"
                  className="pl-7"
                  value={newProgress}
                  onChange={(e) => setNewProgress(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdatingProgress(false)}>Cancel</Button>
            <Button onClick={updateProgress}>Update Progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
