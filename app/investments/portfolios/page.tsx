import { Metadata } from "next"
import { getInvestmentPortfolios } from "@/app/actions/investment-portfolios"
import { PortfolioManagement } from "@/components/investments/portfolio-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Shell } from "@/components/shells/shell"

// Force dynamic rendering to handle cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Investment Portfolios",
  description: "Manage your investment portfolios and track your holdings",
}

export default async function InvestmentPortfoliosPage() {
  const { data: portfolios, error } = await getInvestmentPortfolios()
  
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Investment Portfolios</h1>
          <p className="text-muted-foreground">
            Create and manage your investment portfolios
          </p>
        </div>
      </div>
      <Separator className="my-4" />
      
      <Tabs defaultValue="portfolios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
        </TabsList>
        <TabsContent value="portfolios" className="space-y-4">
          {error ? (
            <div className="p-4 border rounded bg-red-50 text-red-800">
              <p>Error loading portfolios: {error}</p>
            </div>
          ) : (
            <PortfolioManagement 
              portfolios={portfolios || []} 
              onPortfolioAdded={() => {}} 
              onPortfolioUpdated={() => {}} 
              onPortfolioDeleted={() => {}} 
            />
          )}
        </TabsContent>
      </Tabs>
    </Shell>
  )
}
