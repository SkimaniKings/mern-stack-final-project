import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CashflowChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashflow</CardTitle>
        <CardDescription>Your income and expenses over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Chart will be displayed here
        </div>
      </CardContent>
    </Card>
  )
}

