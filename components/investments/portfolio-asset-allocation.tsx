"use client"

import { useEffect, useState } from "react"
import { AssetAllocationChart } from "./asset-allocation-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Investment } from "@/lib/investments/calculations"

interface AssetAllocationData {
  name: string
  value: number
  percentage: number
  color: string
}

export function PortfolioAssetAllocation() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocationData[]>([])
  const [accountAllocation, setAccountAllocation] = useState<AssetAllocationData[]>([])

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // First try to fetch investments from the server
        const { getInvestments } = await import("@/app/actions/investments")
        const result = await getInvestments()
        
        console.log('Fetched investments result:', result)
        
        let investmentsData: Investment[] = []
        
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          // Handle case where data is in result.data
          if ('data' in result && Array.isArray(result.data)) {
            investmentsData = result.data as Investment[]
          } 
          // Handle case where data is directly in result
          else if (Array.isArray(result)) {
            investmentsData = result as Investment[]
          }
        }
        
        console.log('Processed investments data:', investmentsData)
        
        // If we have valid data, use it
        if (investmentsData.length > 0) {
          // Ensure all investments have required fields
          const validatedInvestments = investmentsData.map(inv => ({
            ...inv,
            value: inv.value || inv.current_value || inv.currentValue || inv.current_price || 0,
            assetClass: inv.assetClass || inv.asset_class || inv.type || 'Unknown',
            account: inv.account || inv.account_name || inv.account_type || 'Other'
          }))
          
          setInvestments(validatedInvestments)
          calculateAllocations(validatedInvestments)
        } else {
          // Fall back to sample data if no investments found
          console.log('No investments found, using sample data')
          const { sampleInvestments } = await import("@/lib/investments/calculations")
          if (sampleInvestments && Array.isArray(sampleInvestments) && sampleInvestments.length > 0) {
            // Ensure sample data has the right structure
            const validatedSample = sampleInvestments.map(inv => ({
              ...inv,
              value: inv.value || 0,
              assetClass: inv.assetClass || 'Unknown',
              account: inv.account || 'Sample Account'
            }))
            setInvestments(validatedSample)
            calculateAllocations(validatedSample)
          } else {
            setError("No investments found in your portfolio")
          }
        }
      } catch (error) {
        console.error("Error fetching investments:", error)
        setError("An unexpected error occurred while fetching investments")
      } finally {
        setLoading(false)
      }
    }

    fetchInvestments()
  }, [])

  const calculateAllocations = (investments: Investment[]) => {
    if (!investments || investments.length === 0) {
      setAssetAllocation([])
      setAccountAllocation([])
      return
    }

    console.log('Raw investments data:', investments)

    // Calculate total portfolio value
    const totalValue = investments.reduce((sum, inv) => {
      // Handle different possible value fields
      const value = inv.value || inv.current_value || inv.currentValue || inv.current_price || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);

    console.log('Total portfolio value:', totalValue)

    // Define a mapping of investment types to asset classes
    const typeToAssetClass: Record<string, string> = {
      'stock': 'Stocks',
      'stocks': 'Stocks',
      'etf': 'Stocks',
      'mutual_fund': 'Stocks',
      'bond': 'Bonds',
      'bonds': 'Bonds',
      'cash': 'Cash',
      'savings': 'Cash',
      'real_estate': 'Alternative',
      'crypto': 'Alternative',
      'commodity': 'Alternative',
      'alternative': 'Alternative',
      'collectibles': 'Alternative',
      'private_equity': 'Alternative'
    };

    // Calculate asset class allocation
    const assetClassMap = new Map<string, number>([
      ['Stocks', 0],
      ['Bonds', 0],
      ['Cash', 0],
      ['Alternative', 0]
    ]);
    
    investments.forEach(inv => {
      // Determine the asset class based on type or asset_class
      let assetClass = 'Stocks'; // Default to Stocks
      const type = (inv.type || '').toLowerCase();
      const assetClassFromType = typeToAssetClass[type];
      
      if (assetClassFromType) {
        assetClass = assetClassFromType;
      } else if (inv.asset_class) {
        // Try to map the asset class if it exists
        const mappedClass = typeToAssetClass[inv.asset_class.toLowerCase()];
        if (mappedClass) {
          assetClass = mappedClass;
        } else if (inv.asset_class) {
          // If we have an asset class but it's not in our mapping, use it as is
          assetClass = inv.asset_class;
        }
      }
      
      // Get the investment value from various possible fields
      const value = inv.value || inv.current_value || inv.currentValue || inv.current_price || 0;
      const numericValue = typeof value === 'number' ? value : 0;
      
      console.log('Processing investment:', {
        name: inv.name,
        type: inv.type,
        assetClass: inv.asset_class,
        value: numericValue,
        mappedAssetClass: assetClass
      });
      
      const currentValue = assetClassMap.get(assetClass) || 0;
      assetClassMap.set(assetClass, currentValue + numericValue);
    });

    // Convert to array and calculate percentages
    const assetAllocationData: AssetAllocationData[] = Array.from(assetClassMap.entries())
      .filter(([_, value]) => value > 0) // Only include asset classes with value > 0
      .map(([name, value], index) => ({
        name,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: getColorForIndex(index)
      }))
      .sort((a, b) => b.value - a.value); // Sort by value (highest first)


    console.log('Asset allocation data:', assetAllocationData);
    setAssetAllocation(assetAllocationData);

    // Calculate account allocation
    const accountMap = new Map<string, number>();
    
    investments.forEach(inv => {
      // Get account from various possible fields
      const account = inv.account || inv.account_name || inv.account_type || 'Other';
      const value = inv.value || inv.current_value || inv.currentValue || inv.current_price || 0;
      const numericValue = typeof value === 'number' ? value : 0;
      
      const currentValue = accountMap.get(account) || 0;
      accountMap.set(account, currentValue + numericValue);
    });

    const accountAllocationData: AssetAllocationData[] = Array.from(accountMap.entries())
      .filter(([_, value]) => value > 0) // Only include accounts with value > 0
      .map(([name, value], index) => ({
        name,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: getColorForIndex(index)
      }))
      .sort((a, b) => b.value - a.value); // Sort by value (highest first)


    console.log('Account allocation data:', accountAllocationData);
    setAccountAllocation(accountAllocationData);
  }

  const getColorForIndex = (index: number) => {
    const colors = [
      "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF", 
      "#FF6B6B", "#4ECDC4", "#FF9F1C", "#6A0572", "#AB83A1"
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>Loading your portfolio allocation data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription className="text-red-500">Error loading allocation data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-700">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>No investments found in your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-muted rounded-md bg-muted/20 text-muted-foreground">
            Add investments to see your asset allocation
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>
          View how your investments are distributed across asset classes and accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="asset-class">
          <TabsList className="mb-4">
            <TabsTrigger value="asset-class">By Asset Class</TabsTrigger>
            <TabsTrigger value="account">By Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="asset-class">
            <AssetAllocationChart 
              data={assetAllocation} 
              valueKey="value"
              nameKey="name"
              type="pie"
            />
          </TabsContent>
          
          <TabsContent value="account">
            <AssetAllocationChart 
              data={accountAllocation} 
              valueKey="value"
              nameKey="name"
              type="pie"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
