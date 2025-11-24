import type { Metadata } from "next"
import Link from "next/link"
import { getBillNegotiationOpportunities } from "@/app/actions/bills"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, DollarSign, MessageSquare, Phone, TrendingDown } from "lucide-react"

export const metadata: Metadata = {
  title: "Bill Negotiation Assistant",
  description: "Find opportunities to lower your recurring costs",
}

export default async function BillNegotiationPage() {
  const negotiationOpportunities = await getBillNegotiationOpportunities()

  // Calculate potential savings
  const totalPotentialSavings = negotiationOpportunities.reduce(
    (sum, opportunity) => sum + opportunity.potentialSavings,
    0,
  )

  // Group by category
  const opportunitiesByCategory = negotiationOpportunities.reduce((acc, opportunity) => {
    const category = opportunity.category || "Other"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(opportunity)
    return acc
  }, {})

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bill Negotiation Assistant</h1>
        <p className="text-muted-foreground">Find opportunities to lower your recurring costs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Negotiation Opportunities</CardTitle>
            <CardDescription>Bills that could be lowered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{negotiationOpportunities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Potential Annual Savings</CardTitle>
            <CardDescription>If all negotiations succeed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">${totalPotentialSavings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Success Probability</CardTitle>
            <CardDescription>Based on historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">68%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="opportunities" className="w-full">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>
        <TabsContent value="opportunities" className="mt-4 space-y-6">
          {negotiationOpportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {opportunity.name}
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ${opportunity.potentialSavings.toFixed(2)} potential savings
                      </Badge>
                    </CardTitle>
                    <CardDescription>{opportunity.provider}</CardDescription>
                  </div>
                  <Badge variant={opportunity.priority === "high" ? "destructive" : "outline"}>
                    {opportunity.priority} priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Monthly</p>
                    <p className="text-lg font-medium">${opportunity.currentAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target Monthly</p>
                    <p className="text-lg font-medium">${opportunity.targetAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-lg font-medium">{opportunity.successRate}%</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-blue-500" />
                    Negotiation Strategy
                  </h4>
                  <p className="text-sm text-muted-foreground">{opportunity.strategy}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/bills/negotiation/${opportunity.id}/script`}>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      View Script
                    </Link>
                  </Button>

                  <Button size="sm" variant="outline" asChild>
                    <Link href={`tel:${opportunity.contactPhone}`}>
                      <Phone className="h-4 w-4 mr-1" />
                      Call Provider
                    </Link>
                  </Button>

                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/bills/${opportunity.billId}`}>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      View Bill
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <div className="space-y-6">
            {Object.entries(opportunitiesByCategory).map(([category, opportunities]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                  <CardDescription>
                    {opportunities.length} negotiation {opportunities.length === 1 ? "opportunity" : "opportunities"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {opportunities.map((opportunity) => (
                      <div key={opportunity.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{opportunity.name}</div>
                          <div className="text-sm text-muted-foreground">{opportunity.provider}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {opportunity.potentialSavings.toFixed(2)}
                          </Badge>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/bills/negotiation/${opportunity.id}/script`}>
                              <MessageSquare className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

