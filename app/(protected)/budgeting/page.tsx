import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Brain, BarChart3, RefreshCw, GitBranch, FileText, Users, Boxes, BarChart4 } from "lucide-react"

export const metadata: Metadata = {
  title: "Intelligent Budgeting",
  description: "AI-powered budgeting tools to optimize your finances",
}

export default function BudgetingPage() {
  const features = [
    {
      title: "AI Budget Generator",
      description: "Create personalized budgets based on your financial goals and spending history",
      icon: Brain,
      href: "/budgeting/ai-generator",
      color: "bg-blue-500",
    },
    {
      title: "Flexible Budget Models",
      description: "Choose from traditional, zero-based, 50/30/20 rule, or envelope system",
      icon: BarChart3,
      href: "/budgeting/models",
      color: "bg-green-500",
    },
    {
      title: "Dynamic Budget Adjustments",
      description: "Automatically adapt your budget to changing income or spending patterns",
      icon: RefreshCw,
      href: "/budgeting/dynamic-adjustments",
      color: "bg-purple-500",
    },
    {
      title: "Scenario Planning",
      description: "Test different budgeting strategies and see their impact on your finances",
      icon: GitBranch,
      href: "/budgeting/scenario-planning",
      color: "bg-teal-500",
    },
    {
      title: "Budget Templates",
      description: "Pre-made budgets for specific life events like weddings, new babies, or home purchases",
      icon: FileText,
      href: "/budgeting/templates",
      color: "bg-amber-500",
    },
    {
      title: "Collaborative Budgeting",
      description: "Create shared budgets with your partner or family members",
      icon: Users,
      href: "/budgeting/collaborative",
      color: "bg-red-500",
    },
    {
      title: "Budget Visualization",
      description: "Interactive treemaps and waterfall charts to visualize your budget",
      icon: Boxes,
      href: "/budgeting/visualization",
      color: "bg-indigo-500",
    },
    {
      title: "Variance Analysis",
      description: "Analyze differences between planned and actual spending with drill-down capabilities",
      icon: BarChart4,
      href: "/budgeting/variance-analysis",
      color: "bg-orange-500",
    },
  ]

  return (
    <div className="container mx-auto p-6">
      

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Intelligent Budgeting</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered budgeting tools to help you plan, track, and optimize your finances
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <Card className="h-full transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${feature.color} text-white mb-2`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

