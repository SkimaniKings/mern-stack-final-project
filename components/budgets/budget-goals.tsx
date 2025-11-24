"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Plus, Calendar } from "lucide-react"
import type { FinancialGoal } from "@/types/budget"

interface BudgetGoalsProps {
  goals: FinancialGoal[]
  onAddGoal: (goal: FinancialGoal) => void
}

export function BudgetGoals({ goals, onAddGoal }: BudgetGoalsProps) {
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [newGoal, setNewGoal] = useState<Omit<FinancialGoal, 'deadline'> & { deadline?: string }>({
    type: "savings",
    target: 0,
    priority: 1,
    currentProgress: 0,
  })

  const handleAddGoal = () => {
    if (!newGoal.target || !newGoal.type) return

    onAddGoal({
      type: newGoal.type,
      target: typeof newGoal.target === 'string' ? parseFloat(newGoal.target) : newGoal.target,
      priority: newGoal.priority || 1,
      currentProgress: newGoal.currentProgress || 0,
      deadline: newGoal.deadline ? new Date(newGoal.deadline) : undefined,
    })

    setNewGoal({
      target: 0,
      type: "savings",
      priority: 1,
      currentProgress: 0,
    })
    setIsAddingGoal(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Financial Goals
        </CardTitle>
        <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Financial Goal</DialogTitle>
              <DialogDescription>
                Set a new financial goal to track in your budget
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select
                  value={newGoal.type}
                  onValueChange={(value: 'savings' | 'debt' | 'investment' | 'emergency') => setNewGoal({ ...newGoal, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="debt">Debt Reduction</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter target amount"
                  value={newGoal.target || ""}
                  onChange={(e) => setNewGoal({ ...newGoal, target: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Input
                  type="date"
                  value={newGoal.deadline || ""}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value || undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newGoal.priority?.toString()}
                  onValueChange={(value) => setNewGoal({ ...newGoal, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">High</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleAddGoal}>
                Add Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No financial goals set. Add a goal to get started!
            </div>
          ) : (
            goals.map((goal, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium capitalize">{goal.type}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        Priority: {goal.priority}
                      </Badge>
                      {goal.deadline && (
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.deadline).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ${(goal.currentProgress || 0).toLocaleString()} / ${(goal.target || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round(((goal.currentProgress || 0) / (goal.target || 1)) * 100)}% Complete
                    </div>
                  </div>
                </div>
                <Progress value={(goal.currentProgress / goal.target) * 100} />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
