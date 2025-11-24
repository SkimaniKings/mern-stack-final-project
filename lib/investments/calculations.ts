// Types for investment calculations
export interface Investment {
  id: string
  name: string
  ticker?: string
  assetClass: string
  value: number
  costBasis?: number
  annualReturn?: number
  annualDividend?: number
  expenseRatio?: number
  accountType?: "taxable" | "tax-deferred" | "tax-free"
  type?: string
  allocation?: number
  shares?: number
  initialPrice?: number
  currentPrice?: number
  taxLocation?: string
  account?: string
  category?: string
  currency?: string
  gain?: number
  gainPercent?: number
  yield?: number
  risk?: string
  price?: number
}

export interface AssetClass {
  id: string
  name: string
  targetAllocation: number
  currentAllocation: number
  color: string
  investments: Investment[]
}

export interface RiskProfile {
  id: string
  name: string
  description: string
  targetAllocations: {
    [key: string]: number
  }
  expectedReturn: number
  expectedRisk: number
}

export interface RebalancingAction {
  assetClass: string
  currentValue: number
  targetValue: number
  difference: number
  action: "buy" | "sell" | "hold"
}

export interface TaxLossHarvestingOpportunity {
  investment: Investment
  unrealizedLoss: number
  potentialTaxSavings: number
  alternativeInvestments: string[]
}

export interface FeeComparison {
  investment: Investment
  currentFee: number
  alternativeInvestment: string
  alternativeFee: number
  potentialSavings: number
  tenYearImpact: number
}

export interface DividendProjection {
  year: number
  dividendAmount: number
  cumulativeDividends: number
  portfolioValue: number
}

export interface PerformanceMetric {
  name: string
  value: number
  benchmark?: number
  difference?: number
}

// Add the missing formatCurrency function
export function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount)
}

// Add the following function to the lib/investments/calculations.ts file.
export function formatPercent(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100)
}

// Risk profiles
export const riskProfiles: RiskProfile[] = [
  {
    id: "conservative",
    name: "Conservative",
    description: "Focus on capital preservation with minimal risk",
    targetAllocations: {
      "Stocks": 15,
      "Bonds": 35,
      "Cash": 15,
      "Alternative": 5,
      "Shares": 10,
      "Bills": 10,
      "Crypto": 0,
      "Real Estate": 10
    },
    expectedReturn: 4.5,
    expectedRisk: 6.0,
  },
  {
    id: "moderate",
    name: "Moderate",
    description: "Balance between growth and income with moderate risk",
    targetAllocations: {
      "Stocks": 25,
      "Bonds": 25,
      "Cash": 10,
      "Alternative": 5,
      "Shares": 15,
      "Bills": 5,
      "Crypto": 5,
      "Real Estate": 10
    },
    expectedReturn: 6.0,
    expectedRisk: 10.0,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Focus on long-term growth with higher risk tolerance",
    targetAllocations: {
      "Stocks": 30,
      "Bonds": 15,
      "Cash": 5,
      "Alternative": 5,
      "Shares": 20,
      "Bills": 5,
      "Crypto": 10,
      "Real Estate": 10
    },
    expectedReturn: 7.5,
    expectedRisk: 14.0,
  },
  {
    id: "aggressive",
    name: "Aggressive",
    description: "Maximize growth potential with high risk tolerance",
    targetAllocations: {
      "Stocks": 35,
      "Bonds": 5,
      "Cash": 0,
      "Alternative": 10,
      "Shares": 20,
      "Bills": 0,
      "Crypto": 15,
      "Real Estate": 15
    },
    expectedReturn: 9.0,
    expectedRisk: 18.0,
  },
]

// Sample investments data
export const sampleInvestments: Investment[] = [
  {
    id: "1",
    name: "Vanguard Total Stock Market ETF",
    ticker: "VTI",
    assetClass: "US Stocks",
    value: 50000,
    costBasis: 40000,
    annualReturn: 10.2,
    annualDividend: 1.5,
    expenseRatio: 0.03,
    accountType: "taxable",
    type: "ETF",
    allocation: 37.0,
  },
  {
    id: "2",
    name: "Vanguard Total Bond Market ETF",
    ticker: "BND",
    assetClass: "US Bonds",
    value: 30000,
    costBasis: 31000,
    annualReturn: 3.5,
    annualDividend: 2.8,
    expenseRatio: 0.035,
    accountType: "taxable",
    type: "ETF",
    allocation: 22.2,
  },
  {
    id: "3",
    name: "iShares Core U.S. Aggregate Bond ETF",
    ticker: "AGG",
    assetClass: "US Bonds",
    value: 25000,
    costBasis: 24000,
    annualReturn: 3.2,
    annualDividend: 2.5,
    expenseRatio: 0.04,
    accountType: "tax-deferred",
    type: "ETF",
    allocation: 18.5,
  },
  {
    id: "4",
    name: "Vanguard REIT ETF",
    ticker: "VNQ",
    assetClass: "Real Estate",
    value: 10000,
    costBasis: 8500,
    annualReturn: 8.7,
    annualDividend: 3.8,
    expenseRatio: 0.12,
    accountType: "tax-deferred",
    type: "ETF",
    allocation: 7.4,
  },
  {
    id: "5",
    name: "Cash Reserves",
    assetClass: "Cash",
    value: 15000,
    costBasis: 15000,
    annualReturn: 1.5,
    annualDividend: 0,
    expenseRatio: 0,
    accountType: "taxable",
    type: "Cash",
    allocation: 11.1,
  },
  {
    id: "7",
    name: "Bitcoin",
    assetClass: "Alternatives",
    value: 5000,
    costBasis: 3000,
    annualReturn: 25.0,
    annualDividend: 0,
    expenseRatio: 0,
    accountType: "taxable",
    type: "Crypto",
    allocation: 3.7,
  },
]

// Calculate current asset allocation
export function calculateCurrentAllocation(investments: Investment[]): AssetClass[] {
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0)

  // Group by asset class
  const assetClassMap = new Map<string, { value: number, investments: Investment[] }>()
  investments.forEach((inv) => {
    const current = assetClassMap.get(inv.assetClass) || { value: 0, investments: [] }
    current.value += inv.value
    current.investments.push(inv)
    assetClassMap.set(inv.assetClass, current)
  })

  // Generate colors for asset classes
  const colors = [
    "rgb(59, 130, 246)", // blue-500
    "rgb(16, 185, 129)", // green-500
    "rgb(239, 68, 68)", // red-500
    "rgb(245, 158, 11)", // amber-500
    "rgb(139, 92, 246)", // purple-500
    "rgb(20, 184, 166)", // teal-500
    "rgb(249, 115, 22)", // orange-500
    "rgb(99, 102, 241)", // indigo-500
  ]

  // Create asset class objects
  let colorIndex = 0
  return Array.from(assetClassMap.entries()).map(([name, data]) => ({
    id: (name || "unknown").toLowerCase().replace(/\s+/g, "-"),
    name: name || "Unknown",
    targetAllocation: 0, // Will be set based on risk profile
    currentAllocation: (data.value / totalValue) * 100,
    color: colors[colorIndex++ % colors.length],
    investments: data.investments
  }))
}

// Calculate rebalancing actions
export function calculateRebalancingActions(
  currentAllocation: AssetClass[],
  targetAllocation: { [key: string]: number },
  totalValue: number,
): RebalancingAction[] {
  return currentAllocation.map((asset) => {
    const target = targetAllocation[asset.name] || 0
    const currentValue = (asset.currentAllocation / 100) * totalValue
    const targetValue = (target / 100) * totalValue
    const difference = targetValue - currentValue

    return {
      assetClass: asset.name,
      currentValue,
      targetValue,
      difference,
      action: difference > 100 ? "buy" : difference < -100 ? "sell" : "hold",
    }
  })
}

// Calculate tax-loss harvesting opportunities
export function calculateTaxLossHarvesting(investments: Investment[]): TaxLossHarvestingOpportunity[] {
  return investments
    .filter((inv) => inv.accountType === "taxable" && inv.costBasis && inv.costBasis > inv.value)
    .map((inv) => {
      const unrealizedLoss = inv.costBasis! - inv.value
      return {
        investment: inv,
        unrealizedLoss,
        potentialTaxSavings: unrealizedLoss * 0.25, // Assuming 25% tax rate
        alternativeInvestments: getAlternativeInvestments(inv),
      }
    })
    .sort((a, b) => b.potentialTaxSavings - a.potentialTaxSavings)
}

// Get alternative investments for tax-loss harvesting
function getAlternativeInvestments(investment: Investment): string[] {
  // This would normally come from a database of similar but not substantially identical investments
  const alternatives: { [key: string]: string[] } = {
    VTI: ["ITOT", "SCHB", "SPLG"],
    VXUS: ["IXUS", "SPDW", "SCHF"],
    BND: ["AGG", "SCHZ", "IUSB"],
    VNQ: ["SCHH", "IYR", "RWR"],

  }

  return alternatives[investment.ticker || ""] || ["No alternatives found"]
}

// Calculate fee comparisons
export function calculateFeeComparisons(investments: Investment[]): FeeComparison[] {
  // Lower-cost alternatives
  const lowerCostAlternatives: { [key: string]: { name: string; fee: number } } = {
    VTI: { name: "Fidelity ZERO Total Market Index Fund (FZROX)", fee: 0.0 },
    VXUS: { name: "Fidelity ZERO International Index Fund (FZILX)", fee: 0.0 },
    BND: { name: "Schwab U.S. Aggregate Bond ETF (SCHZ)", fee: 0.03 },
    VNQ: { name: "Schwab U.S. REIT ETF (SCHH)", fee: 0.07 },

  }

  return investments
    .filter((inv) => inv.expenseRatio && inv.ticker && lowerCostAlternatives[inv.ticker])
    .map((inv) => {
      const alternative = lowerCostAlternatives[inv.ticker!]
      const currentFee = inv.value * (inv.expenseRatio! / 100)
      const alternativeFee = inv.value * (alternative.fee / 100)
      const potentialSavings = currentFee - alternativeFee

      // Calculate 10-year impact assuming 7% annual growth
      let tenYearImpact = 0
      let currentValue = inv.value
      let alternativeValue = inv.value

      for (let i = 0; i < 10; i++) {
        currentValue = currentValue * 1.07 * (1 - inv.expenseRatio! / 100)
        alternativeValue = alternativeValue * 1.07 * (1 - alternative.fee / 100)
      }

      tenYearImpact = alternativeValue - currentValue

      return {
        investment: inv,
        currentFee,
        alternativeInvestment: alternative.name,
        alternativeFee,
        potentialSavings,
        tenYearImpact,
      }
    })
    .sort((a, b) => b.tenYearImpact - a.tenYearImpact)
}

// Calculate dividend projections
export function calculateDividendProjections(
  investments: Investment[],
  years = 20,
  reinvestDividends = true,
): DividendProjection[] {
  const dividendInvestments = investments.filter((inv) => inv.annualDividend && inv.annualDividend > 0)

  let totalValue = dividendInvestments.reduce((sum, inv) => sum + inv.value, 0)
  const annualDividendYield =
    dividendInvestments.reduce((sum, inv) => sum + inv.value * (inv.annualDividend! / 100), 0) / totalValue

  const projections: DividendProjection[] = []
  let cumulativeDividends = 0

  for (let year = 1; year <= years; year++) {
    const dividendAmount = totalValue * annualDividendYield
    cumulativeDividends += dividendAmount

    if (reinvestDividends) {
      totalValue = totalValue * 1.07 + dividendAmount // Assuming 7% annual growth plus reinvested dividends
    } else {
      totalValue = totalValue * 1.07 // Assuming 7% annual growth without reinvesting dividends
    }

    projections.push({
      year,
      dividendAmount,
      cumulativeDividends,
      portfolioValue: totalValue,
    })
  }

  return projections
}

// Calculate performance metrics
export function calculatePerformanceMetrics(investments: Investment[], benchmarkReturn = 8.0): PerformanceMetric[] {
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0)
  const weightedReturn = investments.reduce((sum, inv) => sum + (inv.value / totalValue) * (inv.annualReturn || 0), 0)

  // Calculate other metrics
  const dividendYield = investments.reduce((sum, inv) => sum + (inv.value / totalValue) * (inv.annualDividend || 0), 0)

  const expenseRatio = investments.reduce((sum, inv) => sum + (inv.value / totalValue) * (inv.expenseRatio || 0), 0)

  return [
    {
      name: "Weighted Annual Return",
      value: weightedReturn,
      benchmark: benchmarkReturn,
      difference: weightedReturn - benchmarkReturn,
    },
    {
      name: "Dividend Yield",
      value: dividendYield,
      benchmark: 2.0, // Typical market dividend yield
      difference: dividendYield - 2.0,
    },
    {
      name: "Expense Ratio",
      value: expenseRatio,
      benchmark: 0.2, // Typical low-cost portfolio
      difference: 0.2 - expenseRatio, // Positive is good here (lower expenses)
    },
  ]
}

// Calculate optimal asset location for tax efficiency
export function calculateOptimalAssetLocation(investments: Investment[]): { [key: string]: string } {
  const assetClassTaxEfficiency: { [key: string]: { preference: string; reason: string } } = {
    "US Stocks": {
      preference: "tax-free",
      reason: "Growth-oriented stocks with qualified dividends benefit most from tax-free accounts like Roth IRA",
    },
    "International Stocks": {
      preference: "taxable",
      reason: "Can claim foreign tax credit in taxable accounts",
    },
    Bonds: {
      preference: "tax-deferred",
      reason: "Interest is taxed as ordinary income, best in traditional IRA/401k",
    },
    "Real Estate": {
      preference: "tax-deferred",
      reason: "High income production taxed at ordinary rates",
    },
    Cash: {
      preference: "taxable",
      reason: "Low return means minimal tax impact",
    },
    Alternatives: {
      preference: "tax-free",
      reason: "High growth potential benefits from tax-free treatment",
    },
  }

  return Object.entries(assetClassTaxEfficiency).reduce(
    (acc, [assetClass, info]) => {
      acc[assetClass] = info.preference
      return acc
    },
    {} as { [key: string]: string },
  )
}



export function calculatePortfolioValue(investments: Investment[]): number {
  return investments.reduce((total, investment) => total + investment.value, 0)
}

export function calculateGainLoss(investments: Investment[]): {
  totalGain: number
  totalGainPercentage: number
} {
  const totalValue = calculatePortfolioValue(investments)
  const totalCost = investments.reduce((sum, investment) => sum + (investment.costBasis || 0), 0)
  const totalGain = totalValue - totalCost
  const totalGainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  return {
    totalGain,
    totalGainPercentage,
  }
}

export function calculateRebalancingRecommendations(
  assetClasses: AssetClass[],
  totalPortfolioValue: number,
): {
  assetClass: AssetClass
  targetAllocation: number
  currentAllocation: number
  difference: number
  action: "buy" | "sell" | "hold"
  amountToRebalance: number
}[] {
  return assetClasses.map((asset) => {
    const difference = asset.currentAllocation - asset.targetAllocation

    // Determine action based on difference
    let action: "buy" | "sell" | "hold" = "hold"
    if (difference < -5) {
      action = "buy"
    } else if (difference > 5) {
      action = "sell"
    }

    // Calculate amount to rebalance
    const amountToRebalance = Math.abs(difference / 100) * totalPortfolioValue

    return {
      assetClass: asset,
      targetAllocation: asset.targetAllocation,
      currentAllocation: asset.currentAllocation,
      difference,
      action,
      amountToRebalance,
    }
  })
}

export function formatCurrency2(amount: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount)
}

export function calculatePerformance(investments: Investment[]): {
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercent: number
  weightedExpenseRatio: number
  weightedDividendYield: number
} {
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0)
  const totalCost = investments.reduce((sum, investment) => sum + (investment.costBasis || 0), 0)
  const totalGain = totalValue - totalCost
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  // Calculate weighted expense ratio
  const weightedExpenseRatio =
    investments.reduce((sum, inv) => sum + (inv.value / totalValue) * (inv.expenseRatio || 0), 0) || 0

  // Calculate weighted dividend yield
  const weightedDividendYield =
    investments.reduce((sum, inv) => sum + (inv.value / totalValue) * (inv.annualDividend || 0), 0) || 0

  return {
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    weightedExpenseRatio,
    weightedDividendYield,
  }
}

// Calculate tax efficiency score for a portfolio
export function calculateRebalancing(investments: Investment[], targetAllocation: { [key: string]: number }): {
  currentAllocation: { [key: string]: number }
  targetAllocation: { [key: string]: number }
  differences: { [key: string]: { current: number, target: number, difference: number } }
  totalDifference: number
  actions: RebalancingAction[]
} {
  // Calculate total portfolio value
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0);
  
  // Calculate current allocation by asset class
  const currentAllocation: { [key: string]: number } = {};
  investments.forEach(inv => {
    if (!currentAllocation[inv.assetClass]) {
      currentAllocation[inv.assetClass] = 0;
    }
    currentAllocation[inv.assetClass] += inv.value / totalValue * 100;
  });
  
  // Calculate differences between current and target allocations
  const differences: { [key: string]: { current: number, target: number, difference: number } } = {};
  let totalDifference = 0;
  
  // Process all asset classes from both current and target allocations
  const allAssetClasses = [...new Set([...Object.keys(currentAllocation), ...Object.keys(targetAllocation)])];
  
  allAssetClasses.forEach(assetClass => {
    const current = currentAllocation[assetClass] || 0;
    const target = targetAllocation[assetClass] || 0;
    const difference = Math.abs(current - target);
    
    differences[assetClass] = { current, target, difference };
    totalDifference += difference;
  });
  
  // Generate rebalancing actions
  const actions: RebalancingAction[] = allAssetClasses.map(assetClass => {
    const current = currentAllocation[assetClass] || 0;
    const target = targetAllocation[assetClass] || 0;
    const currentValue = (current / 100) * totalValue;
    const targetValue = (target / 100) * totalValue;
    const difference = targetValue - currentValue;
    
    return {
      assetClass,
      currentValue,
      targetValue,
      difference,
      action: difference > 0 ? "buy" : difference < 0 ? "sell" : "hold"
    };
  });
  
  return {
    currentAllocation,
    targetAllocation,
    differences,
    totalDifference,
    actions
  };
}

export function projectDividendGrowth(investments: Investment[], years: number = 10, growthRate: number = 0.05): DividendProjection[] {
  // Calculate initial values
  const initialPortfolioValue = investments.reduce((sum, inv) => sum + inv.value, 0);
  const initialDividendAmount = investments.reduce((sum, inv) => {
    const dividendYield = inv.annualDividend || 0;
    return sum + (inv.value * dividendYield / 100);
  }, 0);
  
  // Generate projections for each year
  const projections: DividendProjection[] = [];
  let cumulativeDividends = 0;
  let portfolioValue = initialPortfolioValue;
  let dividendAmount = initialDividendAmount;
  
  for (let year = 1; year <= years; year++) {
    // Assume portfolio grows at the specified growth rate
    portfolioValue *= (1 + growthRate);
    
    // Assume dividends grow at the same rate as the portfolio
    dividendAmount *= (1 + growthRate);
    
    // Add current year's dividends to cumulative total
    cumulativeDividends += dividendAmount;
    
    projections.push({
      year,
      dividendAmount,
      cumulativeDividends,
      portfolioValue
    });
  }
  
  return projections;
}

export function findTaxLossHarvestingOpportunities(investments: Investment[], taxRate: number = 0.15): TaxLossHarvestingOpportunity[] {
  // Filter investments with unrealized losses
  const investmentsWithLosses = investments.filter(inv => {
    const costBasis = inv.costBasis || inv.value;
    return inv.value < costBasis && inv.accountType === "taxable";
  });
  
  // Calculate potential tax savings for each investment with a loss
  return investmentsWithLosses.map(inv => {
    const costBasis = inv.costBasis || inv.value;
    const unrealizedLoss = costBasis - inv.value;
    const potentialTaxSavings = unrealizedLoss * taxRate;
    
    return {
      investment: inv,
      unrealizedLoss,
      potentialTaxSavings,
      alternativeInvestments: getAlternativeInvestments(inv)
    };
  });
}

export function calculateTaxEfficiency(investments: Investment[]): {
  taxableValue: number
  taxDeferredValue: number
  taxFreeValue: number
  taxEfficiencyScore: number
  recommendations: string[]
} {
  if (!investments.length) {
    return {
      taxableValue: 0,
      taxDeferredValue: 0,
      taxFreeValue: 0,
      taxEfficiencyScore: 0,
      recommendations: []
    };
  }
  
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0);
  
  // Group investments by account type
  const taxableInvestments = investments.filter(inv => inv.accountType === "taxable");
  const taxDeferredInvestments = investments.filter(inv => inv.accountType === "tax-deferred");
  const taxFreeInvestments = investments.filter(inv => inv.accountType === "tax-free");
  
  // Calculate values for each account type
  const taxableValue = taxableInvestments.reduce((sum, inv) => sum + inv.value, 0);
  const taxDeferredValue = taxDeferredInvestments.reduce((sum, inv) => sum + inv.value, 0);
  const taxFreeValue = taxFreeInvestments.reduce((sum, inv) => sum + inv.value, 0);
  
  // Define tax efficiency scores for different account types
  const accountTypeScores = {
    "taxable": 0.5,    // Medium tax efficiency
    "tax-deferred": 0.8, // High tax efficiency
    "tax-free": 1.0     // Maximum tax efficiency
  };
  
  // Calculate weighted tax efficiency score
  const taxEfficiencyScore = investments.reduce((sum, inv) => {
    const accountType = inv.accountType || "taxable";
    const score = accountTypeScores[accountType] || 0.5;
    return sum + (inv.value / totalValue) * score;
  }, 0) * 100;
  
  // Generate recommendations based on current allocation
  const recommendations = [];
  
  // Check if high-tax investments are in taxable accounts
  const highTaxInvestments = investments.filter(inv => 
    inv.assetClass === "Bonds" || inv.assetClass === "Real Estate"
  );
  
  const highTaxInTaxable = highTaxInvestments.filter(inv => inv.accountType === "taxable");
  if (highTaxInTaxable.length > 0) {
    recommendations.push("Consider moving bonds and REITs to tax-deferred accounts");
  }
  
  // Check if growth investments are in tax-free accounts
  const growthInvestments = investments.filter(inv => 
    inv.assetClass === "US Stocks" || inv.assetClass === "International Stocks"
  );
  
  const growthInTaxFree = growthInvestments.filter(inv => inv.accountType === "tax-free");
  if (growthInTaxFree.length === 0 && taxFreeValue > 0) {
    recommendations.push("Consider moving growth stocks to tax-free accounts");
  }
  
  return {
    taxableValue,
    taxDeferredValue,
    taxFreeValue,
    taxEfficiencyScore,
    recommendations
  };
}

// Default asset classes
export const defaultAssetClasses: AssetClass[] = [
  {
    id: "stocks",
    name: "Stocks",
    targetAllocation: 30,
    currentAllocation: 0,
    color: "rgb(59, 130, 246)", // blue-500
    investments: []
  },
  {
    id: "bonds",
    name: "Bonds",
    targetAllocation: 20,
    currentAllocation: 0,
    color: "rgb(239, 68, 68)", // red-500
    investments: []
  },
  {
    id: "cash",
    name: "Cash",
    targetAllocation: 5,
    currentAllocation: 0,
    color: "rgb(139, 92, 246)", // purple-500
    investments: []
  },
  {
    id: "alternative",
    name: "Alternative",
    targetAllocation: 5,
    currentAllocation: 0,
    color: "rgb(20, 184, 166)", // teal-500
    investments: []
  },
  {
    id: "shares",
    name: "Shares",
    targetAllocation: 15,
    currentAllocation: 0,
    color: "rgb(16, 185, 129)", // green-500
    investments: []
  },
  {
    id: "bills",
    name: "Bills",
    targetAllocation: 5,
    currentAllocation: 0,
    color: "rgb(99, 102, 241)", // indigo-500
    investments: []
  },
  {
    id: "crypto",
    name: "Crypto",
    targetAllocation: 5,
    currentAllocation: 0,
    color: "rgb(249, 115, 22)", // orange-500
    investments: []
  },
  {
    id: "real-estate",
    name: "Real Estate",
    targetAllocation: 15,
    currentAllocation: 0,
    color: "rgb(245, 158, 11)", // amber-500
    investments: []
  }
]
