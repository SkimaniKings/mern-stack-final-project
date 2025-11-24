"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bot, Send, User, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getTransactionStats } from "@/app/actions/transactions"
import { getAccountSummary } from "@/app/actions/accounts"
import { getCashflowForecast } from "@/lib/cashflow-utils"
import { getNetWorth } from "@/app/actions/net-worth"
import { formatCurrency, formatPercentage } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface FinancialAssistantProps {
  title?: string
  description?: string
}

export function FinancialAssistant({
  title = "Financial Assistant",
  description = "Ask questions about your finances and get personalized advice",
}: FinancialAssistantProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your financial assistant. How can I help you today?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [financialData, setFinancialData] = useState<any>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Load financial data on component mount
  useEffect(() => {
    async function loadFinancialData() {
      try {
        const [transactionStats, accountSummary, cashflowForecast, netWorthData] = await Promise.all([
          getTransactionStats("month").catch(() => ({
            totalIncome: 0,
            totalExpenses: 0,
            netIncome: 0,
            transactionCount: 0,
            averageTransaction: 0,
          })),
          getAccountSummary().catch(() => ({
            totalBalance: 0,
            accountCount: 0,
            currencyBreakdown: {},
            typeBreakdown: {},
          })),
          getCashflowForecast().catch(() => ({
            projectedIncome: 0,
            projectedExpenses: 0,
            netCashflow: 0,
            savingsRate: 0,
            monthlyTrend: [],
          })),
          getNetWorth().catch(() => ({
            totalAssets: 0,
            totalLiabilities: 0,
            netWorth: 0,
            assets: [],
            liabilities: [],
            history: []
          }))
        ])
        
        setFinancialData({
          transactionStats,
          accountSummary,
          cashflowForecast,
          netWorthData
        })
        setDataLoaded(true)
        
        // Add a welcome message with personalized financial summary
        if (accountSummary.totalBalance > 0 || netWorthData.netWorth > 0) {
          const welcomeMessage = {
            role: "assistant" as const,
            content: `Welcome back! Your current net worth is ${formatCurrency(netWorthData.netWorth)} and your monthly cashflow is ${formatCurrency(transactionStats.netIncome)}. How can I help you today?`
          }
          setMessages([welcomeMessage])
        }
        
      } catch (error) {
        console.error("Error loading financial data:", error)
      }
    }
    
    loadFinancialData()
  }, [])

  const handleSend = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get response based on financial data
      const response = await getAssistantResponse(input, financialData)
      
      const assistantMessage: Message = {
        role: "assistant",
        content: response,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error getting assistant response:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend()
    }
  }

  return (
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[340px] px-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 mb-4 ${
                message.role === "assistant" ? "items-start" : "items-start flex-row-reverse"
              }`}
            >
              <Avatar className={message.role === "user" ? "bg-primary" : "bg-muted"}>
                <AvatarFallback>{message.role === "user" ? <User size={18} /> : <Bot size={18} />}</AvatarFallback>
              </Avatar>
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 mb-4 items-start">
              <Avatar className="bg-muted">
                <AvatarFallback><Bot size={18} /></AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Analyzing your financial data...</span>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex w-full gap-2">
          <Input
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow"
            disabled={isLoading || !dataLoaded}
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading || !dataLoaded}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
        {!dataLoaded && (
          <p className="text-xs text-muted-foreground mt-2">Loading your financial data...</p>
        )}
      </CardFooter>
    </Card>
  )
}

// Helper function to generate responses based on user input and financial data
async function getAssistantResponse(input: string, financialData: any): Promise<string> {
  if (!financialData) {
    return "I don't have access to your financial data at the moment. Please try again later."
  }
  
  const { transactionStats, accountSummary, cashflowForecast, netWorthData } = financialData
  const inputLower = input.toLowerCase()

  // Budget and spending questions
  if (inputLower.includes("budget") || inputLower.includes("spending") || inputLower.includes("expense")) {
    const topExpenseCategories = await getTopExpenseCategories()
    const topCategory = topExpenseCategories[0] || { name: "dining", amount: 0 }
    const budgetUtilization = cashflowForecast.projectedExpenses > 0 
      ? Math.min(100, Math.round((cashflowForecast.projectedExpenses / cashflowForecast.projectedIncome) * 100)) 
      : 0
    
    return `Based on your recent transactions, you've spent ${formatCurrency(transactionStats.totalExpenses)} this month. ` + 
      `Your highest spending category is ${topCategory.name} at ${formatCurrency(topCategory.amount)}. ` + 
      `You're currently at ${budgetUtilization}% of your monthly budget. ` + 
      (budgetUtilization > 90 
        ? "You're very close to exceeding your budget. Consider reducing non-essential expenses." 
        : budgetUtilization > 75 
          ? "You're on track but should monitor your spending for the rest of the month." 
          : "You're well within your budget for this month.")
  }

  // Savings questions
  if (inputLower.includes("save") || inputLower.includes("saving")) {
    const savingsRate = cashflowForecast.savingsRate || 0
    const recommendedSavingsRate = 20
    const monthlySavingsTarget = transactionStats.totalIncome * (recommendedSavingsRate / 100)
    
    return `Your current savings rate is ${Math.round(savingsRate)}%. ` + 
      (savingsRate < recommendedSavingsRate 
        ? `To reach the recommended ${recommendedSavingsRate}% savings rate, you should aim to save ${formatCurrency(monthlySavingsTarget)} per month. ` + 
          `This would be an increase of ${formatCurrency(monthlySavingsTarget - (transactionStats.totalIncome * (savingsRate / 100)))} from your current savings.`
        : `Great job! You're exceeding the recommended ${recommendedSavingsRate}% savings rate. ` + 
          `You're currently saving approximately ${formatCurrency(transactionStats.totalIncome * (savingsRate / 100))} per month.`) + 
      ` Consider setting up automatic transfers to a high-yield savings account for your emergency fund.`
  }

  // Investment questions
  if (inputLower.includes("invest") || inputLower.includes("investment")) {
    // Get investment data from the net worth assets that are investments
    const investments = netWorthData.assets.filter((asset: any) => 
      asset.type === "investment" || asset.type === "retirement" || asset.type === "stocks"
    )
    const totalInvestments = investments.reduce((sum: number, inv: any) => sum + inv.value, 0)
    const investmentAllocation = totalInvestments > 0 ? (totalInvestments / netWorthData.totalAssets) * 100 : 0
    
    return `Your investment portfolio is currently valued at ${formatCurrency(totalInvestments)}, ` + 
      `which represents ${Math.round(investmentAllocation)}% of your total assets. ` + 
      (investmentAllocation < 30 
        ? "Consider increasing your investment allocation to build long-term wealth. A target of 30-40% of assets in investments is recommended for long-term growth." 
        : "Your investment allocation looks healthy. Make sure your portfolio is properly diversified across different asset classes.") + 
      ` Based on your income and expenses, you could potentially invest an additional ${formatCurrency(transactionStats.netIncome * 0.3)} per month.`
  }

  // Debt and loan questions
  if (inputLower.includes("debt") || inputLower.includes("loan")) {
    const debtToIncomeRatio = netWorthData.totalLiabilities > 0 
      ? (netWorthData.totalLiabilities / (transactionStats.totalIncome * 12)) * 100 
      : 0
    
    return `Your current debt balance is ${formatCurrency(netWorthData.totalLiabilities)}, ` + 
      `with a debt-to-income ratio of ${Math.round(debtToIncomeRatio)}%. ` + 
      (debtToIncomeRatio > 36 
        ? "This is above the recommended maximum of 36%. Consider focusing on debt reduction strategies." 
        : debtToIncomeRatio > 20 
          ? "This is within a reasonable range, but you should avoid taking on additional debt." 
          : "This is a healthy debt level. Continue making regular payments to maintain your good financial position.") + 
      ` If you allocated ${formatCurrency(transactionStats.netIncome * 0.2)} of your monthly surplus to debt repayment, you could reduce your debt faster and save on interest.`
  }

  // Income questions
  if (inputLower.includes("income") || inputLower.includes("earn")) {
    return `Your current monthly income is ${formatCurrency(transactionStats.totalIncome)}. ` + 
      `After expenses of ${formatCurrency(transactionStats.totalExpenses)}, ` + 
      `your net monthly cashflow is ${formatCurrency(transactionStats.netIncome)}. ` + 
      (transactionStats.netIncome > 0 
        ? `This positive cashflow gives you an opportunity to increase your savings or investments. ` + 
          `If you allocated ${formatPercentage(0.4)} to savings and ${formatPercentage(0.4)} to investments, ` + 
          `you could build your financial security faster.`
        : `This negative cashflow is concerning. Consider ways to increase your income or reduce expenses ` + 
          `to avoid depleting your savings or increasing debt.`)
  }

  // Net worth questions
  if (inputLower.includes("net worth") || inputLower.includes("assets") || inputLower.includes("liabilities")) {
    const netWorthChange = netWorthData.history && netWorthData.history.length > 1 
      ? netWorthData.netWorth - netWorthData.history[netWorthData.history.length - 2].netWorth 
      : 0
    const netWorthChangePercent = netWorthData.history && netWorthData.history.length > 1 && netWorthData.history[netWorthData.history.length - 2].netWorth > 0
      ? (netWorthChange / netWorthData.history[netWorthData.history.length - 2].netWorth) * 100 
      : 0
    
    return `Your current net worth is ${formatCurrency(netWorthData.netWorth)}, ` + 
      `with total assets of ${formatCurrency(netWorthData.totalAssets)} and ` + 
      `liabilities of ${formatCurrency(netWorthData.totalLiabilities)}. ` + 
      (netWorthData.history && netWorthData.history.length > 1 
        ? `Your net worth has ${netWorthChange >= 0 ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(netWorthChange))} ` + 
          `(${Math.abs(netWorthChangePercent).toFixed(1)}%) since last month. ` 
        : ``) + 
      `To continue building your net worth, focus on increasing your assets through investments and reducing high-interest debt.`
  }

  // Account questions
  if (inputLower.includes("account") || inputLower.includes("balance")) {
    const accountTypes = Object.keys(accountSummary.typeBreakdown)
    const accountTypesList = accountTypes.map(type => 
      `${type} (${formatCurrency(accountSummary.typeBreakdown[type])})
`
    ).join(', ')
    
    return `You have ${accountSummary.accountCount} accounts with a total balance of ${formatCurrency(accountSummary.totalBalance)}. ` + 
      (accountTypes.length > 0 
        ? `Your accounts include: ${accountTypesList}. ` 
        : ``) + 
      `Make sure you're maximizing interest on your savings by using high-yield accounts, ` + 
      `and consider consolidating accounts if you have multiple accounts of the same type to simplify your finances.`
  }

  // General financial health
  if (inputLower.includes("financial health") || inputLower.includes("overview") || inputLower.includes("summary")) {
    const emergencyFundMonths = accountSummary.typeBreakdown.savings 
      ? accountSummary.typeBreakdown.savings / transactionStats.totalExpenses 
      : 0
    
    return `Your financial health overview:

` + 
      `• Net Worth: ${formatCurrency(netWorthData.netWorth)}
` + 
      `• Monthly Income: ${formatCurrency(transactionStats.totalIncome)}
` + 
      `• Monthly Expenses: ${formatCurrency(transactionStats.totalExpenses)}
` + 
      `• Savings Rate: ${Math.round(cashflowForecast.savingsRate)}%
` + 
      `• Emergency Fund: ${emergencyFundMonths.toFixed(1)} months of expenses

` + 
      `Areas to focus on:
` + 
      (cashflowForecast.savingsRate < 15 ? `• Increase your savings rate (target: 15-20%)
` : ``) + 
      (emergencyFundMonths < 3 ? `• Build your emergency fund (target: 3-6 months)
` : ``) + 
      (netWorthData.totalLiabilities > netWorthData.totalAssets * 0.5 ? `• Reduce high-interest debt
` : ``) + 
      (accountSummary.accountCount < 2 ? `• Diversify your accounts
` : ``)
  }

  // Fallback response
  return `I can help you analyze your finances based on your data. You can ask about:

` + 
    `• Budget and spending patterns
` + 
    `• Savings strategies
` + 
    `• Investment portfolio
` + 
    `• Debt management
` + 
    `• Income analysis
` + 
    `• Net worth tracking
` + 
    `• Account balances
` + 
    `• Overall financial health

` + 
    `What would you like to know about?`
}

// Helper function to get top expense categories
async function getTopExpenseCategories() {
  try {
    // This would normally call an API to get the data
    // For now, we'll return mock data
    return [
      { name: "Housing", amount: 1500 },
      { name: "Food", amount: 600 },
      { name: "Transportation", amount: 400 },
      { name: "Entertainment", amount: 300 }
    ]
  } catch (error) {
    console.error("Error fetching top expense categories:", error)
    return []
  }
}

