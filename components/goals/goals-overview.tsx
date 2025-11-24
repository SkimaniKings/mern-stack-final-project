"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Target, ArrowUpRight, ArrowDownRight, PiggyBank, TrendingUp } from "lucide-react"
import { PriorityMatrix } from "./priority-matrix"
import { GoalNetworkDiagram } from "./goal-network-diagram"

interface GoalStatistics {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  totalMilestones: number
  completedMilestones: number
  totalSavings: number
  totalTargets: number
  progressPercentage: number
}

interface GoalsOverviewProps {
  stats: GoalStatistics
}

export function GoalsOverview({ stats }: GoalsOverviewProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Goals
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalGoals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeGoals} active, {stats.completedGoals} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.activeGoals}</div>
            <Progress
              value={(stats.activeGoals / stats.totalGoals) * 100}
              className="h-2 mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{stats.activeGoals} active</span>
              <span>{stats.completedGoals} completed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.progressPercentage}%</div>
            <Progress value={stats.progressPercentage} className="h-2 mt-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Current: {formatCurrency(stats.totalSavings)}</span>
              <span>Target: {formatCurrency(stats.totalTargets)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalMilestones}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats.completedMilestones} completed</div>
            <Progress
              value={(stats.completedMilestones / stats.totalMilestones) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Progress</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalSavings)}</div>
            <div className="text-xs text-muted-foreground mt-1">of {formatCurrency(stats.totalTargets)}</div>
            <Progress
              value={(stats.totalSavings / stats.totalTargets) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Tabs defaultValue="priority-matrix" className="w-full">
          <div className="flex justify-center sm:justify-start mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="priority-matrix">Priority Matrix</TabsTrigger>
              <TabsTrigger value="goal-network">Goal Network</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="priority-matrix" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Goal Priority Matrix</CardTitle>
                <CardDescription>Visualize your goals based on urgency and importance</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[400px]">
                <PriorityMatrix />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="goal-network" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Goal Network Diagram</CardTitle>
                <CardDescription>See how your financial goals are interconnected</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[400px]">
                <GoalNetworkDiagram />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

