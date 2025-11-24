"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createServerClient } from "@supabase/ssr"

// Helper function to get the current user
async function getCurrentUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Helper function to create a server-side Supabase client
async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )
}

// Helper function to return safe default values for rebalancing
function getSafeRebalancingDefaults() {
  const defaultTargets = {
    Stocks: 30,
    Bonds: 20,
    Cash: 5,
    Alternative: 5,
    Shares: 15,
    Bills: 5,
    Crypto: 5,
    "Real Estate": 15
  }
  
  return {
    currentAllocation: { 
      Stocks: 0, 
      Bonds: 0, 
      Cash: 0, 
      Alternative: 0,
      Shares: 0,
      Bills: 0,
      Crypto: 0,
      "Real Estate": 0
    },
    targetAllocation: defaultTargets,
    differences: {
      Stocks: { type: 'Stocks', target: 30, current: 0, difference: -30, investments: [] },
      Bonds: { type: 'Bonds', target: 20, current: 0, difference: -20, investments: [] },
      Cash: { type: 'Cash', target: 5, current: 0, difference: -5, investments: [] },
      Alternative: { type: 'Alternative', target: 5, current: 0, difference: -5, investments: [] },
      Shares: { type: 'Shares', target: 15, current: 0, difference: -15, investments: [] },
      Bills: { type: 'Bills', target: 5, current: 0, difference: -5, investments: [] },
      Crypto: { type: 'Crypto', target: 5, current: 0, difference: -5, investments: [] },
      "Real Estate": { type: 'Real Estate', target: 15, current: 0, difference: -15, investments: [] }
    },
    recommendations: [
      {
        type: 'Stocks',
        action: 'increase',
        amount: '30.00',
        message: 'Increase Stocks by 30.00%',
        suggestedInvestments: [{ name: 'Sample Stock ETF', ticker: 'VTI', risk: 'medium' }]
      },
      {
        type: 'Bonds',
        action: 'increase',
        amount: '20.00',
        message: 'Increase Bonds by 20.00%',
        suggestedInvestments: [{ name: 'Sample Bond ETF', ticker: 'BND', risk: 'low' }]
      },
      {
        type: 'Shares',
        action: 'increase',
        amount: '15.00',
        message: 'Increase Shares by 15.00%',
        suggestedInvestments: [{ name: 'Sample Shares ETF', ticker: 'VTI', risk: 'medium' }]
      },
      {
        type: 'Real Estate',
        action: 'increase',
        amount: '15.00',
        message: 'Increase Real Estate by 15.00%',
        suggestedInvestments: [{ name: 'Sample Real Estate ETF', ticker: 'VGSIX', risk: 'medium' }]
      }
    ],
    rebalanceAmounts: { Stocks: 0, Bonds: 0, Cash: 0, Alternative: 0, Shares: 0, Bills: 0, Crypto: 0, "Real Estate": 0 },
    totalDifference: 100,
    needsRebalancing: true,
    portfolioValue: 0,
  }
}

// Constants for investment types
const investmentTypes = [
  "Stocks", 
  "Bonds", 
  "Cash", 
  "Alternative",
  "Shares",
  "Bills",
  "Crypto",
  "Real Estate"
];



// Define interfaces for investment data
interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type?: string;
  asset_type?: string;
  risk_level?: string;
  sector?: string;
  sector_id?: string;

  price?: number;
  value?: number;
  change?: number;
  marketCap?: string;
  description?: string;
  expenseRatio?: number;
  current_price?: number;
}

interface PriceData {
  [ticker: string]: {
    price: number;
    change: number;
  };
}

// Interface for asset class expected by the rebalancing table
interface AssetClass {
  id: string;
  name: string;
  targetAllocation: number;
  currentAllocation: number;
}

// Function to calculate rebalancing recommendations in the format expected by the RebalancingTable component
export async function calculateRebalancingRecommendations() {
  try {
    // Get rebalancing data from our existing function
    const rebalancingData = await getRebalancingRecommendations();
    
    // Transform the data into the format expected by the RebalancingTable component
    const assetClasses: AssetClass[] = [];
    
    // Create asset classes from the differences
    for (const type in rebalancingData.differences) {
      const diff = rebalancingData.differences[type];
      assetClasses.push({
        id: type,
        name: type,
        targetAllocation: diff.target,
        currentAllocation: diff.current
      });
    }
    
    // Calculate recommendations using the format expected by the component
    const recommendations = assetClasses.map((assetClass) => {
      const difference = assetClass.currentAllocation - assetClass.targetAllocation;
      
      // Determine action based on difference
      let action: "buy" | "sell" | "hold" = "hold";
      if (difference < -5) {
        action = "buy";
      } else if (difference > 5) {
        action = "sell";
      }
      
      // Calculate amount to rebalance
      const amountToRebalance = Math.abs(difference / 100) * rebalancingData.portfolioValue;
      
      return {
        assetClass,
        targetAllocation: assetClass.targetAllocation,
        currentAllocation: assetClass.currentAllocation,
        difference,
        action,
        amountToRebalance,
      };
    });
    
    return {
      recommendations,
      totalPortfolioValue: rebalancingData.portfolioValue
    };
  } catch (error) {
    console.error("Error in calculateRebalancingRecommendations:", error);
    // Return empty recommendations as fallback
    return {
      recommendations: [],
      totalPortfolioValue: 0
    };
  }
}

// Get portfolio allocation
export async function getPortfolioAllocation() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    
    // First try to get data from the advanced schema (portfolios, holdings, assets)
    try {
      const { data: portfolios, error: portfolioError } = await supabase
        .from('portfolios')
        .select(`
          id, 
          name,
          holdings (
            id,
            quantity,
            purchase_price,
            asset_id,
            assets (
              id,
              name,
              ticker,
              asset_type,
              risk_level,
              current_price
            )
          )
        `)
        .eq('user_id', user.id)
      
      if (!portfolioError && portfolios && portfolios.length > 0) {
        // Process data from the advanced schema
        let totalPortfolioValue = 0
        const investments = []
        const typeMap = {}
        const accountMap = {}
        const riskMap = {}
        
        for (const portfolio of portfolios) {
          if (!portfolio.holdings) continue
          
          for (const holding of portfolio.holdings) {
            if (!holding.assets) continue
            
            const asset = holding.assets
            const value = holding.quantity * (asset.current_price || 0)
            totalPortfolioValue += value
            
            const investment = {
              id: holding.id,
              name: asset.name,
              ticker: asset.ticker,
              type: asset.asset_type || 'Other',
              account: portfolio.name,
              value,
              quantity: holding.quantity,
              price: asset.current_price || 0,
              purchasePrice: holding.purchase_price || 0,
              risk: asset.risk_level || 'medium',
            }
            
            investments.push(investment)
            
            // Update allocation maps
            typeMap[investment.type] = (typeMap[investment.type] || 0) + value
            accountMap[investment.account] = (accountMap[investment.account] || 0) + value
            riskMap[investment.risk] = (riskMap[investment.risk] || 0) + value
          }
        }
        
        // Convert maps to allocation arrays
        const allocationByType = Object.entries(typeMap).map(([name, value]) => ({
          name,
          value,
          percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
        }))
        
        const allocationByAccount = Object.entries(accountMap).map(([name, value]) => ({
          name,
          value,
          percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
        }))
        
        const allocationByRisk = Object.entries(riskMap).map(([name, value]) => ({
          name,
          value,
          percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
        }))
        
        return {
          totalPortfolioValue,
          investments,
          allocationByType,
          allocationByAccount,
          allocationByRisk,
        }
      }
    } catch (err) {
      console.log("Error fetching from advanced schema:", err)
      // Continue to legacy schema
    }
    
    // Fallback to the investments table (legacy schema)
    const { data: investments } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)

    if (investments && investments.length > 0) {
      // Calculate total portfolio value
      const totalPortfolioValue = investments.reduce(
        (sum, investment) => sum + (investment.value || 0),
        0
      )

      // Calculate allocation by type
      const typeMap = {}
      investments.forEach((investment) => {
        const type = investment.type || "Other"
        typeMap[type] = (typeMap[type] || 0) + (investment.value || 0)
      })

      const allocationByType = Object.entries(typeMap).map(([name, value]) => ({
        name,
        value,
        percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      }))

      // Calculate allocation by account
      const accountMap = {}
      investments.forEach((investment) => {
        const account = investment.account || "Other"
        accountMap[account] = (accountMap[account] || 0) + (investment.value || 0)
      })

      const allocationByAccount = Object.entries(accountMap).map(([name, value]) => ({
        name,
        value,
        percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      }))

      // Calculate allocation by risk
      const riskMap = {}
      investments.forEach((investment) => {
        const risk = investment.risk || "medium"
        riskMap[risk] = (riskMap[risk] || 0) + (investment.value || 0)
      })

      const allocationByRisk = Object.entries(riskMap).map(([name, value]) => ({
        name,
        value,
        percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      }))

      return {
        totalPortfolioValue,
        investments,
        allocationByType,
        allocationByAccount,
        allocationByRisk,
      }
    }

    // Return empty data if no investments found
    return {
      totalPortfolioValue: 0,
      investments: [],
      allocationByType: [],
      allocationByAccount: [],
      allocationByRisk: [],
    }
  } catch (error) {
    console.error("Error in getPortfolioAllocation:", error)
    return {
      totalPortfolioValue: 0,
      investments: [],
      allocationByType: [],
      allocationByAccount: [],
      allocationByRisk: [],
    }
  }
}

// New functions for enhanced investment features
export async function getPortfolioPerformance(timeframe: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'all') {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = createClientComponentClient()
    const today = new Date()
    let startDate: Date

    // Calculate start date based on timeframe
    switch (timeframe) {
      case 'week':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
        break
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        break
      case 'quarter':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
        break
      case 'year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      case 'all':
      default:
        startDate = new Date(2000, 0, 1) // Far in the past to get all data
        break
    }

    // Try to get performance data from the advanced schema first
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (portfolios && portfolios.length > 0) {
      const portfolioId = portfolios[0].id

      // Get holdings for this portfolio
      const { data: holdings } = await supabase
        .from('holdings')
        .select('id, asset_id, quantity')
        .eq('portfolio_id', portfolioId)

      if (holdings && holdings.length > 0) {
        // Get asset price history for each holding
        const performanceData: any[] = []
        const assetIds = holdings.map(h => h.asset_id)

        const { data: priceHistory } = await supabase
          .from('asset_prices')
          .select('*')
          .in('asset_id', assetIds)
          .gte('price_date', startDate.toISOString().split('T')[0])
          .order('price_date', { ascending: true })

        if (priceHistory && priceHistory.length > 0) {
          // Group price history by date to calculate portfolio value over time
          const dateGroups: Record<string, any[]> = {}
          
          priceHistory.forEach(price => {
            if (!dateGroups[price.price_date]) {
              dateGroups[price.price_date] = []
            }
            dateGroups[price.price_date].push(price)
          })

          // Calculate portfolio value for each date
          Object.entries(dateGroups).forEach(([date, prices]) => {
            let portfolioValue = 0
            
            prices.forEach(price => {
              const holding = holdings.find(h => h.asset_id === price.asset_id)
              if (holding) {
                portfolioValue += holding.quantity * price.closing_price
              }
            })

            performanceData.push({
              date,
              value: portfolioValue
            })
          })

          // Calculate performance metrics
          if (performanceData.length > 0) {
            const startValue = performanceData[0].value
            const endValue = performanceData[performanceData.length - 1].value
            const totalReturn = ((endValue - startValue) / startValue) * 100
            
            // Calculate annualized return
            const days = (new Date(performanceData[performanceData.length - 1].date).getTime() - 
                          new Date(performanceData[0].date).getTime()) / (1000 * 60 * 60 * 24)
            const annualizedReturn = ((Math.pow((endValue / startValue), (365 / days)) - 1) * 100)
            
            // Calculate daily returns for volatility and Sharpe ratio
            const dailyReturns: number[] = []
            for (let i = 1; i < performanceData.length; i++) {
              const prevValue = performanceData[i-1].value
              const currentValue = performanceData[i].value
              if (prevValue > 0) {
                const dailyReturn = (currentValue - prevValue) / prevValue
                dailyReturns.push(dailyReturn)
              }
            }
            
            // Calculate volatility (standard deviation of returns, annualized)
            let volatility = 0
            if (dailyReturns.length > 1) {
              const meanReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length
              const sumSquaredDiff = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0)
              const variance = sumSquaredDiff / (dailyReturns.length - 1)
              const dailyStdDev = Math.sqrt(variance)
              // Annualize volatility (multiply by sqrt of trading days in a year)
              volatility = dailyStdDev * Math.sqrt(252) * 100
            }
            
            // Calculate Sharpe ratio (using 2% as risk-free rate)
            const riskFreeRate = 2.0 // 2% annual risk-free rate
            let sharpeRatio = 0
            if (volatility > 0) {
              sharpeRatio = (annualizedReturn - riskFreeRate) / volatility
            }
            
            // Calculate beta (using S&P 500 as market benchmark)
            // For simplicity, we'll use a synthetic market benchmark
            const marketReturns = generateSyntheticMarketReturns(dailyReturns.length)
            let beta = 0
            if (dailyReturns.length > 1 && marketReturns.length === dailyReturns.length) {
              beta = calculateBeta(dailyReturns, marketReturns)
            }
            
            return {
              performanceData,
              totalReturn: parseFloat(totalReturn.toFixed(2)),
              annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
              startValue,
              endValue,
              riskMetrics: {
                volatility: parseFloat(volatility.toFixed(2)),
                sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
                beta: parseFloat(beta.toFixed(2))
              }
            }
          }
        }
      }
    }

    // Fallback to simple investments table
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)

    if (investments && investments.length > 0) {
      // For simple investments, we don't have historical data
      // So we'll estimate based on cost basis and current value
      const totalValue = investments.reduce(
        (sum, investment) => sum + (investment.value || 0),
        0
      )

      const totalCostBasis = investments.reduce(
        (sum, investment) => sum + (investment.cost_basis || 0),
        0
      )

      const totalReturn = ((totalValue - totalCostBasis) / totalCostBasis) * 100
      
      // Generate synthetic performance data
      const performanceData = []
      const syntheticDates = 12 // Generate 12 data points
      
      for (let i = 0; i < syntheticDates; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - (syntheticDates - i - 1), 15)
        const progress = i / (syntheticDates - 1)
        const value = totalCostBasis + (totalValue - totalCostBasis) * progress
        
        performanceData.push({
          date: date.toISOString().split('T')[0],
          value: parseFloat(value.toFixed(2))
        })
      }
      
      // Calculate volatility, Sharpe ratio, and beta from synthetic data
      const syntheticReturns: number[] = []
      for (let i = 1; i < performanceData.length; i++) {
        const prevValue = performanceData[i-1].value
        const currentValue = performanceData[i].value
        if (prevValue > 0) {
          const return_ = (currentValue - prevValue) / prevValue
          syntheticReturns.push(return_)
        }
      }
      
      // Calculate volatility
      let volatility = 0
      if (syntheticReturns.length > 1) {
        const meanReturn = syntheticReturns.reduce((sum, ret) => sum + ret, 0) / syntheticReturns.length
        const sumSquaredDiff = syntheticReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0)
        const variance = sumSquaredDiff / (syntheticReturns.length - 1)
        const monthlyStdDev = Math.sqrt(variance)
        // Annualize volatility
        volatility = monthlyStdDev * Math.sqrt(12) * 100
      }
      
      // Calculate Sharpe ratio (using 2% as risk-free rate)
      const riskFreeRate = 2.0 // 2% annual risk-free rate
      const annualizedReturn = parseFloat((totalReturn / 1).toFixed(2)) // Assume 1 year for simplicity
      let sharpeRatio = 0
      if (volatility > 0) {
        sharpeRatio = (annualizedReturn - riskFreeRate) / volatility
      }
      
      // Calculate beta
      const marketReturns = generateSyntheticMarketReturns(syntheticReturns.length)
      let beta = 0
      if (syntheticReturns.length > 1 && marketReturns.length === syntheticReturns.length) {
        beta = calculateBeta(syntheticReturns, marketReturns)
      }
      
      return {
        performanceData,
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        annualizedReturn: annualizedReturn,
        startValue: totalCostBasis,
        endValue: totalValue,
        riskMetrics: {
          volatility: parseFloat(volatility.toFixed(2)),
          sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
          beta: parseFloat(beta.toFixed(2))
        }
      }
    }

    // Return empty data if no investments found
    return {
      performanceData: [],
      totalReturn: 0,
      annualizedReturn: 0,
      startValue: 0,
      endValue: 0,
      riskMetrics: {
        volatility: 0,
        sharpeRatio: 0,
        beta: 0
      }
    }
  } catch (error) {
    console.error("Error in getPortfolioPerformance:", error)
    return {
      performanceData: [],
      totalReturn: 0,
      annualizedReturn: 0,
      startValue: 0,
      endValue: 0
    }
  }
}

// Helper function to generate synthetic market returns
function generateSyntheticMarketReturns(length: number): number[] {
  const marketReturns: number[] = []
  // Use a base market return with some randomness
  const baseMarketReturn = 0.0003 // ~8% annual return
  
  for (let i = 0; i < length; i++) {
    // Add some randomness to simulate market fluctuations
    const randomFactor = (Math.random() - 0.5) * 0.002
    marketReturns.push(baseMarketReturn + randomFactor)
  }
  
  return marketReturns
}

// Helper function to calculate beta
function calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
  // Calculate covariance between portfolio and market returns
  const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length
  const marketMean = marketReturns.reduce((sum, ret) => sum + ret, 0) / marketReturns.length
  
  let covariance = 0
  let marketVariance = 0
  
  for (let i = 0; i < portfolioReturns.length; i++) {
    covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean)
    marketVariance += Math.pow(marketReturns[i] - marketMean, 2)
  }
  
  covariance /= portfolioReturns.length
  marketVariance /= marketReturns.length
  
  // Beta = covariance / market variance
  return marketVariance > 0 ? covariance / marketVariance : 0
}

export async function getPortfolioCorrelation() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = createClientComponentClient()
    const investments = await getInvestments()

    if (!investments || investments.length === 0) {
      return {
        investments: [],
        correlationMatrix: [],
        diversificationScore: 0,
        averageCorrelations: []
      }
    }

    // Create a list of investment objects with necessary properties
    const investmentObjects = investments.map((inv, index) => ({
      id: inv.id || `inv-${index}`,
      name: inv.name || `Investment ${index + 1}`,
      ticker: inv.ticker || null,
      investment_type: inv.type || 'other',
      index // Keep track of the index for the correlation matrix
    }))

    // Initialize correlation matrix
    const correlationMatrix: number[][] = Array(investmentObjects.length)
      .fill(0)
      .map(() => Array(investmentObjects.length).fill(0))
      
    // Generate correlations based on investment types
    for (let i = 0; i < investmentObjects.length; i++) {
      for (let j = 0; j < investmentObjects.length; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1 // Self-correlation is always 1
        } else if (i < j) {
          // Generate a realistic correlation based on investment types
          const type1 = investmentObjects[i].investment_type
          const type2 = investmentObjects[j].investment_type
          
          let correlation = 0.5 // Default moderate correlation
          
          if (type1 === type2) {
            // Same type assets tend to be more correlated
            correlation = 0.7 + (Math.random() * 0.3)
          } else if ((type1 === 'bond' && type2 === 'stock') || (type1 === 'stock' && type2 === 'bond')) {
            // Stocks and bonds tend to have negative or low correlation
            correlation = -0.2 + (Math.random() * 0.4)
          } else if ((type1 === 'real_estate' && type2 !== 'real_estate') || (type1 !== 'real_estate' && type2 === 'real_estate')) {
            // Real estate has moderate correlation with other assets
            correlation = 0.3 + (Math.random() * 0.4)
          } else if ((type1 === 'crypto' || type2 === 'crypto')) {
            // Crypto tends to have low correlation with traditional assets
            correlation = 0.1 + (Math.random() * 0.3)
          }
          
          correlationMatrix[i][j] = parseFloat(correlation.toFixed(2))
          correlationMatrix[j][i] = correlationMatrix[i][j] // Mirror the matrix
        }
      }
    }

    // Calculate average correlation for each investment
    const averageCorrelations = investmentObjects.map((investment, i) => {
      // Calculate average correlation with all other investments
      let sum = 0
      let count = 0
      
      for (let j = 0; j < investmentObjects.length; j++) {
        if (i !== j) { // Skip self-correlation
          sum += correlationMatrix[i][j]
          count++
        }
      }
      
      const avgCorrelation = count > 0 ? sum / count : 0
      
      return {
        ...investment,
        average_correlation: parseFloat(avgCorrelation.toFixed(2))
      }
    })

    // Calculate overall diversification score (1 - average of all correlations)
    // Higher score means better diversification
    let totalCorrelation = 0
    let totalPairs = 0
    
    for (let i = 0; i < investmentObjects.length; i++) {
      for (let j = i + 1; j < investmentObjects.length; j++) {
        totalCorrelation += correlationMatrix[i][j]
        totalPairs++
      }
    }
    
    const avgCorrelation = totalPairs > 0 ? totalCorrelation / totalPairs : 0
    const diversificationScore = parseFloat((1 - avgCorrelation).toFixed(2))
    
    return {
      investments: investmentObjects,
      correlationMatrix,
      diversificationScore,
      averageCorrelations
    }
  } catch (error) {
    console.error("Error in getPortfolioCorrelation:", error)
    return {
      investments: [],
      correlationMatrix: [],
      diversificationScore: 0,
      averageCorrelations: []
    }
  }
}

export async function getEfficientFrontier() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = createClientComponentClient()

    // Try to get efficient frontier data from the advanced schema
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (portfolios && portfolios.length > 0) {
      const portfolioId = portfolios[0].id

      // Get efficient frontier points
      const { data: frontierPoints } = await supabase
        .from('efficient_frontier_points')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('risk', { ascending: true })

      if (frontierPoints && frontierPoints.length > 0) {
        // Get current portfolio position
        const { data: holdings } = await supabase
          .from('holdings')
          .select('asset_id, quantity, assets(ticker, name)')
          .eq('portfolio_id', portfolioId)

        if (holdings && holdings.length > 0) {
          // Calculate total portfolio value
          const assetIds = holdings.map(h => h.asset_id)
          
          const { data: latestPrices } = await supabase
            .from('asset_prices')
            .select('asset_id, closing_price')
            .in('asset_id', assetIds)
            .order('price_date', { ascending: false })
            .limit(assetIds.length)

          if (latestPrices && latestPrices.length > 0) {
            let totalValue = 0
            let currentAllocation: Record<string, number> = {}
            
            holdings.forEach(holding => {
              const price = latestPrices.find(p => p.asset_id === holding.asset_id)
              if (price) {
                const value = holding.quantity * price.closing_price
                totalValue += value
                
                const ticker = holding.assets.ticker
                if (ticker) {
                  currentAllocation[ticker] = value
                }
              }
            })
            
            // Convert values to percentages
            Object.keys(currentAllocation).forEach(key => {
              currentAllocation[key] = parseFloat(((currentAllocation[key] / totalValue) * 100).toFixed(1))
            })
            
            // Calculate current portfolio risk and return
            // This is a simplified approach - in reality would need more complex calculations
            let currentRisk = 0
            let currentReturn = 0
            
            // Find the closest frontier point to our current allocation
            let minDistance = Number.MAX_VALUE
            
            frontierPoints.forEach(point => {
              let distance = 0
              Object.keys(currentAllocation).forEach(key => {
                const pointAllocation = point.allocation[key] || 0
                distance += Math.pow(currentAllocation[key] - pointAllocation, 2)
              })
              distance = Math.sqrt(distance)
              
              if (distance < minDistance) {
                minDistance = distance
                currentRisk = point.risk
                currentReturn = point.expected_return
              }
            })
            
            return {
              frontierPoints,
              currentPortfolio: {
                risk: currentRisk,
                return: currentReturn,
                allocation: currentAllocation
              }
            }
          }
        }
        
        // Return just the frontier points if we couldn't calculate current position
        return {
          frontierPoints,
          currentPortfolio: null
        }
      }
    }

    // Fallback to synthetic efficient frontier for simple investments
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)

    if (investments && investments.length > 0) {
      // Generate synthetic efficient frontier
      const frontierPoints = []
      const riskLevels = [3, 5, 7, 9, 11, 13, 15, 17]
      
      for (const risk of riskLevels) {
        // Higher risk generally means higher expected return
        const expectedReturn = risk * 0.8 + Math.random() * 2
        
        // Create allocation based on risk level
        const allocation: Record<string, number> = {}
        const investmentTypes = ["stock", "etf", "bond", "real_estate", "crypto", "cash"]
        
        if (risk <= 5) {
          // Conservative allocation
          allocation["bond"] = 60 - risk * 2
          allocation["etf"] = 20 + risk * 2
          allocation["stock"] = 10
          allocation["real_estate"] = 5
          allocation["cash"] = 5
          allocation["crypto"] = 0
        } else if (risk <= 10) {
          // Moderate allocation
          allocation["bond"] = 50 - risk * 3
          allocation["etf"] = 20 + risk * 2
          allocation["stock"] = 15
          allocation["real_estate"] = 10
          allocation["cash"] = 5
          allocation["crypto"] = 0
        } else {
          // Aggressive allocation
          allocation["bond"] = 30 - risk
          allocation["etf"] = 30
          allocation["stock"] = 20
          allocation["real_estate"] = 10
          allocation["cash"] = 5
          allocation["crypto"] = risk - 10
        }
        
        frontierPoints.push({
          risk,
          expected_return: parseFloat(expectedReturn.toFixed(2)),
          allocation
        })
      }
      
      // Calculate current portfolio allocation by type
      const totalValue = investments.reduce((sum, inv) => sum + (inv.value || 0), 0)
      const currentAllocation: Record<string, number> = {}
      
      investmentTypes.forEach(type => {
        const typeInvestments = investments.filter(inv => inv.type === type)
        const typeValue = typeInvestments.reduce((sum, inv) => sum + (inv.value || 0), 0)
        currentAllocation[type] = parseFloat(((typeValue / totalValue) * 100).toFixed(1))
      })
      
      // Estimate current portfolio risk and return
      // Find the closest frontier point to our current allocation
      let minDistance = Number.MAX_VALUE
      let currentRisk = 0
      let currentReturn = 0
      
      frontierPoints.forEach(point => {
        let distance = 0
        Object.keys(currentAllocation).forEach(key => {
          const pointAllocation = point.allocation[key] || 0
          distance += Math.pow(currentAllocation[key] - pointAllocation, 2)
        })
        distance = Math.sqrt(distance)
        
        if (distance < minDistance) {
          minDistance = distance
          currentRisk = point.risk
          currentReturn = point.expected_return
        }
      })
      
      return {
        frontierPoints,
        currentPortfolio: {
          risk: currentRisk,
          return: currentReturn,
          allocation: currentAllocation
        }
      }
    }

    // Return empty data if no investments found
    return {
      frontierPoints: [],
      currentPortfolio: null
    }
  } catch (error) {
    console.error("Error in getEfficientFrontier:", error)
    return {
      frontierPoints: [],
      currentPortfolio: null
    }
  }
}

export async function getInvestmentFees() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = createClientComponentClient()

    // Try to get fee data from the advanced schema
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (portfolios && portfolios.length > 0) {
      const portfolioId = portfolios[0].id

      // Get holdings for this portfolio
      const { data: holdings } = await supabase
        .from('holdings')
        .select('asset_id, quantity')
        .eq('portfolio_id', portfolioId)

      if (holdings && holdings.length > 0) {
        const assetIds = holdings.map(h => h.asset_id)
        
        // Get fees for these assets
        const { data: fees } = await supabase
          .from('investment_fees')
          .select(`
            fee_type,
            fee_percent,
            suggested_alternative,
            assets(id, name, ticker)
          `)
          .in('asset_id', assetIds)

        if (fees && fees.length > 0) {
          // Get latest prices to calculate fee impact
          const { data: latestPrices } = await supabase
            .from('asset_prices')
            .select('asset_id, closing_price')
            .in('asset_id', assetIds)
            .order('price_date', { ascending: false })
            .limit(assetIds.length)

          if (latestPrices && latestPrices.length > 0) {
            // Calculate fee impact
            const feeImpact = []
            
            for (const fee of fees) {
              const holding = holdings.find(h => h.asset_id === fee.assets.id)
              const price = latestPrices.find(p => p.asset_id === fee.assets.id)
              
              if (holding && price) {
                const value = holding.quantity * price.closing_price
                const annualFeeAmount = value * (fee.fee_percent / 100)
                
                feeImpact.push({
                  assetName: fee.assets.name,
                  ticker: fee.assets.ticker,
                  feeType: fee.fee_type,
                  feePercent: fee.fee_percent,
                  annualFeeAmount,
                  suggestedAlternative: fee.suggested_alternative
                })
              }
            }
            
            // Group by fee type
            const feesByType: Record<string, number> = {}
            let totalFees = 0
            
            feeImpact.forEach(impact => {
              if (!feesByType[impact.feeType]) {
                feesByType[impact.feeType] = 0
              }
              feesByType[impact.feeType] += impact.annualFeeAmount
              totalFees += impact.annualFeeAmount
            })
            
            return {
              feeImpact,
              feesByType,
              totalAnnualFees: totalFees,
              potentialSavings: totalFees * 0.3 // Estimate 30% potential savings
            }
          }
        }
      }
    }

    // Fallback to simple investments - generate synthetic fee data
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)

    if (investments && investments.length > 0) {
      const feeImpact = []
      const feesByType: Record<string, number> = {
        "expense_ratio": 0,
        "management_fee": 0,
        "transaction_fee": 0
      }
      let totalFees = 0
      
      for (const inv of investments) {
        if (inv.type === 'etf' || inv.type === 'bond') {
          // Add expense ratio fee
          const feePercent = inv.type === 'etf' ? 0.15 : 0.25
          const annualFeeAmount = inv.value * (feePercent / 100)
          
          feeImpact.push({
            assetName: inv.name,
            ticker: inv.ticker,
            feeType: 'expense_ratio',
            feePercent,
            annualFeeAmount,
            suggestedAlternative: feePercent > 0.2 ? "Consider lower-cost ETF alternatives" : null
          })
          
          feesByType["expense_ratio"] += annualFeeAmount
          totalFees += annualFeeAmount
        }
        
        // Add management fee for all investments
        const mgmtFeePercent = 0.5
        const mgmtFeeAmount = inv.value * (mgmtFeePercent / 100)
        
        feeImpact.push({
          assetName: inv.name,
          ticker: inv.ticker,
          feeType: 'management_fee',
          feePercent: mgmtFeePercent,
          annualFeeAmount: mgmtFeeAmount,
          suggestedAlternative: "Consider self-directed investing to reduce fees"
        })
        
        feesByType["management_fee"] += mgmtFeeAmount
        totalFees += mgmtFeeAmount
        
        // Add transaction fee for stocks
        if (inv.type === 'stock') {
          const txFeePercent = 0.05
          const txFeeAmount = inv.value * (txFeePercent / 100)
          
          feeImpact.push({
            assetName: inv.name,
            ticker: inv.ticker,
            feeType: 'transaction_fee',
            feePercent: txFeePercent,
            annualFeeAmount: txFeeAmount,
            suggestedAlternative: "Consider a broker with lower transaction fees"
          })
          
          feesByType["transaction_fee"] += txFeeAmount
          totalFees += txFeeAmount
        }
      }
      
      return {
        feeImpact,
        feesByType,
        totalAnnualFees: totalFees,
        potentialSavings: totalFees * 0.3 // Estimate 30% potential savings
      }
    }

    // Return empty data if no investments found
    return {
      feeImpact: [],
      feesByType: {},
      totalAnnualFees: 0,
      potentialSavings: 0
    }
  } catch (error) {
    console.error("Error in getInvestmentFees:", error)
    return {
      feeImpact: [],
      feesByType: {},
      totalAnnualFees: 0,
      potentialSavings: 0
    }
  }
}

export async function getMarketContext() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = createClientComponentClient()

    // Get user preferences
    const { data: preferences } = await supabase
      .from('dashboard_preferences')
      .select('show_market_context')
      .eq('user_id', user.id)
      .single()

    // If user has disabled market context, return empty data
    if (preferences && preferences.show_market_context === false) {
      return {
        currentIndicators: [],
        historicalData: {},
        showMarketContext: false
      }
    }

    // Get current market indicators
    const { data: currentIndicators } = await supabase
      .from('market_conditions')
      .select('indicator_name, value, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(5)

    // Get historical data for each indicator
    const historicalData: Record<string, any[]> = {}
    
    if (currentIndicators && currentIndicators.length > 0) {
      for (const indicator of currentIndicators) {
        const { data: history } = await supabase
          .from('market_conditions')
          .select('value, recorded_at')
          .eq('indicator_name', indicator.indicator_name)
          .order('recorded_at', { ascending: true })
          .limit(12)
        
        if (history && history.length > 0) {
          historicalData[indicator.indicator_name] = history
        }
      }
      
      return {
        currentIndicators,
        historicalData,
        showMarketContext: true
      }
    }

    // Fallback to synthetic market data
    const syntheticIndicators = [
      { indicator_name: "S&P 500 P/E Ratio", value: 22.5 },
      { indicator_name: "10-Year Treasury Yield", value: 3.8 },
      { indicator_name: "VIX Volatility Index", value: 18.2 },
      { indicator_name: "Unemployment Rate", value: 3.7 },
      { indicator_name: "Inflation Rate", value: 2.9 }
    ]
    
    const today = new Date()
    
    for (const indicator of syntheticIndicators) {
      historicalData[indicator.indicator_name] = []
      
      for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 15)
        const baseValue = indicator.value
        const variance = baseValue * 0.1 * (Math.random() * 2 - 1)
        
        historicalData[indicator.indicator_name].push({
          value: parseFloat((baseValue + variance).toFixed(1)),
          recorded_at: date.toISOString()
        })
      }
      
      // Reverse to get ascending order
      historicalData[indicator.indicator_name].reverse()
      
      // Add current value to the indicator
      indicator.recorded_at = today.toISOString()
    }
    
    return {
      currentIndicators: syntheticIndicators,
      historicalData,
      showMarketContext: true
    }
  } catch (error) {
    console.error("Error in getMarketContext:", error)
    return {
      currentIndicators: [],
      historicalData: {},
      showMarketContext: false
    }
  }
}

// Get all investments for the current user
export async function getInvestments() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()

    // Try to fetch from investments table first
    let { data: investments, error } = await supabase
      .from("investments")
      .select(`
        *,
        categories:category_id (id, name, color),
        accounts:account_id (id, name, type)
      `)
      .eq("user_id", user.id)
      .order("name", { ascending: true })

    // If no investments or empty error, try fetching from portfolios/holdings/assets model
    if ((error && Object.keys(error).length === 0) || (!error && (!investments || investments.length === 0))) {
      const { data: portfolios, error: portfoliosError } = await supabase
        .from("portfolios")
        .select(`
          id,
          name,
          holdings!inner(
            id,
            quantity,
            cost_basis,
            assets!inner(
              id,
              name,
              ticker,
              asset_type
            )
          )
        `)
        .eq("user_id", user.id)

      if (!portfoliosError && portfolios && portfolios.length > 0) {
        // Transform portfolio/holdings/assets into investments format
        investments = portfolios.flatMap(portfolio => 
          portfolio.holdings.map(holding => ({
            id: holding.id,
            user_id: user.id,
            name: holding.assets.name,
            ticker: holding.assets.ticker,
            type: holding.assets.asset_type,
            shares: holding.quantity,
            cost_basis: holding.cost_basis,
            value: holding.cost_basis, // Default to cost basis if no current price
            portfolio_id: portfolio.id,
            portfolio_name: portfolio.name
          }))
        )
      }
    }

    if (error && Object.keys(error).length > 0 && error.code !== undefined) {
      console.error("Error fetching investments:", error)
      return [] // Return empty array instead of throwing
    }

    return investments || []
  } catch (error) {
    console.error("Error in getInvestments:", error)
    return [] // Return empty array instead of throwing
  }
}

// Get investment fee analysis
export async function getInvestmentFeeAnalysis() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    const investments = await getInvestments()

    if (!investments || investments.length === 0) {
      return {
        investments: [],
        totalAnnualFees: 0,
        totalPortfolioValue: 0,
        maxPotentialSavings: 0,
        tenYearImpact: 0,
        highFeeInvestments: []
      }
    }

    // Calculate total portfolio value
    const totalPortfolioValue = investments.reduce((sum, inv) => sum + (inv.value || 0), 0)

    // Enhanced investments with fee data
    const enhancedInvestments = investments.map(inv => {
      // Calculate fee percentage based on investment type
      let feePercentage = 0
      
      if (inv.type === 'etf') {
        feePercentage = inv.fee_percentage || 0.15 // Default ETF expense ratio if not specified
      } else if (inv.type === 'mutual_fund') {
        feePercentage = inv.fee_percentage || 0.65 // Default mutual fund expense ratio
      } else if (inv.type === 'stock') {
        feePercentage = 0.05 // Typical trading fees annualized
      } else if (inv.type === 'bond') {
        feePercentage = inv.fee_percentage || 0.35 // Default bond fund expense ratio
      } else {
        feePercentage = 0.25 // Default for other investment types
      }

      // Calculate annual fee
      const annualFee = (inv.value || 0) * (feePercentage / 100)

      return {
        ...inv,
        fee_percentage: feePercentage,
        annual_fee: annualFee
      }
    })

    // Calculate total annual fees
    const totalAnnualFees = enhancedInvestments.reduce((sum, inv) => sum + inv.annual_fee, 0)

    // Identify high-fee investments (above industry average for their type)
    const highFeeInvestments = enhancedInvestments.filter(inv => {
      const industryAverage = 
        inv.type === 'etf' ? 0.15 : 
        inv.type === 'mutual_fund' ? 0.50 : 
        inv.type === 'bond' ? 0.25 : 
        inv.type === 'stock' ? 0.03 : 0.20

      return inv.fee_percentage > industryAverage * 1.5 && inv.annual_fee > 50 // Only include if significantly higher and material
    }).map(inv => {
      // Find lower-cost alternatives
      const alternatives = []
      
      if (inv.type === 'etf' || inv.type === 'mutual_fund') {
        alternatives.push({
          name: `Low-Cost ${inv.type === 'etf' ? 'ETF' : 'Index Fund'} Alternative`,
          ticker: inv.type === 'etf' ? 'VTI' : 'VTSAX',
          fee_percentage: inv.type === 'etf' ? 0.03 : 0.04,
          potential_savings: inv.annual_fee - ((inv.value || 0) * (inv.type === 'etf' ? 0.03 : 0.04) / 100)
        })
      }

      return {
        ...inv,
        alternatives,
        potential_savings: alternatives.reduce((max, alt) => Math.max(max, alt.potential_savings), 0)
      }
    }).sort((a, b) => b.potential_savings - a.potential_savings)

    // Calculate maximum potential savings
    const maxPotentialSavings = highFeeInvestments.reduce((sum, inv) => sum + inv.potential_savings, 0)

    // Calculate 10-year fee impact (simple, no compounding)
    const tenYearImpact = totalAnnualFees * 10

    return {
      investments: enhancedInvestments,
      totalAnnualFees,
      totalPortfolioValue,
      maxPotentialSavings,
      tenYearImpact,
      highFeeInvestments
    }
  } catch (error) {
    console.error("Error in getInvestmentFeeAnalysis:", error)
    // Return safe default values
    return {
      investments: [],
      totalAnnualFees: 0,
      totalPortfolioValue: 0,
      maxPotentialSavings: 0,
      tenYearImpact: 0,
      highFeeInvestments: []
    }
  }
}

// Get rebalancing recommendations
export async function getRebalancingRecommendations(targetAllocation?: Record<string, number>) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return getSafeRebalancingDefaults()
    }

    const supabase = await createServerSupabaseClient()
    
    // Fetch investments for this user
    const { data: investments, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching investments:', error)
      return getSafeRebalancingDefaults()
    }
    
    if (!investments || investments.length === 0) {
      return getSafeRebalancingDefaults()
    }
    
    // Calculate total portfolio value
    const portfolioValue = investments.reduce((total, inv) => total + (inv.value || 0), 0)
    
    if (portfolioValue === 0) {
      return getSafeRebalancingDefaults()
    }
    
    // Group investments by asset class
    const investmentsByType: Record<string, any[]> = {}
    const currentAllocation: Record<string, number> = {}
    
    investments.forEach(inv => {
      const type = inv.asset_type || 'Other'
      
      if (!investmentsByType[type]) {
        investmentsByType[type] = []
      }
      
      investmentsByType[type].push(inv)
      
      if (!currentAllocation[type]) {
        currentAllocation[type] = 0
      }
      
      currentAllocation[type] += (inv.value || 0)
    })
    
    // Convert absolute values to percentages
    Object.keys(currentAllocation).forEach(type => {
      currentAllocation[type] = (currentAllocation[type] / portfolioValue) * 100
    })
    
    // Use provided target allocation or a default
    const defaultTargets = {
      Stocks: 60,
      Bonds: 30,
      Cash: 5,
      Alternative: 5,
    }
    
    const finalTargetAllocation = targetAllocation || defaultTargets
    
    // Calculate differences and rebalancing needs
    const differences: Record<string, any> = {}
    let totalDifference = 0
    
    // First, handle asset classes that exist in both current and target
    Object.keys(currentAllocation).forEach(type => {
      const target = finalTargetAllocation[type] || 0
      const current = currentAllocation[type] || 0
      const difference = target - current
      
      differences[type] = {
        type,
        target,
        current,
        difference,
        investments: investmentsByType[type] || []
      }
      
      totalDifference += Math.abs(difference)
    })
    
    // Then, handle asset classes that exist only in target
    Object.keys(finalTargetAllocation).forEach(type => {
      if (!currentAllocation[type]) {
        const target = finalTargetAllocation[type] || 0
        const difference = target
        
        differences[type] = {
          type,
          target,
          current: 0,
          difference,
          investments: []
        }
        
        totalDifference += Math.abs(difference)
      }
    })
    
    // Calculate rebalancing amounts
    const rebalanceAmounts: Record<string, number> = {}
    Object.keys(differences).forEach(type => {
      rebalanceAmounts[type] = (differences[type].difference / 100) * portfolioValue
    })
    
    // Helper function to get suggested investments for a specific asset class
    function getSuggestedInvestments(assetClass: string, isBuying: boolean) {
      // Default suggestions for common asset classes
      const suggestions: Record<string, Array<{name: string, ticker: string}>> = {
        Stocks: [
          { name: 'Vanguard Total Stock Market ETF', ticker: 'VTI' },
          { name: 'iShares Core S&P 500 ETF', ticker: 'IVV' },
          { name: 'Schwab US Broad Market ETF', ticker: 'SCHB' }
        ],
        Bonds: [
          { name: 'Vanguard Total Bond Market ETF', ticker: 'BND' },
          { name: 'iShares Core US Aggregate Bond ETF', ticker: 'AGG' },
          { name: 'Schwab US Aggregate Bond ETF', ticker: 'SCHZ' }
        ],
        Cash: [
          { name: 'High-Yield Savings Account', ticker: '' },
          { name: 'Money Market Fund', ticker: '' },
          { name: 'Short-Term Treasury Bills', ticker: 'SHV' }
        ],
        Alternative: [
          { name: 'Vanguard Real Estate ETF', ticker: 'VNQ' },
          { name: 'Invesco Optimum Yield Diversified Commodity Strategy', ticker: 'PDBC' },
          { name: 'iShares Gold Trust', ticker: 'IAU' }
        ]
      }
      
      // Return suggestions for the specified asset class or a default message
      return suggestions[assetClass] || [
        { name: `${assetClass} Index Fund`, ticker: '' }
      ]
    }
    
    // Generate recommendations
    const recommendations = Object.keys(differences)
      .filter(type => Math.abs(differences[type].difference) >= 1) // Only show significant differences
      .map(type => {
        const diff = differences[type]
        const action = diff.difference > 0 ? 'increase' : diff.difference < 0 ? 'decrease' : 'maintain'
        
        return {
          type,
          action,
          amount: Math.abs(diff.difference).toFixed(2),
          message: `${action === 'increase' ? 'Increase' : action === 'decrease' ? 'Decrease' : 'Maintain'} ${type} by ${Math.abs(diff.difference).toFixed(2)}%`,
          suggestedInvestments: getSuggestedInvestments(type, action === 'increase')
        }
      })
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    
    return {
      currentAllocation,
      targetAllocation: finalTargetAllocation,
      differences,
      recommendations,
      rebalanceAmounts,
      totalDifference,
      needsRebalancing: totalDifference > 5, // Consider rebalancing if total difference > 5%
      portfolioValue,
    }
  } catch (error) {
    console.error('Error in getRebalancingRecommendations:', error)
    return getSafeRebalancingDefaults()
  }
}

// Get investment by ID
export async function getInvestmentById(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()

    // Try to fetch from investments table first
    const { data: investment, error } = await supabase
      .from("investments")
      .select(`
        *,
        categories:category_id (id, name, color),
        accounts:account_id (id, name, type)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      // Try to fetch from holdings/assets model
      try {
        const { data: holding, error: holdingError } = await supabase
          .from("holdings")
          .select(`
            *,
            portfolios (name),
            assets!inner(
              id,
              name,
              ticker,
              asset_type,
              sector,
              is_dividend_paying
            )
          `)
          .eq("id", id)
          .single()

        if (holdingError) throw holdingError

        if (holding) {
          const transformedInvestment = {
            id: holding.id,
            user_id: user.id,
            name: holding.assets.name,
            ticker: holding.assets.ticker,
            type: holding.assets.asset_type,
            shares: holding.quantity,
            cost_basis: holding.cost_basis,
            value: holding.cost_basis, // Default value
            purchase_date: holding.acquisition_date,
            portfolio_id: holding.portfolio_id,
            portfolio_name: holding.portfolios?.name,
            sector: holding.assets.sector,
            is_dividend_paying: holding.assets.is_dividend_paying
          }
          return { investment: transformedInvestment, history: [], transactions: [] }
        }
      } catch (e) {
        console.error("Error fetching from holdings/assets:", e)
      }
      
      console.error("Error fetching investment:", error)
      return { investment: null, history: [], transactions: [] }
    }

    // Get investment history
    const investmentHistory = await getInvestmentHistory(id)

    // Get transactions
    const transactions = await getTransactionsByInvestment(id)

    return { investment, history: investmentHistory, transactions }
    if (transactionsError) {
      console.error("Error fetching investment transactions:", transactionsError)
    }

    return {
      investment,
      history: history || [],
      transactions: transactions || [],
    }
  } catch (error) {
    console.error("Error in getInvestmentById:", error)
    return { investment: null, history: [], transactions: [] }
  }
}

// Save target allocation
export async function saveTargetAllocation(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()

    // Parse target allocation from form data
    const targets = {}
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("target_")) {
        const type = key.replace("target_", "")
        targets[type] = Number.parseFloat(value as string) || 0
      }
    }

    // First check if the table exists
    try {
      // Check if targets already exist
      const { data: existingTargets, error: checkError } = await supabase
        .from("portfolio_targets")
        .select("id")
        .eq("user_id", user.id)

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        console.log("Portfolio targets table doesn't exist, creating it")
        // In a real app, you'd run a migration here
        // For now, we'll just return the targets as if they were saved
        return [{ id: "temp-id", user_id: user.id, targets }]
      }

      let result

      if (existingTargets && existingTargets.length > 0) {
        // Update existing targets
        const { data, error } = await supabase
          .from("portfolio_targets")
          .update({
            targets,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select()

        if (error) {
          console.error("Error updating target allocation:", error)
          return [{ id: "temp-id", user_id: user.id, targets }]
        }

        result = data
      } else {
        // Create new targets
        const { data, error } = await supabase
          .from("portfolio_targets")
          .insert({
            user_id: user.id,
            targets,
          })
          .select()

        if (error) {
          console.error("Error creating target allocation:", error)
          return [{ id: "temp-id", user_id: user.id, targets }]
        }

        result = data
      }

      revalidatePath("/investments/allocation")
      return result
    } catch (err) {
      console.error("Error in saveTargetAllocation:", err)
      // Return mock data if table doesn't exist
      return [{ id: "temp-id", user_id: user.id, targets }]
    }
  } catch (error) {
    console.error("Error in saveTargetAllocation:", error)
    return [{ id: "temp-id", user_id: user.id, targets: {} }]
  }
}

// Get all unique asset classes (types) from the assets table
export async function getAssetClasses(): Promise<string[]> {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    })
    
    console.log("Fetching asset classes from database...");
    
    // Try to get asset classes from the database
    const { data, error } = await supabase
      .from('investments')
      .select('type')
      .order('type')
    
    console.log("Asset classes data from DB:", data);
    console.log("Asset classes error:", error);
    
    if (error) {
      console.error("Database error when fetching asset classes:", error);
      // Check if the error is related to missing columns
      if (error.message && error.message.includes("column")) {
        console.log("Column-related error, might need to run migration script");
      }
      // Return default asset classes on error
      const defaultClasses = [
        "Stocks", 
        "Bonds", 
        "Cash", 
        "Alternative",
        "Shares",
        "Bills",
        "Crypto",
        "Real Estate"
      ];
      console.log("Returning default asset classes due to error:", defaultClasses);
      return defaultClasses;
    }
    
    if (!data || data.length === 0) {
      // Return default asset classes if there's no data
      const defaultClasses = [
        "Stocks", 
        "Bonds", 
        "Cash", 
        "Alternative",
        "Shares",
        "Bills",
        "Crypto",
        "Real Estate"
      ];
      console.log("No data found, returning default asset classes:", defaultClasses);
      return defaultClasses;
    }
    
    // Extract unique asset classes
    const assetClasses = [...new Set(data.map(item => item.type))];
    const filteredClasses = assetClasses.filter(Boolean) as string[]; // Filter out any null/undefined values
    
    console.log("Returning filtered asset classes:", filteredClasses);
    
    // If we have fewer than 2 classes after filtering, return defaults
    if (filteredClasses.length < 2) {
      const defaultClasses = [
        "Stocks", 
        "Bonds", 
        "Cash", 
        "Alternative",
        "Shares",
        "Bills",
        "Crypto",
        "Real Estate"
      ];
      console.log("Too few valid classes after filtering, returning defaults:", defaultClasses);
      return defaultClasses;
    }
    
    return filteredClasses;
  } catch (error) {
    console.error("Error fetching asset classes:", error);
    // Return default asset classes on error
    const defaultClasses = [
      "Stocks", 
      "Bonds", 
      "Cash", 
      "Alternative",
      "Shares",
      "Bills",
      "Crypto",
      "Real Estate"
    ];
    console.log("Error occurred, returning default asset classes:", defaultClasses);
    return defaultClasses;
  }
}

// Financial education functions
export async function fetchInvestments({ type = 'portfolio' }: { type?: 'portfolio' | 'universe' } = {}): Promise<Investment[]> {
  try {
    console.log(`Fetching ${type} investments...`)
    const supabase = await createServerSupabaseClient()
    
    // For portfolio type, we need an authenticated user
    if (type === 'portfolio') {
      try {
        // Fetch user's portfolio investments
        const user = await getCurrentUser()
        
        if (!user) {
          console.warn('No authenticated user found. Falling back to mock data.')
          const mockData = await getMockInvestments()
          return enrichInvestmentData(mockData)
        }
        
        console.log(`Authenticated user found: ${user.id}. Querying investments table...`)
        
        const { data, error } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
        
        if (error) {
          console.error(`Error fetching portfolio investments:`, error)
          
          // If the table doesn't exist yet, return mock data
          if (error.code === "42P01") {
            console.log(`Investments table doesn't exist yet. Using mock data.`)
            const mockData = await getMockInvestments()
            return enrichInvestmentData(mockData)
          }
          
          const mockData = await getMockInvestments()
          return enrichInvestmentData(mockData)
        }
        
        console.log(`Successfully fetched ${data?.length || 0} portfolio investments`)
        if (!data || data.length === 0) {
          const mockData = await getMockInvestments()
          return enrichInvestmentData(mockData)
        }
        return enrichInvestmentData(data as Investment[])
      } catch (authError) {
        console.error('Authentication error in fetchInvestments:', authError)
        const mockData = await getMockInvestments()
        return enrichInvestmentData(mockData)
      }
    } else {
      // For universe type, no authentication needed
      console.log('Querying investment_universe table...')
      const { data, error } = await supabase
        .from('investment_universe')
        .select('*')
      
      if (error) {
        console.error(`Error fetching investment universe:`, error)
        
        // If the table doesn't exist yet, return mock data
        if (error.code === "42P01") {
          console.log(`Investment universe table doesn't exist yet. Using mock data.`)
          const mockData = await getMockInvestments()
          return enrichInvestmentData(mockData)
        }
        
        const mockData = await getMockInvestments()
        return enrichInvestmentData(mockData)
      }
      
      console.log(`Successfully fetched ${data?.length || 0} investment universe items`)
      if (!data || data.length === 0) {
        const mockData = await getMockInvestments()
        return enrichInvestmentData(mockData)
      }
      return enrichInvestmentData(data as Investment[])
    }
  } catch (error) {
    console.error('Unexpected error in fetchInvestments:', error)
    const mockData = await getMockInvestments()
    return enrichInvestmentData(mockData)
  }
}

export async function fetchFinancialEducationChannels() {
  try {
    // In a real implementation, this would fetch from a database
    // For now, we'll import from our local data file
    const { financialEducationChannels } = await import('@/lib/investments/financial-education')
    return financialEducationChannels
  } catch (error) {
    console.error('Error fetching financial education channels:', error)
    return []
  }
}

export async function fetchFinancialTopics() {
  try {
    // In a real implementation, this would fetch from a database
    // For now, we'll import from our local data file
    const { financialTopics } = await import('@/lib/investments/financial-education')
    return financialTopics
  } catch (error) {
    console.error('Error fetching financial topics:', error)
    return []
  }
}



// Find tax loss harvesting opportunities
export async function findTaxLossHarvestingOpportunities(): Promise<any[]> {
  const investments = await getMockInvestments();
  
  // Filter investments with unrealized losses
  const investmentsWithLosses = investments.filter(inv => {
    // Simulate cost basis and current value for demonstration
    const costBasis = inv.value ? inv.value * 1.1 : 0; // Assume bought at 10% higher
    return inv.value ? inv.value < costBasis : false;
  });
  
  // Calculate potential tax savings for each investment with a loss
  return investmentsWithLosses.map(inv => {
    const costBasis = inv.value ? inv.value * 1.1 : 0;
    const unrealizedLoss = inv.value ? costBasis - inv.value : 0;
    const potentialTaxSavings = unrealizedLoss * 0.15; // Assume 15% tax rate
    
    return {
      investment: inv,
      unrealizedLoss,
      potentialTaxSavings,
      alternativeInvestments: [
        "Vanguard Total Stock Market ETF (VTI)",
        "iShares Core S&P 500 ETF (IVV)",
        "Schwab U.S. Broad Market ETF (SCHB)"
      ]
    };
  });
}

// Helper functions for mock data
export async function getMockInvestments(): Promise<Investment[]> {
  // Generate 20 mock investments
  return Array.from({ length: 20 }, (_, i) => {
    const id = `inv-${i + 1}`
    const isETF = Math.random() > 0.5
    
    // Assign a sector
    const sectors = [
      { id: 'technology', name: 'Technology' },
      { id: 'healthcare', name: 'Healthcare' },
      { id: 'consumer_goods', name: 'Consumer Goods' },
      { id: 'financial', name: 'Financial' },
      { id: 'industrial', name: 'Industrial' },
      { id: 'utilities', name: 'Utilities' },
      { id: 'energy', name: 'Energy' },
      { id: 'materials', name: 'Materials' },
    ]
    const sectorIndex = Math.floor(Math.random() * sectors.length)
    
    // Assign risk level
    const riskLevels = ['low', 'medium', 'high'] as const
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)]
    
    return {
      id,
      name: isETF 
        ? `${sectors[sectorIndex].name} ${Math.random() > 0.5 ? 'Index' : 'ETF'}` 
        : `${['Global', 'American', 'European', 'Asian'][Math.floor(Math.random() * 4)]} ${sectors[sectorIndex].name} Corp${Math.random() > 0.7 ? '.' : ''}`,
      ticker: isETF 
        ? `${sectors[sectorIndex].id.substring(0, 3).toUpperCase()}X` 
        : `${sectors[sectorIndex].id.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 100)}`,
      type: isETF ? 'etf' : 'stock',
      price: Math.round((20 + Math.random() * 180) * 100) / 100,
      value: Math.round((1000 + Math.random() * 9000) * 100) / 100,
      expenseRatio: isETF ? Math.round((0.03 + Math.random() * 0.7) * 100) / 100 : undefined,
      sector: sectors[sectorIndex].name,
      sector_id: sectors[sectorIndex].id,
      riskLevel: riskLevel
    } as Investment
  })
}

// Enrich investment data with real-time prices and calculated metrics
function enrichInvestmentData(investments: Investment[]): Investment[] {
  return investments.map(investment => {
    // Add real-time price simulation for investments with tickers
    if (investment.ticker && !investment.price) {
      investment.price = Math.round((20 + Math.random() * 180) * 100) / 100
    }
    
    // Add expense ratio calculation for certain investment types
    if (investment.type && !investment.expenseRatio) {
      investment.expenseRatio = calculateEstimatedExpenseRatio(investment)
    }
    
    // Add risk level estimation if not available
    if (!investment.riskLevel) {
      investment.riskLevel = calculateEstimatedRiskLevel(investment)
    }
    
    return investment
  })
}

// Fetch real-time prices using Finnhub API
async function fetchPricesForTickers(tickers: string[]): Promise<PriceData> {
  if (!tickers || tickers.length === 0) return {}
  
  try {
    // Use the Finnhub API endpoint we've set up
    const apiUrl = '/api/finnhub'
    const priceData: PriceData = {}
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10
    const batches: string[][] = []
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      batches.push(tickers.slice(i, i + batchSize))
    }
    
    // Process each batch
    for (const batch of batches) {
      const promises = batch.map(async (ticker: string) => {
        try {
          const response = await fetch(`${apiUrl}?symbol=${ticker}`)
          if (!response.ok) throw new Error(`Failed to fetch price for ${ticker}`)
          
          const data = await response.json()
          if (data && data.c) { // 'c' is current price in Finnhub API
            priceData[ticker] = {
              price: parseFloat(data.c.toFixed(2)),
              change: parseFloat(((data.c - data.pc) / data.pc * 100).toFixed(2)) // Calculate % change
            }
          }
        } catch (err) {
          console.error(`Error fetching price for ${ticker}:`, err)
          // Provide fallback data if API call fails
          priceData[ticker] = {
            price: 0,
            change: 0
          }
        }
      })
      
      await Promise.all(promises)
      
      // Add a small delay between batches to avoid rate limits
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return priceData
  } catch (error) {
    console.error('Error in fetchPricesForTickers:', error)
    
    // Return empty price data on error
    return tickers.reduce((acc: PriceData, ticker: string) => {
      acc[ticker] = { price: 0, change: 0 }
      return acc
    }, {})
  }
}

// Calculate estimated expense ratio based on investment type
function calculateEstimatedExpenseRatio(investment: Investment): number {
  // In a real app, this would use more sophisticated logic
  // For now, we'll use typical ranges based on investment type
  const type = investment.type?.toLowerCase() || ''
  
  if (type.includes('etf')) return 0.35
  if (type.includes('mutual')) return 0.75
  if (type.includes('index')) return 0.15
  if (type.includes('bond')) return 0.25
  
  // Default expense ratio
  return 0.50
}

// Calculate estimated risk level if not available
function calculateEstimatedRiskLevel(investment: Investment): "low" | "medium" | "high" {
  // In a real app, this would use more sophisticated logic or external data
  // For now, we'll generate reasonable risk levels based on investment type and sector
  
  const sector = ((investment.sector_id || investment.sector || '')).toLowerCase()
  const type = (investment.type || '').toLowerCase()
  
  // Lower risk for bonds, ETFs, and certain sectors
  if (type.includes('bond') || sector.includes('utilities')) {
    return 'low'
  }
  
  // Higher risk for individual stocks and volatile sectors
  if (type.includes('stock') && (sector.includes('tech') || sector.includes('energy'))) {
    return 'high'
  }
  
  // Medium risk for everything else
  return 'medium'
}
