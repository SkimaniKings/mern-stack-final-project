"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { Info, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getDebts, type Debt as DebtType } from "@/app/actions/debts"

// Interface for internal debt representation in the calculator
interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
  // Adding fields to track progress
  initialBalance?: number
  amountPaid?: number
  interestPaid?: number
  daysToPayoff?: number
}

interface PayoffResult {
  strategy: string
  totalInterest: number
  totalPayments: number
  monthsToPayoff: number
  debtFreeDate: Date
  payoffOrder: string[] // List of debt names in order of payoff
  monthlyPayments: {
    month: number
    payment: number
    remainingBalance: number
    interestPaid: number // Track interest paid each month
    principalPaid: number // Track principal paid each month
  }[]
  debtProgress: { // Track individual debt progress
    id: string
    name: string
    initialBalance: number
    amountPaid: number
    interestPaid: number
    daysToPayoff: number
  }[]
}

export function RepaymentStrategyCalculator() {
  const [strategy, setStrategy] = useState<"avalanche" | "snowball" | "hybrid">("avalanche")
  const [extraPayment, setExtraPayment] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [fetchingDebts, setFetchingDebts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PayoffResult[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch debts from the database when component mounts
  useEffect(() => {
    fetchExistingDebts()
  }, [])

  const fetchExistingDebts = async () => {
    try {
      setFetchingDebts(true)
      setFetchError(null)
      
      // Use the DebtService instead of the server action to get debts from both DB and localStorage
      const { DebtService } = await import('@/lib/debt/debt-service')
      const debtService = new DebtService()
      
      // Get debts from both database and local storage
      const fetchedDBDebts = await debtService.getDebts()
      
      if (fetchedDBDebts && fetchedDBDebts.length > 0) {
        console.log('RepaymentCalculator: Found', fetchedDBDebts.length, 'debts')
        
        // Map the database debt format to the calculator's format
        const mappedDebts: Debt[] = fetchedDBDebts.map(debt => ({
          id: debt.id,
          name: debt.name,
          balance: debt.current_balance, // Use current_balance from DB format
          interestRate: debt.interest_rate,
          minimumPayment: debt.minimum_payment || 0
        }))
        
        setDebts(mappedDebts)
      } else {
        // Fallback to server action if debt service doesn't work
        try {
          const existingDebts = await getDebts()
          
          if (existingDebts && existingDebts.length > 0) {
            console.log('RepaymentCalculator: Found', existingDebts.length, 'debts from server action')
            
            // Map the database debt format to the calculator's format
            const mappedDebts: Debt[] = existingDebts.map(debt => ({
              id: debt.id,
              name: debt.name,
              balance: debt.principal,
              interestRate: debt.interest_rate,
              minimumPayment: debt.minimum_payment || 0
            }))
            
            setDebts(mappedDebts)
          } else {
            setFetchError("No debts found. Please add debts in the Debt Management section first.")
          }
        } catch (serverError) {
          console.error("Error fetching debts from server action:", serverError)
          setFetchError("Failed to load your debts. Please try again.")
        }
      }
    } catch (error) {
      console.error("Error fetching debts:", error)
      setFetchError("Failed to load your debts. Please try again.")
    } finally {
      setFetchingDebts(false)
    }
  }
  
  // Calculate payoff results when strategy, extra payment, or debts change
  useEffect(() => {
    if (debts.length > 0) {
      calculatePayoffResults()
    }
  }, [strategy, extraPayment, debts])

  const calculatePayoffResults = () => {
    setLoading(true)
    setError(null)
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        const results: PayoffResult[] = [
          calculateStrategy("avalanche"),
          calculateStrategy("snowball"),
          calculateStrategy("hybrid")
        ]
        
        setResults(results)
        setLoading(false)
      } catch (err) {
        setError("Failed to calculate payoff results. Please try again.")
        setLoading(false)
      }
    }, 1000)
  }

  const calculateStrategy = (strategyType: "avalanche" | "snowball" | "hybrid"): PayoffResult => {
    // Create a deep copy of debts to avoid modifying the original
    let remainingDebts = debts.map(debt => ({
      ...debt,
      initialBalance: debt.balance,
      amountPaid: 0,
      interestPaid: 0
    }));
    
    let totalInterest = 0;
    let totalPayments = 0;
    let month = 1;
    let payoffOrder: string[] = [];
    
    const monthlyPayments: { 
      month: number; 
      payment: number; 
      remainingBalance: number;
      interestPaid: number;
      principalPaid: number;
    }[] = [];
    
    // Calculate total minimum payments
    const totalMinimumPayments = remainingDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const totalMonthlyPayment = totalMinimumPayments + extraPayment;
    
    // Apply specific strategy sorting logic
    const getStrategyPriority = () => {
      switch (strategyType) {
        case "avalanche":
          // Highest interest rate first - most mathematically efficient
          return [...remainingDebts].sort((a, b) => b.interestRate - a.interestRate);
          
        case "snowball":
          // Lowest balance first - provides psychological wins
          return [...remainingDebts].sort((a, b) => a.balance - b.balance);
          
        case "hybrid":
          // Truly hybrid approach that combines aspects of both avalanche and snowball methods
          return [...remainingDebts].sort((a, b) => {
            // Calculate a combined score that considers both interest rate and balance
            // This creates a distinct third approach different from pure avalanche or snowball
            
            // Normalize interest rates (0-1 scale where 1 is highest interest)
            const maxInterest = Math.max(...remainingDebts.map(d => d.interestRate));
            const minInterest = Math.min(...remainingDebts.map(d => d.interestRate));
            const interestRangeA = maxInterest - minInterest;
            
            const normalizedInterestA = interestRangeA === 0 ? 
              0.5 : // If all debts have same interest rate, neutral value
              (a.interestRate - minInterest) / interestRangeA;
              
            const normalizedInterestB = interestRangeA === 0 ? 
              0.5 : 
              (b.interestRate - minInterest) / interestRangeA;
            
            // Normalize balances (0-1 scale where 0 is lowest balance)
            const maxBalance = Math.max(...remainingDebts.map(d => d.balance));
            const minBalance = Math.min(...remainingDebts.map(d => d.balance));
            const balanceRangeA = maxBalance - minBalance;
            
            const normalizedBalanceA = balanceRangeA === 0 ? 
              0.5 : // If all debts have same balance, neutral value
              1 - ((a.balance - minBalance) / balanceRangeA); // Invert so smaller balances get higher scores
              
            const normalizedBalanceB = balanceRangeA === 0 ? 
              0.5 : 
              1 - ((b.balance - minBalance) / balanceRangeA);
            
            // Calculate debt-to-payment ratio (efficiency metric)
            const ratioA = a.minimumPayment > 0 ? a.balance / a.minimumPayment : a.balance;
            const ratioB = b.minimumPayment > 0 ? b.balance / b.minimumPayment : b.balance;
            
            // Normalize ratio (0-1 scale where 0 is best ratio)
            const maxRatio = Math.max(...remainingDebts.map(d => 
              d.minimumPayment > 0 ? d.balance / d.minimumPayment : d.balance));
            const minRatio = Math.min(...remainingDebts.map(d => 
              d.minimumPayment > 0 ? d.balance / d.minimumPayment : d.balance));
            const ratioRange = maxRatio - minRatio;
            
            const normalizedRatioA = ratioRange === 0 ? 
              0.5 : 
              1 - ((ratioA - minRatio) / ratioRange); // Invert so better ratios get higher scores
              
            const normalizedRatioB = ratioRange === 0 ? 
              0.5 : 
              1 - ((ratioB - minRatio) / ratioRange);
            
            // Calculate monthly interest burden
            const interestBurdenA = a.balance * (a.interestRate / 100 / 12);
            const interestBurdenB = b.balance * (b.interestRate / 100 / 12);
            
            // Normalize interest burden (0-1 scale where 0 is lowest burden)
            const maxBurden = Math.max(...remainingDebts.map(d => d.balance * (d.interestRate / 100 / 12)));
            const minBurden = Math.min(...remainingDebts.map(d => d.balance * (d.interestRate / 100 / 12)));
            const burdenRange = maxBurden - minBurden;
            
            const normalizedBurdenA = burdenRange === 0 ? 
              0.5 : 
              1 - ((interestBurdenA - minBurden) / burdenRange); // Invert so lower burden gets higher score
              
            const normalizedBurdenB = burdenRange === 0 ? 
              0.5 : 
              1 - ((interestBurdenB - minBurden) / burdenRange);
            
            // Dynamic weighting based on debt profile
            // Analyze the overall debt situation to determine optimal strategy
            const totalDebt = remainingDebts.reduce((sum, d) => sum + d.balance, 0);
            const avgInterestRate = remainingDebts.reduce((sum, d) => sum + (d.balance / totalDebt) * d.interestRate, 0);
            const smallDebtCount = remainingDebts.filter(d => d.balance < (totalDebt / remainingDebts.length) * 0.5).length;
            const smallDebtRatio = remainingDebts.length > 0 ? smallDebtCount / remainingDebts.length : 0;
            
            // Calculate weights that will make hybrid truly different from avalanche and snowball
            // When interest rates are high, we care more about interest but still consider balance
            // When many small debts exist, we care more about quick wins but still consider interest
            const interestWeight = 0.4 + (avgInterestRate / 30) * 0.2; // 0.4-0.6 range based on avg interest
            const balanceWeight = 0.3 + smallDebtRatio * 0.2; // 0.3-0.5 range based on small debt ratio
            const ratioWeight = 0.15; // Fixed weight for payment efficiency
            const burdenWeight = 0.15; // Fixed weight for monthly interest burden
            
            // Final hybrid scores - a balanced approach that's distinct from avalanche and snowball
            const hybridScoreA = 
              (normalizedInterestA * interestWeight) + 
              (normalizedBalanceA * balanceWeight) + 
              (normalizedRatioA * ratioWeight) + 
              (normalizedBurdenA * burdenWeight);
              
            const hybridScoreB = 
              (normalizedInterestB * interestWeight) + 
              (normalizedBalanceB * balanceWeight) + 
              (normalizedRatioB * ratioWeight) + 
              (normalizedBurdenB * burdenWeight);
            
            // Higher score gets priority
            return hybridScoreB - hybridScoreA;
          });
      }
    };
    
    // Continue until all debts are paid off
    while (remainingDebts.length > 0 && month <= 360) { // Cap at 30 years
      let monthlyInterestPaid = 0;
      let monthlyPrincipalPaid = 0;
      let remainingPayment = totalMonthlyPayment;
      
      // First, make minimum payments on all debts
      remainingDebts = remainingDebts.map(debt => {
        const interestPayment = debt.balance * (debt.interestRate / 100 / 12);
        const minPayment = Math.min(debt.minimumPayment, debt.balance + interestPayment);
        const principalPayment = Math.min(minPayment - interestPayment, debt.balance);
        const newBalance = Math.max(0, debt.balance - principalPayment);
        
        // Track payments
        debt.interestPaid = (debt.interestPaid || 0) + interestPayment;
        debt.amountPaid = (debt.amountPaid || 0) + principalPayment + interestPayment;
        
        // Update totals
        totalInterest += interestPayment;
        totalPayments += principalPayment + interestPayment;
        remainingPayment -= minPayment;
        
        // Track monthly totals
        monthlyInterestPaid += interestPayment;
        monthlyPrincipalPaid += principalPayment;
        
        return {
          ...debt,
          balance: newBalance
        };
      });
      
      // Then, apply extra payment based on strategy priority
      if (remainingPayment > 0) {
        const priorityOrder = getStrategyPriority();
        
        // Apply remaining payment to debts in priority order
        for (const debt of priorityOrder) {
          // Find the actual debt object in our remaining debts array
          const targetDebt = remainingDebts.find(d => d.id === debt.id);
          
          if (targetDebt && targetDebt.balance > 0 && remainingPayment > 0) {
            const payment = Math.min(remainingPayment, targetDebt.balance);
            targetDebt.balance -= payment;
            targetDebt.amountPaid = (targetDebt.amountPaid || 0) + payment;
            
            totalPayments += payment;
            remainingPayment -= payment;
            monthlyPrincipalPaid += payment;
            
            // If this debt is now paid off, add it to the payoff order
            if (targetDebt.balance === 0 && !payoffOrder.includes(targetDebt.name)) {
              payoffOrder.push(targetDebt.name);
              // Calculate days to payoff for this debt
              targetDebt.daysToPayoff = month * 30; // Approximate days
            }
            
            // If all extra payment has been allocated, break out of the loop
            if (remainingPayment <= 0) break;
          }
        }
      }
      
      // Record monthly payment and remaining balance
      const totalRemainingBalance = remainingDebts.reduce((sum, debt) => sum + debt.balance, 0);
      
      monthlyPayments.push({
        month,
        payment: totalMonthlyPayment - remainingPayment, // Actual amount paid this month
        remainingBalance: totalRemainingBalance,
        interestPaid: monthlyInterestPaid,
        principalPaid: monthlyPrincipalPaid
      });
      
      // Remove paid off debts
      const previousLength = remainingDebts.length;
      remainingDebts = remainingDebts.filter(debt => debt.balance > 0);
      
      // If we paid off debts this month, recalculate payment allocation
      if (previousLength !== remainingDebts.length) {
        // Note: we don't need to adjust totalMonthlyPayment here as we want to keep 
        // the same total payment amount, just reallocate to remaining debts
      }
      
      month++;
    }
    
    // Calculate debt-free date
    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + month - 1);
    
    // Prepare debt progress information
    const debtProgress = debts.map(originalDebt => {
      const debt = remainingDebts.find(d => d.id === originalDebt.id) || 
                  { ...originalDebt, balance: 0, amountPaid: originalDebt.balance, interestPaid: 0, daysToPayoff: month * 30 };
      
      return {
        id: originalDebt.id,
        name: originalDebt.name,
        initialBalance: originalDebt.balance,
        amountPaid: debt.amountPaid || 0,
        interestPaid: debt.interestPaid || 0,
        daysToPayoff: debt.daysToPayoff || month * 30 // If debt wasn't paid off, use max time
      };
    });
    
    return {
      strategy: strategyType,
      totalInterest,
      totalPayments,
      monthsToPayoff: month - 1,
      debtFreeDate,
      payoffOrder,
      monthlyPayments,
      debtProgress
    };
  };

  const refreshDebts = async () => {
    try {
      setFetchingDebts(true)
      setFetchError(null)
      
      const existingDebts = await getDebts()
      
      if (existingDebts && existingDebts.length > 0) {
        // Map the database debt format to the calculator's format
        const mappedDebts: Debt[] = existingDebts.map(debt => ({
          id: debt.id,
          name: debt.name,
          balance: debt.principal,
          interestRate: debt.interest_rate,
          minimumPayment: debt.minimum_payment || 0
        }))
        
        setDebts(mappedDebts)
      } else {
        setFetchError("No debts found. Please add debts in the Debt Management section first.")
      }
    } catch (error) {
      console.error("Error fetching debts:", error)
      setFetchError("Failed to load your debts. Please try again.")
    } finally {
      setFetchingDebts(false)
    }
  }

  const getBestStrategy = () => {
    if (results.length === 0) return null
    
    // Find the strategy with the lowest total interest
    return results.reduce((best, current) => 
      current.totalInterest < best.totalInterest ? current : best
    )
  }

  const bestStrategy = getBestStrategy()
  const selectedStrategy = results.find(r => r.strategy === strategy) || results[0]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Repayment Strategy Calculator</CardTitle>
              <CardDescription>
                Compare different repayment strategies to find the most efficient way to become debt-free.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshDebts} 
              disabled={fetchingDebts}
            >
              {fetchingDebts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Debts
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetchingDebts ? (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-lg border border-dashed">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
              <p className="text-lg font-medium text-muted-foreground">Loading your debts...</p>
            </div>
          ) : fetchError ? (
            <div className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-8 text-center shadow-sm">
              <p className="text-destructive text-lg font-semibold mb-4">{fetchError}</p>
              <p className="text-muted-foreground mb-4">
                We need your debt information to calculate repayment strategies.
              </p>
              <Button variant="outline" asChild>
                <a href="/debt-management">Add Debts</a>
              </Button>
            </div>
          ) : debts.length === 0 ? (
            <div className="rounded-lg border-2 border-muted p-8 text-center bg-muted/10 shadow-sm">
              <p className="text-lg font-semibold mb-4">No debts found</p>
              <p className="text-muted-foreground mb-6">
                Add your debts to see personalized repayment strategies and save money on interest.
              </p>
              <Button asChild>
                <a href="/debt-management">Add Your First Debt</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium flex items-center mb-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                  Your Current Debts
                </h3>
                <div className="rounded-lg border overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Debt Name</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Balance</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Interest Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Min. Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debts.map((debt, index) => (
                        <tr key={debt.id} className={`border-b ${index % 2 === 0 ? 'bg-muted/10' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium">{debt.name}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(debt.balance)}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${debt.interestRate > 15 ? 'bg-destructive/10 text-destructive' : debt.interestRate > 8 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {formatPercentage(debt.interestRate)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(debt.minimumPayment)}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/20 font-medium">
                        <td className="px-4 py-3 text-sm">Total</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">
                          {formatCurrency(debts.reduce((sum, debt) => sum + debt.balance, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatPercentage(
                            debts.reduce((sum, debt) => sum + debt.balance * debt.interestRate, 0) / 
                            debts.reduce((sum, debt) => sum + debt.balance, 0)
                          )}
                          <span className="text-xs text-muted-foreground ml-1">(avg)</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">
                          {formatCurrency(debts.reduce((sum, debt) => sum + debt.minimumPayment, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {debts.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Repayment Strategy</CardTitle>
              <CardDescription>
                Choose a repayment strategy and add extra payment to see how it affects your payoff timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="space-y-4">
                  <Label>Strategy</Label>
                  <RadioGroup
                    value={strategy}
                    onValueChange={(value) => setStrategy(value as "avalanche" | "snowball" | "hybrid")}
                    className="grid gap-4 md:grid-cols-3"
                  >
                    <div className={`flex flex-col rounded-lg border p-5 transition-all ${strategy === "avalanche" ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50 hover:shadow-sm"}`}>
                      <div className="flex items-start space-x-2 mb-2">
                        <RadioGroupItem value="avalanche" id="avalanche" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="avalanche" className="text-base font-semibold cursor-pointer">Avalanche Method</Label>
                          <div className="text-sm text-muted-foreground mt-1">
                            Pay highest interest rate first
                          </div>
                        </div>
                        <TooltipProvider>
                          <TooltipComponent>
                            <TooltipTrigger asChild>
                              <Info className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="p-4 max-w-xs">
                              <p className="font-medium mb-2">The Avalanche Method</p>
                              <p className="mb-2">Prioritizes debts with the highest interest rates first, regardless of balance.</p>
                              <p className="text-sm text-muted-foreground">This mathematically optimal approach minimizes the total interest paid over time.</p>
                            </TooltipContent>
                          </TooltipComponent>
                        </TooltipProvider>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground bg-background/80 p-2 rounded">
                        <span className="font-medium text-primary">Best for:</span> Minimizing total interest paid
                      </div>
                    </div>
                    
                    <div className={`flex flex-col rounded-lg border p-5 transition-all ${strategy === "snowball" ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50 hover:shadow-sm"}`}>
                      <div className="flex items-start space-x-2 mb-2">
                        <RadioGroupItem value="snowball" id="snowball" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="snowball" className="text-base font-semibold cursor-pointer">Snowball Method</Label>
                          <div className="text-sm text-muted-foreground mt-1">
                            Pay smallest balance first
                          </div>
                        </div>
                        <TooltipProvider>
                          <TooltipComponent>
                            <TooltipTrigger asChild>
                              <Info className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="p-4 max-w-xs">
                              <p className="font-medium mb-2">The Snowball Method</p>
                              <p className="mb-2">Prioritizes debts with the smallest balances first, regardless of interest rate.</p>
                              <p className="text-sm text-muted-foreground">This psychologically rewarding approach provides quick wins to build momentum.</p>
                            </TooltipContent>
                          </TooltipComponent>
                        </TooltipProvider>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground bg-background/80 p-2 rounded">
                        <span className="font-medium text-primary">Best for:</span> Motivation through quick wins
                      </div>
                    </div>
                    
                    <div className={`flex flex-col rounded-lg border p-5 transition-all ${strategy === "hybrid" ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/50 hover:shadow-sm"}`}>
                      <div className="flex items-start space-x-2 mb-2">
                        <RadioGroupItem value="hybrid" id="hybrid" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="hybrid" className="text-base font-semibold cursor-pointer">Hybrid Method</Label>
                          <div className="text-sm text-muted-foreground mt-1">
                            Balanced approach for optimal results
                          </div>
                        </div>
                        <TooltipProvider>
                          <TooltipComponent>
                            <TooltipTrigger asChild>
                              <Info className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="p-4 max-w-xs">
                              <p className="font-medium mb-2">The Hybrid Method</p>
                              <p className="mb-2">Balances multiple factors including interest rates, balances, and payment efficiency.</p>
                              <p className="text-sm text-muted-foreground">This intelligent approach adapts to your specific debt situation for optimal results.</p>
                            </TooltipContent>
                          </TooltipComponent>
                        </TooltipProvider>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground bg-background/80 p-2 rounded">
                        <span className="font-medium text-primary">Best for:</span> Balancing math and psychology
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-4 bg-muted/10 p-5 rounded-lg border mt-6">
                  <h3 className="text-base font-medium flex items-center mb-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                    Extra Monthly Payment
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="extra-payment" className="text-sm font-medium">How much extra can you pay each month?</Label>
                      <span className="text-base font-semibold text-primary">{formatCurrency(extraPayment)}</span>
                    </div>
                    <Slider
                      id="extra-payment"
                      min={0}
                      max={2000}
                      step={50}
                      value={[extraPayment]}
                      onValueChange={(value) => setExtraPayment(value[0])}
                      className="py-4"
                    />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>$0</span>
                      <span>$500</span>
                      <span>$1,000</span>
                      <span>$1,500</span>
                      <span>$2,000</span>
                    </div>
                    <div className="flex justify-end mt-2">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={extraPayment}
                          onChange={(e) => setExtraPayment(Number(e.target.value))}
                          className="w-32 pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


        </>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="text-sm text-muted-foreground">Calculating repayment strategies...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <div className="text-center text-destructive">
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Comparison</CardTitle>
            <CardDescription>
              See how different repayment strategies compare in terms of total interest, time to debt-free, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-6 md:grid-cols-3">
                  {results.map((result) => (
                    <Card key={result.strategy} className={bestStrategy?.strategy === result.strategy ? "border-2 border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg capitalize">{result.strategy} Strategy</CardTitle>
                        <CardDescription>
                          {result.strategy === "avalanche" 
                            ? "Highest interest rate first" 
                            : result.strategy === "snowball" 
                              ? "Smallest balance first" 
                              : "Balance of both approaches"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Interest:</span>
                            <span className="font-medium">{formatCurrency(result.totalInterest)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Payments:</span>
                            <span className="font-medium">{formatCurrency(result.totalPayments)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Months to Payoff:</span>
                            <span className="font-medium">{result.monthsToPayoff}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Debt-Free Date:</span>
                            <span className="font-medium">
                              {result.debtFreeDate.toLocaleDateString(undefined, { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {bestStrategy && (
                  <div className="mt-6">
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Best Strategy</h4>
                            <p className="mt-1 text-sm text-muted-foreground capitalize">
                              {bestStrategy.strategy} Strategy
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(bestStrategy.totalInterest)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Interest</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="comparison" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Interest Paid</CardTitle>
                      <CardDescription>
                        Lower is better - this is the total cost of your debt beyond the principal
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: "Total Interest",
                                ...results.reduce((acc, result) => ({
                                  ...acc,
                                  [result.strategy]: result.totalInterest,
                                }), {}),
                              },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: "$", angle: -90, position: "insideLeft" }} />
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Legend />
                            {results.map((result, index) => (
                              <Bar 
                                key={result.strategy} 
                                dataKey={result.strategy} 
                                fill={index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f59e0b"} 
                                name={`${result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)} Strategy`}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                        {results.map((result) => (
                          <div key={`interest-${result.strategy}`} className="rounded-md border p-2">
                            <div className="font-medium capitalize">{result.strategy}</div>
                            <div className="text-lg font-bold">{formatCurrency(result.totalInterest)}</div>
                            {bestStrategy?.strategy === result.strategy && (
                              <div className="mt-1 text-xs text-green-600 font-medium">Best Choice</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Time to Debt Freedom</CardTitle>
                      <CardDescription>
                        Months until you're completely debt-free with each strategy
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: "Months to Payoff",
                                ...results.reduce((acc, result) => ({
                                  ...acc,
                                  [result.strategy]: result.monthsToPayoff,
                                }), {}),
                              },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: "Months", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            {results.map((result, index) => (
                              <Bar 
                                key={result.strategy} 
                                dataKey={result.strategy} 
                                fill={index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f59e0b"} 
                                name={`${result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)} Strategy`}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                        {results.map((result) => (
                          <div key={`time-${result.strategy}`} className="rounded-md border p-2">
                            <div className="font-medium capitalize">{result.strategy}</div>
                            <div className="text-lg font-bold">{result.monthsToPayoff} months</div>
                            <div className="text-xs text-muted-foreground">
                              {result.debtFreeDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Interest vs. Principal Over Time</CardTitle>
                    <CardDescription>
                      See how much of your payment goes to interest vs. principal with each strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="avalanche" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        {results.map((result) => (
                          <TabsTrigger key={`tab-${result.strategy}`} value={result.strategy} className="capitalize">
                            {result.strategy}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {results.map((result) => (
                        <TabsContent key={`content-${result.strategy}`} value={result.strategy} className="mt-4">
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={result.monthlyPayments.filter((_, i) => i % 3 === 0)} // Sample every 3rd month for clarity
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" label={{ value: "Month", position: "bottom" }} />
                                <YAxis label={{ value: "Amount ($)", angle: -90, position: "insideLeft" }} />
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="interestPaid"
                                  name="Interest"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="principalPaid"
                                  name="Principal"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 text-sm text-muted-foreground">
                            <p>With the <span className="font-medium capitalize">{result.strategy}</span> strategy:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>You'll pay <span className="font-medium">{formatCurrency(result.totalInterest)}</span> in interest</li>
                              <li>You'll be debt-free in <span className="font-medium">{result.monthsToPayoff} months</span></li>
                              <li>Your debts will be paid off in this order: <span className="font-medium">{result.payoffOrder.join(', ')}</span></li>
                            </ul>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Debt Distribution</CardTitle>
                      <CardDescription>
                        How your current debt is distributed across accounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={debts.map(debt => ({
                                name: debt.name,
                                value: debt.balance
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {debts.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Interest Rate Comparison</CardTitle>
                      <CardDescription>
                        Higher interest rates cost you more over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={debts.map(debt => ({
                              name: debt.name,
                              interestRate: debt.interestRate,
                              monthlyInterest: debt.balance * (debt.interestRate / 100 / 12)
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === "interestRate" ? `${value}%` : formatCurrency(value as number),
                                name === "interestRate" ? "Interest Rate" : "Monthly Interest Cost"
                              ]} 
                            />
                            <Legend />
                            <Bar dataKey="interestRate" name="Interest Rate (%)" fill="#3b82f6" />
                            <Bar dataKey="monthlyInterest" name="Monthly Interest ($)" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Balance Reduction Over Time</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="strategy-select">Select Strategy:</Label>
                      <select
                        id="strategy-select"
                        className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value as "avalanche" | "snowball" | "hybrid")}
                      >
                        {results.map(result => (
                          <option key={result.strategy} value={result.strategy}>
                            {result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)} Strategy
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={selectedStrategy?.monthlyPayments || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" label={{ value: "Months", position: "bottom" }} />
                        <YAxis label={{ value: "Amount", angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          formatter={(value) => formatCurrency(value as number)}
                          labelFormatter={(label) => `Month ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="remainingBalance"
                          name="Remaining Balance"
                          stroke="#3b82f6"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left text-sm font-medium">Month</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Payment</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Remaining Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStrategy?.monthlyPayments.slice(0, 12).map((row) => (
                          <tr key={row.month} className="border-b">
                            <td className="px-4 py-2 text-sm">{row.month}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.payment)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.remainingBalance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/50 font-medium">
                          <td className="px-4 py-2 text-sm">...</td>
                          <td className="px-4 py-2 text-right text-sm">...</td>
                          <td className="px-4 py-2 text-right text-sm">...</td>
                        </tr>
                        {selectedStrategy?.monthlyPayments.slice(-12).map((row) => (
                          <tr key={row.month} className="border-b">
                            <td className="px-4 py-2 text-sm">{row.month}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.payment)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.remainingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : debts.length === 0 ? (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Add debts to see repayment strategy results.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
} 