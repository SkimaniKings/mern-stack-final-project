"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, DollarSign, Edit, Trash2, Plus, Pencil, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GoalForecastChart } from "./goal-forecast-chart";
import { AddMilestoneForm } from "./add-milestone-form";
import { EditMilestoneForm } from "./edit-milestone-form";
import { AddContributionForm } from "./add-contribution-form";
import { GoalCelebration } from "./goal-celebration";
import { updateMilestoneStatus, deleteGoal, deleteMilestone } from "@/app/actions/goals";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Status badge helper function
function getStatusBadge(status: string | undefined) {
  if (!status) return { variant: "outline" as const, label: "Unknown" };
  
  switch(status.toLowerCase()) {
    case "active":
      return { variant: "default" as const, label: "Active" };
    case "paused":
      return { variant: "outline" as const, label: "Paused" };
    case "achieved":
      return { variant: "secondary" as const, label: "Achieved" };
    case "cancelled":
      return { variant: "destructive" as const, label: "Cancelled" };
    default:
      return { variant: "outline" as const, label: status || "Unknown" };
  }
}

interface Goal {
  id: string
  user_id: string
  name: string
  description?: string
  target_amount: number
  current_amount: number
  currency: string
  status: string
  priority: number
  start_date: string
  end_date?: string
  progress: number
  created_at: string
  updated_at: string
  category?: string
  image_url?: string
  milestones?: GoalMilestone[]
  // Additional UI properties
  is_shared?: boolean
  funding_source?: string
  funding_amount?: number
  funding_frequency?: string
}

interface GoalMilestone {
  id: string
  goal_id: string
  name: string
  description?: string
  target_amount: number
  is_achieved: boolean
  achieved_at?: string
  created_at: string
  updated_at: string
  // Additional UI properties
  target_date?: string
  is_completed?: boolean
  amount_target?: number
}

interface GoalDetailsProps {
  goal: Goal
}

export function GoalDetails({ goal }: GoalDetailsProps) {
  const router = useRouter()
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)
  const [isAddingContribution, setIsAddingContribution] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [hasShownCelebration, setHasShownCelebration] = useState(false)

  // Calculate progress percentage
  const progressPercentage = 
    goal.target_amount && goal.target_amount > 0 ? 
      Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0
      
  // Check if goal is completed
  const isGoalCompleted = goal.status === "achieved" || progressPercentage >= 100

  // Format dates with validation
  const formattedStartDate = goal.start_date && goal.start_date !== "null" && goal.start_date !== "undefined"
    ? format(new Date(goal.start_date), "MMMM d, yyyy")
    : "Not set"
    
  const formattedTargetDate = goal.end_date && goal.end_date !== "null" && goal.end_date !== "undefined"
    ? format(new Date(goal.end_date), "MMMM d, yyyy")
    : "Not set"

  // Format amounts
  const formattedTargetAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(goal.target_amount || 0)

  const formattedCurrentAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: goal.currency || "USD",
  }).format(goal.current_amount || 0)

  const handleMilestoneToggle = async (milestoneId: string, isCompleted: boolean) => {
    await updateMilestoneStatus(milestoneId, isCompleted)
  }
  
  // Effect to show celebration when goal is completed
  useEffect(() => {
    if (isGoalCompleted && !hasShownCelebration) {
      setShowCelebration(true)
      setHasShownCelebration(true)
    }
  }, [isGoalCompleted, hasShownCelebration])

  const handleDeleteGoal = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteGoal(goal.id)
      if (result.success) {
        toast({
          title: "Success",
          description: "Goal deleted successfully",
        })
        // Ensure we navigate away from the goal detail page
        router.push("/goals")
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete goal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting goal:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the goal",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Status badges
  const statusBadges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> =
    {
      not_started: { variant: "outline", label: "Not Started" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "secondary", label: "Completed" },
      on_hold: { variant: "destructive", label: "On Hold" },
    }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-8">
      {showCelebration && (
        <GoalCelebration 
          isCompleted={showCelebration} 
          goalName={goal.name} 
          onCelebrationEnd={() => setShowCelebration(false)} 
        />
      )}
      <div className="grid gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{goal.name}</h1>
            {goal.description && (
              <p className="text-muted-foreground mt-1">{goal.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/goals/${goal.id}/edit`)}
              className="w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Goal
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the goal and all associated milestones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteGoal} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
          <Card className="w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle>Milestones</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                  className="w-full sm:w-auto"
                >
                  {isAddingMilestone ? (
                    "Cancel"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingMilestone && (
                <div className="overflow-hidden mb-4">
                  <AddMilestoneForm goalId={goal.id} onComplete={() => setIsAddingMilestone(false)} />
                </div>
              )}

              <div className="space-y-4">
                {goal.milestones?.map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-2 p-2 rounded hover:bg-accent/50">
                    {editingMilestoneId === milestone.id ? (
                      <EditMilestoneForm
                        milestone={{
                          id: milestone.id,
                          name: milestone.name,
                          description: milestone.description || "",
                          target_amount: milestone.target_amount,
                          target_date: milestone.target_date || ""
                        }}
                        onComplete={() => {
                          setEditingMilestoneId(null)
                          router.refresh()
                        }}
                        onCancel={() => setEditingMilestoneId(null)}
                      />
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`milestone-${milestone.id}`}
                              checked={milestone.is_completed}
                              onCheckedChange={(checked) =>
                                handleMilestoneToggle(milestone.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`milestone-${milestone.id}`}
                              className={cn(
                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                milestone.is_completed && "line-through text-muted-foreground"
                              )}
                            >
                              {milestone.name}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditingMilestoneId(milestone.id)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={async () => {
                                    try {
                                      const result = await deleteMilestone(milestone.id)
                                      if (result.success) {
                                        toast({
                                          title: "Success",
                                          description: "Milestone deleted successfully",
                                        })
                                        router.refresh()
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: result.error || "Failed to delete milestone",
                                          variant: "destructive",
                                        })
                                      }
                                    } catch (error) {
                                      console.error("Error deleting milestone:", error)
                                      toast({
                                        title: "Error",
                                        description: "Failed to delete milestone",
                                        variant: "destructive",
                                      })
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>
                              {(() => {
                                // Try to extract date from description as a fallback
                                // Try to get the date from either target_date or achieved_at
                                const dateToUse = milestone.target_date || milestone.achieved_at;
                                if (dateToUse) {
                                  try {
                                    return format(new Date(dateToUse), "MMM d, yyyy");
                                  } catch (e) {
                                    return "Invalid date";
                                  }
                                }
                                
                                return "No date set";
                              })()}
                            </span>
                            {(() => {
                              // Use target_amount field
                              const amount = milestone.target_amount;
                              
                              if (amount && amount > 0) {
                                return (
                                  <>
                                    <DollarSign className="h-3 w-3 ml-2 mr-1" />
                                    <span>
                                      {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                      }).format(amount)}
                                    </span>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!goal.milestones || goal.milestones.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No milestones yet. Add some to track your progress!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle>Progress</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingContribution(!isAddingContribution)}
                  className="w-full sm:w-auto"
                >
                  {isAddingContribution ? (
                    "Cancel"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contribution
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingContribution && (
                <div className="mb-6">
                  <AddContributionForm
                    goalId={goal.id}
                    onComplete={() => setIsAddingContribution(false)}
                  />
                </div>
              )}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress ({Math.round(progressPercentage)}%)</span>
                    <span>{formattedCurrentAmount} of {formattedTargetAmount}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Priority</div>
                    <div className="font-medium capitalize">{goal.priority}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {(() => {
                        // Get badge properties directly without using the statusBadges object
                        const { variant, label } = getStatusBadge(goal.status);
                        return <Badge variant={variant}>{label}</Badge>;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Sharing</div>
                    <div className="font-medium">{goal.is_shared ? "Public" : "Private"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
