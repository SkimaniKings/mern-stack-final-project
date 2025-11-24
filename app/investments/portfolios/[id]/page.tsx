import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPortfolioById } from "@/app/actions/investment-portfolios"
import { PortfolioHoldings } from "@/components/investments/portfolio-holdings"
import { PortfolioAllocationAnalysis } from "@/components/investments/portfolio-allocation-analysis"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Shell } from "@/components/shells/shell"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

// Force dynamic rendering to handle cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Portfolio Details",
  description: "View and manage your investment portfolio holdings",
}

interface PortfolioPageProps {
  params: {
    id: string
  }
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { data: portfolio, error } = await getPortfolioById(params.id)
  
  if (error || !portfolio) {
    notFound()
  }
  
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/investments/portfolios">
                <ChevronLeft className="h-4 w-4" />
                Back to Portfolios
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-muted-foreground">{portfolio.description}</p>
          )}
        </div>
      </div>
      <Separator className="my-4" />
      
      <Tabs defaultValue="holdings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="holdings" className="space-y-4">
          <PortfolioHoldings 
            portfolioId={portfolio.id} 
            portfolioName={portfolio.name} 
          />
        </TabsContent>
        <TabsContent value="analysis" className="space-y-4">
          <PortfolioAllocationAnalysis 
            portfolioId={portfolio.id} 
            portfolioName={portfolio.name} 
          />
        </TabsContent>
      </Tabs>
    </Shell>
  )
}
