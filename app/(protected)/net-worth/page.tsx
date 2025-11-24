import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
export const dynamic = 'force-dynamic';
import { getNetWorth } from "@/app/actions/net-worth"
import { NetWorthChart } from "@/components/net-worth/net-worth-chart"
import { AssetList } from "@/components/net-worth/asset-list"
import { LiabilityList } from "@/components/net-worth/liability-list"

export const metadata: Metadata = {
  title: "Net Worth",
  description: "Track your total assets and liabilities.",
}

interface Asset {
  category: string;
  amount: number;
}

interface Liability {
  category: string;
  amount: number;
}

interface NetWorthHistory {
  date: string;
  netWorth: number;
}

interface NetWorthData {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: Asset[];
  liabilityBreakdown: Liability[];
  history: NetWorthHistory[];
  assets?: Asset[];
  liabilities?: Liability[];
}

export default async function NetWorthPage() {
  // This will be replaced with actual data once we implement the net worth actions
  const netWorthData: NetWorthData = await getNetWorth().catch(() => ({
    totalAssets: 125000,
    totalLiabilities: 45000,
    netWorth: 80000,
    assetBreakdown: [
      { category: "Cash & Investments", amount: 55000 },
      { category: "Real Estate", amount: 45000 },
      { category: "Vehicles", amount: 15000 },
      { category: "Other Assets", amount: 10000 },
    ],
    liabilityBreakdown: [
      { category: "Mortgage", amount: 30000 },
      { category: "Auto Loans", amount: 8000 },
      { category: "Student Loans", amount: 5000 },
      { category: "Credit Cards", amount: 2000 },
    ],
    history: [
      { date: "2025-01", netWorth: 75000 },
      { date: "2025-02", netWorth: 76500 },
      { date: "2025-03", netWorth: 78000 },
      { date: "2025-04", netWorth: 80000 },
    ]
  }));

  const netWorthChange = netWorthData.history.length > 1 
    ? ((netWorthData.history[netWorthData.history.length - 1].netWorth - netWorthData.history[0].netWorth) / netWorthData.history[0].netWorth) * 100
    : 0;
  
  const isPositiveChange = netWorthChange >= 0;

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Net Worth"
        text="Track your total assets and liabilities."
      >
        <TrendingUp className="h-6 w-6" />
      </DashboardHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              <CardDescription>Total assets minus liabilities</CardDescription>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${netWorthData.netWorth.toLocaleString()}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              {isPositiveChange ? (
                <>
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{netWorthChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                  <span className="text-red-500">{netWorthChange.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">since last quarter</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <CardDescription>Everything you own</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${netWorthData.totalAssets.toLocaleString()}</div>
            <Progress 
              value={(netWorthData.totalAssets / (netWorthData.totalAssets + netWorthData.totalLiabilities)) * 100} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <CardDescription>Everything you owe</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${netWorthData.totalLiabilities.toLocaleString()}</div>
            <Progress 
              value={(netWorthData.totalLiabilities / (netWorthData.totalAssets + netWorthData.totalLiabilities)) * 100} 
              className="h-2 mt-2 bg-red-200" 
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets" className="mt-6">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
        </TabsList>
        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {netWorthData.assetBreakdown.map((asset: Asset, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{asset.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${asset.amount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((asset.amount / netWorthData.totalAssets) * 100).toFixed(1)}% of total assets
                  </div>
                  <Progress 
                    value={(asset.amount / netWorthData.totalAssets) * 100} 
                    className="h-2 mt-2" 
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6">
            <AssetList assets={netWorthData.assets || []} />
          </div>
        </TabsContent>
        <TabsContent value="liabilities" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {netWorthData.liabilityBreakdown.map((liability: Liability, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{liability.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {liability.category === "Other Liabilities" ? 
                      `$${netWorthData.totalLiabilities.toLocaleString()}` : 
                      `$${liability.amount.toLocaleString()}`
                    }
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {liability.category === "Other Liabilities" ? 
                      "100.0% of total liabilities" :
                      `${((liability.amount / netWorthData.totalLiabilities) * 100).toFixed(1)}% of total liabilities`
                    }
                  </div>
                  <Progress 
                    value={liability.category === "Other Liabilities" ? 100 : (liability.amount / netWorthData.totalLiabilities) * 100} 
                    className="h-2 mt-2 bg-red-200" 
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6">
            <LiabilityList liabilities={netWorthData.liabilities || []} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <NetWorthChart 
          data={netWorthData.history} 
          currentNetWorth={netWorthData.netWorth}
          assetsHistory={netWorthData.history.map(item => ({
            date: item.date,
            value: netWorthData.totalAssets * (0.9 + (Math.random() * 0.2)) // Simulated data
          }))}
          liabilitiesHistory={netWorthData.history.map(item => ({
            date: item.date,
            value: netWorthData.totalLiabilities * (0.9 + (Math.random() * 0.2)) // Simulated data
          }))}
        />
      </div>
    </DashboardShell>
  )
}
