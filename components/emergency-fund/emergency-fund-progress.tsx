"use client"

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function EmergencyFundProgress() {
  // This would come from your database in a real app
  const progressData = [
    { month: "Jan", balance: 5000, contribution: 500, target: 15000 },
    { month: "Feb", balance: 5500, contribution: 500, target: 15000 },
    { month: "Mar", balance: 6000, contribution: 500, target: 15000 },
    { month: "Apr", balance: 6500, contribution: 500, target: 15000 },
    { month: "May", balance: 7000, contribution: 500, target: 15000 },
    { month: "Jun", balance: 7500, contribution: 500, target: 15000 },
    { month: "Jul", balance: 8000, contribution: 500, target: 15000 },
    { month: "Aug", balance: 8500, contribution: 500, target: 15000 },
    { month: "Sep", balance: 9000, contribution: 500, target: 15000 },
    { month: "Oct", balance: 9500, contribution: 500, target: 15000 },
    { month: "Nov", balance: 10000, contribution: 500, target: 15000 },
    { month: "Dec", balance: 10500, contribution: 500, target: 15000 },
    { month: "Jan", balance: 11000, contribution: 500, target: 15000 },
    { month: "Feb", balance: 11500, contribution: 500, target: 15000 },
    { month: "Mar", balance: 12000, contribution: 500, target: 15000 },
    { month: "Apr", balance: 12500, contribution: 500, target: 15000 },
    { month: "May", balance: 13000, contribution: 500, target: 15000 },
    { month: "Jun", balance: 13500, contribution: 500, target: 15000 },
    { month: "Jul", balance: 14000, contribution: 500, target: 15000 },
    { month: "Aug", balance: 14500, contribution: 500, target: 15000 },
    { month: "Sep", balance: 15000, contribution: 500, target: 15000 },
  ]

  const monthlyContributions = [
    { month: "Jan", amount: 500 },
    { month: "Feb", amount: 500 },
    { month: "Mar", amount: 500 },
    { month: "Apr", amount: 500 },
    { month: "May", amount: 500 },
    { month: "Jun", amount: 500 },
    { month: "Jul", amount: 500 },
    { month: "Aug", amount: 500 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Balance Growth</CardTitle>
            <CardDescription>Projected growth of your emergency fund</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                balance: {
                  label: "Balance",
                  color: "hsl(var(--chart-1))",
                },
                target: {
                  label: "Target",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Line type="monotone" dataKey="balance" stroke="var(--color-balance)" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="var(--color-target)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => label}
                        formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                      />
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Contributions</CardTitle>
            <CardDescription>Your contributions to your emergency fund</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: "Amount",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyContributions}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => label}
                        formatter={(value) => [`$${value.toLocaleString()}`, "Contribution"]}
                      />
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Key achievements in your emergency fund journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-px bg-border" />
            <div className="space-y-8 pl-8">
              <div className="relative">
                <div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="h-2 w-2 rounded-full bg-background" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">January 2024</div>
                  <div className="font-medium">Started emergency fund</div>
                  <div className="text-sm text-muted-foreground">Initial deposit: $5,000</div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="h-2 w-2 rounded-full bg-background" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">April 2024</div>
                  <div className="font-medium">Reached 1 month of expenses</div>
                  <div className="text-sm text-muted-foreground">Balance: $6,500</div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="h-2 w-2 rounded-full bg-background" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">August 2024</div>
                  <div className="font-medium">Reached 3 months of expenses</div>
                  <div className="text-sm text-muted-foreground">Balance: $8,500</div>
                </div>
              </div>
              <div className="relative opacity-50">
                <div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">September 2025</div>
                  <div className="font-medium">Reach full emergency fund goal</div>
                  <div className="text-sm text-muted-foreground">Target: $15,000 (6 months of expenses)</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

