"use client"

import { useState } from "react"
import type { Goal } from "@/app/actions/goals"
import { GoalCard } from "./goal-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface GoalsListProps {
  goals: Goal[]
}

export function GoalsList({ goals }: GoalsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("priority")
  const [filterStatus, setFilterStatus] = useState("all")

  // Filter goals based on search term and status
  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = filterStatus === "all" || goal.status === filterStatus

    return matchesSearch && matchesStatus
  })

  // Sort goals based on selected sort option
  const sortedGoals = [...filteredGoals].sort((a, b) => {
    if (sortBy === "date-asc") {
      return new Date(a.end_date || "").getTime() - new Date(b.end_date || "").getTime()
    } else if (sortBy === "date-desc") {
      return new Date(b.end_date || "").getTime() - new Date(a.end_date || "").getTime()
    } else if (sortBy === "priority-asc") {
      // Priority is now a number (1=high, 2=medium, 3=low)
      return a.priority - b.priority
    } else if (sortBy === "priority-desc") {
      // Priority is now a number (1=high, 2=medium, 3=low)
      return b.priority - a.priority
    } else if (sortBy === "progress-asc") {
      return a.progress - b.progress
    } else if (sortBy === "progress-desc") {
      return b.progress - a.progress
    }
    return 0
  })

  // Group goals by category for the categorized view
  const goalsByCategory = goals.reduce((acc, goal) => {
    const category = goal.category || "Uncategorized"
    if (!acc[category as string]) {
      acc[category as string] = []
    }
    acc[category as string].push(goal)
    return acc
  }, {} as Record<string, Goal[]>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            className="w-full sm:max-w-sm pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select 
            value={filterStatus} 
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="target_date">Target Date</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Goals</TabsTrigger>
          <TabsTrigger value="categorized">By Category</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {sortedGoals.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sortedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No goals found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first financial goal to get started"}
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="categorized" className="mt-6">
          {Object.keys(goalsByCategory).length > 0 ? (
            <div className="space-y-10">
              {Object.entries(goalsByCategory).map(([category, categoryGoals]) => (
                <div key={category}>
                  <h3 className="text-xl font-semibold mb-4 capitalize">{category.replace("_", " ")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No goals found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first financial goal to get started"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

