"use client"

import { useEffect, useState } from "react"
import { ResponsiveSankey } from "@nivo/sankey"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { InfoCircledIcon } from "@radix-ui/react-icons"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCombinedTransactions } from "@/app/actions/transactions"
import { getCategories } from "@/app/actions/categories"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Define types for transactions and categories
type CombinedTransaction = {
  id: string
  description: string
  amount: number
  date: string
  is_income: boolean
  category?: {
    name: string
    color: string
    is_income: boolean
  }
  category_name?: string
  [key: string]: any
}

type Category = {
  id: string
  name: string
  color: string
  is_income: boolean
  [key: string]: any
}

// Define the structure of Sankey data
interface SankeyNode {
  id: string
  nodeColor: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

interface SankeyDiagramProps {
  title?: string
  description?: string
  data?: SankeyData
}

// Colors for different node types
const COLORS = {
  income: {
    main: "#10b981",
    variants: ["#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"]
  },
  expense: {
    main: "#ef4444",
    variants: ["#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2"]
  },
  savings: {
    main: "#3b82f6",
    variants: ["#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"]
  }
}

// Function to validate Sankey data and detect circular references
function validateSankeyData(data: SankeyData): { valid: boolean; message?: string } {
  // Create a directed graph from the links
  const graph: Record<string, string[]> = {}

  // Initialize graph with all nodes
  data.nodes.forEach((node) => {
    graph[node.id] = []
  })

  // Add edges to the graph
  data.links.forEach((link) => {
    if (graph[link.source]) {
      graph[link.source].push(link.target)
    } else {
      graph[link.source] = [link.target]
    }
  })

  // Function to detect cycles using DFS
  function hasCycle(node: string, visited: Set<string>, recStack: Set<string>): boolean {
    if (!visited.has(node)) {
      visited.add(node)
      recStack.add(node)

      for (const neighbor of graph[node] || []) {
        if (!visited.has(neighbor) && hasCycle(neighbor, visited, recStack)) {
          return true
        } else if (recStack.has(neighbor)) {
          return true
        }
      }
    }

    recStack.delete(node)
    return false
  }

  // Check for cycles starting from each node
  const visited = new Set<string>()
  const recStack = new Set<string>()

  for (const node of Object.keys(graph)) {
    if (!visited.has(node) && hasCycle(node, visited, recStack)) {
      return { valid: false, message: "Circular reference detected in Sankey data" }
    }
  }

  return { valid: true }
}

export function SankeyDiagram({
  title = "Money Flow",
  description = "Visualize how your money flows between income, expenses, and savings",
}: SankeyDiagramProps) {
  const [period, setPeriod] = useState<"month" | "year">("month")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monthlyData, setMonthlyData] = useState<SankeyData | null>(null)
  const [yearlyData, setYearlyData] = useState<SankeyData | null>(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        console.log('SankeyDiagram: Loading transaction data...')
        setLoading(true)
        setError(null)
        
              // Fetch transactions and categories
        let transactions: CombinedTransaction[] = []
        let categories: Category[] = []
        
        try {
          console.log('SankeyDiagram: Fetching combined transactions...')
          transactions = await getCombinedTransactions()
          console.log(`SankeyDiagram: Successfully fetched ${transactions.length} transactions`)
        } catch (transactionError) {
          console.error('SankeyDiagram: Error fetching transactions:', transactionError)
          // Continue with empty transactions array
          transactions = []
        }
        
        try {
          console.log('SankeyDiagram: Fetching categories...')
          const categoriesResponse = await getCategories()
          
          // Ensure we have a proper array of categories
          if (Array.isArray(categoriesResponse)) {
            categories = categoriesResponse
          } else if (categoriesResponse && 'categories' in categoriesResponse && Array.isArray(categoriesResponse.categories)) {
            // Handle case where API returns { categories: Category[] }
            categories = categoriesResponse.categories
          } else {
            console.warn('SankeyDiagram: Categories response is not in expected format:', categoriesResponse)
            categories = []
          }
          
          console.log(`SankeyDiagram: Successfully fetched ${categories.length} categories`)
        } catch (categoryError) {
          console.error('SankeyDiagram: Error fetching categories:', categoryError)
          // Continue with empty categories array
          categories = []
        }
        
        // Even if we have no data, we'll still create the visualization with empty data
        console.log('SankeyDiagram: Processing transaction data...')
        
        // Process monthly data
        const monthlyTransactions = transactions.filter(t => {
          try {
            if (!t.date) return false
            const date = new Date(t.date)
            const now = new Date()
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
          } catch (dateError) {
            console.warn('SankeyDiagram: Error processing transaction date:', dateError)
            return false
          }
        })
        
        console.log(`SankeyDiagram: Found ${monthlyTransactions.length} transactions for current month`)
        setMonthlyData(processTransactionsForSankey(monthlyTransactions, categories, "month"))
        
        // Process yearly data
        const yearlyTransactions = transactions.filter(t => {
          try {
            if (!t.date) return false
            const date = new Date(t.date)
            const now = new Date()
            return date.getFullYear() === now.getFullYear()
          } catch (dateError) {
            console.warn('SankeyDiagram: Error processing transaction date:', dateError)
            return false
          }
        })
        
        console.log(`SankeyDiagram: Found ${yearlyTransactions.length} transactions for current year`)
        setYearlyData(processTransactionsForSankey(yearlyTransactions, categories, "year"))
        
        console.log('SankeyDiagram: Data processing complete')
        
      } catch (err) {
        console.error("SankeyDiagram: Error loading Sankey data:", err)
        setError("Failed to load financial flow data")
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Function to process transactions into Sankey diagram data
  function processTransactionsForSankey(
    transactions: CombinedTransaction[] = [], 
    categories: Category[] = [], 
    timeframe: "month" | "year"
  ): SankeyData {
    // Ensure transactions is an array
    if (!Array.isArray(transactions)) {
      console.warn('Transactions is not an array, using empty array instead')
      transactions = []
    }
    
    // Create nodes and links for the Sankey diagram
    const nodes: SankeyNode[] = [
      { id: "Income", nodeColor: COLORS.income.main },
      { id: "Expenses", nodeColor: COLORS.expense.main },
      { id: "Savings", nodeColor: COLORS.savings.main },
    ]
    
    const links: SankeyLink[] = []
    
    // Process income sources
    const incomeCategories = new Map()
    transactions
      .filter(t => t && t.is_income)
      .forEach(t => {
        const categoryName = t.category_name || "Other Income"
        const amount = typeof t.amount === 'number' ? t.amount : 0
        incomeCategories.set(
          categoryName, 
          (incomeCategories.get(categoryName) || 0) + amount
        )
      })
    
    // Add income category nodes and links
    let colorIndex = 0
    incomeCategories.forEach((amount, category) => {
      nodes.push({ 
        id: category, 
        nodeColor: COLORS.income.variants[colorIndex % COLORS.income.variants.length] 
      })
      links.push({ source: category, target: "Income", value: amount })
      colorIndex++
    })
    
    // Process expense categories
    const expenseCategories = new Map()
    transactions
      .filter(t => t && !t.is_income)
      .forEach(t => {
        const categoryName = t.category_name || "Uncategorized"
        const amount = typeof t.amount === 'number' ? t.amount : 0
        expenseCategories.set(
          categoryName, 
          (expenseCategories.get(categoryName) || 0) + amount
        )
      })
    
    // Add expense category nodes and links
    colorIndex = 0
    expenseCategories.forEach((amount, category) => {
      nodes.push({ 
        id: category, 
        nodeColor: COLORS.expense.variants[colorIndex % COLORS.expense.variants.length] 
      })
      links.push({ source: "Expenses", target: category, value: amount })
      colorIndex++
    })
    
    // Calculate total income and expenses
    const totalIncome = Array.from(incomeCategories.values()).reduce((sum, val) => sum + val, 0)
    const totalExpenses = Array.from(expenseCategories.values()).reduce((sum, val) => sum + val, 0)
    
    // Add main flow links if we have data
    if (totalIncome > 0 || totalExpenses > 0) {
      links.push({ source: "Income", target: "Expenses", value: Math.min(totalIncome, totalExpenses) })
      
      // If there's a surplus, add to savings
      if (totalIncome > totalExpenses) {
        const savingsAmount = totalIncome - totalExpenses
        links.push({ source: "Income", target: "Savings", value: savingsAmount })
        
        // Add some default savings allocations if we have savings
        const emergencyFund = savingsAmount * 0.4
        const retirement = savingsAmount * 0.4
        const investment = savingsAmount * 0.2
        
        nodes.push({ id: "Emergency Fund", nodeColor: COLORS.savings.variants[0] })
        nodes.push({ id: "Retirement", nodeColor: COLORS.savings.variants[1] })
        nodes.push({ id: "Investment", nodeColor: COLORS.savings.variants[2] })
        
        links.push({ source: "Savings", target: "Emergency Fund", value: emergencyFund })
        links.push({ source: "Savings", target: "Retirement", value: retirement })
        links.push({ source: "Savings", target: "Investment", value: investment })
      }
    } else {
      // Add placeholder data if we have no transactions
      links.push({ source: "Income", target: "Expenses", value: 1000 })
      links.push({ source: "Income", target: "Savings", value: 500 })
      
      nodes.push({ id: "Emergency Fund", nodeColor: COLORS.savings.variants[0] })
      nodes.push({ id: "Retirement", nodeColor: COLORS.savings.variants[1] })
      nodes.push({ id: "Investment", nodeColor: COLORS.savings.variants[2] })
      
      links.push({ source: "Savings", target: "Emergency Fund", value: 200 })
      links.push({ source: "Savings", target: "Retirement", value: 200 })
      links.push({ source: "Savings", target: "Investment", value: 100 })
    }
    
    return { nodes, links }
  }
  
  const currentData = period === "month" ? monthlyData : yearlyData
  const validationResult = currentData ? validateSankeyData(currentData) : { valid: false, message: "No data available" }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              {description}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircledIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      A Sankey diagram shows how resources (like money) flow from one category to another. The width of
                      each flow represents the amount.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardDescription>
          </div>
          
          <Tabs value={period} onValueChange={(value) => setPeriod(value as "month" | "year")}>
            <TabsList className="grid w-full max-w-[200px] grid-cols-2">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Loading financial flow data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-red-500">{error}</p>
          </div>
        ) : !validationResult.valid ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">{validationResult.message || "Invalid financial flow data"}</p>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveSankey
              data={currentData || { nodes: [], links: [] }}
              margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
              align="justify"
              colors={(node: { nodeColor?: string }) => node.nodeColor || '#888888'}
              nodeOpacity={1}
              nodeThickness={18}
              nodeSpacing={24}
              nodeBorderWidth={0}
              linkOpacity={0.5}
              linkContract={3}
              enableLabels={true}
              labelPosition="outside"
              labelOrientation="horizontal"
              animate={true}
              theme={{
                tooltip: {
                  container: {
                    background: '#333',
                    color: '#fff',
                    fontSize: '12px',
                    borderRadius: '4px',
                    boxShadow: '0 3px 5px rgba(0, 0, 0, 0.25)',
                    padding: '8px 12px'
                  }
                }
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

