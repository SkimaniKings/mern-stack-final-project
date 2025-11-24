import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InfoIcon, CalendarIcon, ClockIcon, TrendingUpIcon, CheckCircleIcon, PieChartIcon } from "lucide-react"
import { supabaseClient } from "@/lib/supabase"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts"

interface Bill {
  id: string
  name: string
  category: string
  amount: number
  due_date: string
  is_recurring: boolean
  frequency: string
  payment_method: string
  status: string
}

interface Subscription {
  id: string
  name: string
  category: string
  cost: number
  billing_cycle: string
  next_billing_date: string
  payment_method: string
}

interface PaymentSchedule {
  date: string
  amount: number
  items: {
    id: string
    name: string
    amount: number
    type: "bill" | "subscription"
    category: string
  }[]
}

interface CashFlowProjection {
  date: string
  balance: number
  income: number
  expenses: number
}

interface CategoryExpense {
  name: string
  value: number
  color: string
}

// Define static expense categories with colors
const EXPENSE_CATEGORIES = [
  { name: "Housing", color: "#8884d8" },
  { name: "Utilities", color: "#82ca9d" },
  { name: "Insurance", color: "#ffc658" },
  { name: "Transportation", color: "#ff8042" },
  { name: "Food", color: "#0088fe" },
  { name: "Healthcare", color: "#00c49f" },
  { name: "Entertainment", color: "#ffbb28" },
  { name: "Education", color: "#a4de6c" },
  { name: "Personal Care", color: "#d0ed57" },
  { name: "Savings", color: "#8dd1e1" },
  { name: "Debt Payments", color: "#ff7c43" },
  { name: "Other", color: "#c6dbef" }
]

// Helper function to categorize expenses based on name
const categorizeExpense = (name: string): string => {
  const lowerName = name.toLowerCase()
  
  // Housing related
  if (lowerName.includes('rent') || lowerName.includes('mortgage') || lowerName.includes('hoa') || lowerName.includes('property')) {
    return 'Housing'
  }
  
  // Utilities
  if (lowerName.includes('electric') || lowerName.includes('water') || lowerName.includes('gas') || 
      lowerName.includes('internet') || lowerName.includes('phone') || lowerName.includes('utility') || 
      lowerName.includes('wifi') || lowerName.includes('cable') || lowerName.includes('broadband')) {
    return 'Utilities'
  }
  
  // Insurance
  if (lowerName.includes('insurance') || lowerName.includes('coverage') || lowerName.includes('policy')) {
    return 'Insurance'
  }
  
  // Transportation
  if (lowerName.includes('car') || lowerName.includes('auto') || lowerName.includes('vehicle') || 
      lowerName.includes('gas') || lowerName.includes('fuel') || lowerName.includes('transportation') || 
      lowerName.includes('uber') || lowerName.includes('lyft') || lowerName.includes('transit')) {
    return 'Transportation'
  }
  
  // Food
  if (lowerName.includes('grocery') || lowerName.includes('food') || lowerName.includes('meal') || 
      lowerName.includes('restaurant') || lowerName.includes('dining')) {
    return 'Food'
  }
  
  // Healthcare
  if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('doctor') || 
      lowerName.includes('dental') || lowerName.includes('pharmacy') || lowerName.includes('prescription')) {
    return 'Healthcare'
  }
  
  // Entertainment
  if (lowerName.includes('entertainment') || lowerName.includes('movie') || lowerName.includes('game') || 
      lowerName.includes('subscription') || lowerName.includes('streaming')) {
    return 'Entertainment'
  }
  
  // Education
  if (lowerName.includes('tuition') || lowerName.includes('education') || lowerName.includes('school') || 
      lowerName.includes('college') || lowerName.includes('university') || lowerName.includes('student')) {
    return 'Education'
  }
  
  // Debt Payments
  if (lowerName.includes('loan') || lowerName.includes('debt') || lowerName.includes('credit card') || 
      lowerName.includes('payment') || lowerName.includes('finance')) {
    return 'Debt Payments'
  }
  
  return 'Other'
}

// Helper function to categorize subscriptions based on name
const categorizeSubscription = (name: string): string => {
  const lowerName = name.toLowerCase()
  
  // Entertainment subscriptions
  if (lowerName.includes('netflix') || lowerName.includes('hulu') || lowerName.includes('disney') || 
      lowerName.includes('spotify') || lowerName.includes('apple music') || lowerName.includes('youtube') || 
      lowerName.includes('hbo') || lowerName.includes('prime') || lowerName.includes('streaming')) {
    return 'Entertainment'
  }
  
  // Software subscriptions
  if (lowerName.includes('adobe') || lowerName.includes('microsoft') || lowerName.includes('office') || 
      lowerName.includes('software') || lowerName.includes('app') || lowerName.includes('cloud')) {
    return 'Education'  // Software often categorized as education/productivity
  }
  
  // Fitness subscriptions
  if (lowerName.includes('gym') || lowerName.includes('fitness') || lowerName.includes('workout') || 
      lowerName.includes('peloton') || lowerName.includes('exercise')) {
    return 'Personal Care'
  }
  
  // News and media
  if (lowerName.includes('news') || lowerName.includes('magazine') || lowerName.includes('newspaper') || 
      lowerName.includes('journal') || lowerName.includes('subscription')) {
    return 'Entertainment'
  }
  
  return 'Entertainment'  // Default for most subscriptions
}

// Helper function to calculate next occurrences of recurring bills
const calculateNextOccurrences = (startDate: Date, frequency: string, count: number): Date[] => {
  const dates: Date[] = []
  const lowerFrequency = frequency.toLowerCase()
  
  for (let i = 1; i <= count; i++) {
    const nextDate = new Date(startDate)
    
    if (lowerFrequency.includes('daily')) {
      nextDate.setDate(startDate.getDate() + (i * 1))
    } else if (lowerFrequency.includes('weekly')) {
      nextDate.setDate(startDate.getDate() + (i * 7))
    } else if (lowerFrequency.includes('bi-weekly') || lowerFrequency.includes('biweekly') || lowerFrequency.includes('fortnightly')) {
      nextDate.setDate(startDate.getDate() + (i * 14))
    } else if (lowerFrequency.includes('monthly')) {
      nextDate.setMonth(startDate.getMonth() + (i * 1))
    } else if (lowerFrequency.includes('quarterly') || lowerFrequency.includes('quarter')) {
      nextDate.setMonth(startDate.getMonth() + (i * 3))
    } else if (lowerFrequency.includes('semi-annual') || lowerFrequency.includes('semiannual') || lowerFrequency.includes('half-yearly')) {
      nextDate.setMonth(startDate.getMonth() + (i * 6))
    } else if (lowerFrequency.includes('annual') || lowerFrequency.includes('yearly')) {
      nextDate.setFullYear(startDate.getFullYear() + (i * 1))
    } else {
      // Default to monthly if frequency is unknown
      nextDate.setMonth(startDate.getMonth() + (i * 1))
    }
    
    dates.push(nextDate)
  }
  
  return dates
}

export function SmartPaymentScheduler() {
  const [bills, setBills] = useState<Bill[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([])
  const [cashFlowProjection, setCashFlowProjection] = useState<CashFlowProjection[]>([])
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("calendar")
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [monthlyIncome, setMonthlyIncome] = useState(5000) // Default monthly income
  const [optimizationStrategy, setOptimizationStrategy] = useState("balanced")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (bills.length > 0 || subscriptions.length > 0) {
      generatePaymentSchedule()
      generateCashFlowProjection()
      calculateCategoryExpenses()
    }
  }, [bills, subscriptions, selectedMonth, monthlyIncome, optimizationStrategy])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the current user
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (!user) {
        setError("You must be logged in to view your payment schedule")
        return
      }
      
      // Fetch bills with proper filtering
      const { data: billsData, error: billsError } = await supabaseClient
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
      
      if (billsError) {
        console.error("Error fetching bills:", billsError)
        setError("Failed to load bills data")
        return
      }
      
      // Fetch subscriptions with proper filtering
      const { data: subsData, error: subsError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
      
      if (subsError) {
        console.error("Error fetching subscriptions:", subsError)
        setError("Failed to load subscription data")
        return
      }
      
      // Fetch user income data
      const { data: incomeData, error: incomeError } = await supabaseClient
        .from('user_financial_profile')
        .select('monthly_income')
        .eq('user_id', user.id)
        .single()
      
      if (!incomeError && incomeData && incomeData.monthly_income) {
        setMonthlyIncome(incomeData.monthly_income)
      }
      
      // Process and normalize the data
      const normalizedBills = billsData?.map(bill => ({
        ...bill,
        category: bill.category || categorizeExpense(bill.name)
      })) || []
      
      const normalizedSubscriptions = subsData?.map(sub => ({
        ...sub,
        category: sub.category || categorizeSubscription(sub.name)
      })) || []
      
      setBills(normalizedBills)
      setSubscriptions(normalizedSubscriptions)
      
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("An unexpected error occurred while loading your data")
    } finally {
      setLoading(false)
    }
  }

  const generatePaymentSchedule = () => {
    // Get the start and end of the selected month
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
    
    // Create a map to group payments by date
    const scheduleMap = new Map<string, PaymentSchedule>()
    
    // Add bills to the schedule
    bills.forEach(bill => {
      try {
        // Skip bills with invalid dates
        if (!bill.due_date) return
        
        const dueDate = new Date(bill.due_date)
        if (isNaN(dueDate.getTime())) return
        
        // Check if the bill is due in the selected month
        if (dueDate >= startDate && dueDate <= endDate) {
          const dateKey = dueDate.toISOString().split('T')[0]
          
          if (!scheduleMap.has(dateKey)) {
            scheduleMap.set(dateKey, {
              date: dateKey,
              amount: 0,
              items: []
            })
          }
          
          const schedule = scheduleMap.get(dateKey)!
          schedule.amount += bill.amount
          schedule.items.push({
            id: bill.id,
            name: bill.name,
            amount: bill.amount,
            type: "bill",
            category: bill.category || "Other"
          })
        }
        
        // For recurring bills, also check if we need to add future occurrences
        if (bill.is_recurring && bill.frequency) {
          // Calculate next occurrences based on frequency
          const nextDates = calculateNextOccurrences(dueDate, bill.frequency, 3) // Get next 3 occurrences
          
          // Add future occurrences that fall within this month
          nextDates.forEach(nextDate => {
            if (nextDate >= startDate && nextDate <= endDate && nextDate > dueDate) {
              const dateKey = nextDate.toISOString().split('T')[0]
              
              if (!scheduleMap.has(dateKey)) {
                scheduleMap.set(dateKey, {
                  date: dateKey,
                  amount: 0,
                  items: []
                })
              }
              
              const schedule = scheduleMap.get(dateKey)!
              schedule.amount += bill.amount
              schedule.items.push({
                id: bill.id,
                name: bill.name,
                amount: bill.amount,
                type: "bill",
                category: bill.category || "Other"
              })
            }
          })
        }
      } catch (e) {
        console.error("Error processing bill:", e)
      }
    })
    
    // Add subscriptions to the schedule
    subscriptions.forEach(subscription => {
      try {
        // Skip subscriptions with invalid dates
        if (!subscription.next_billing_date) return
        
        const nextBillingDate = new Date(subscription.next_billing_date)
        if (isNaN(nextBillingDate.getTime())) return
        
        // Check if the subscription is due in the selected month
        if (nextBillingDate >= startDate && nextBillingDate <= endDate) {
          const dateKey = nextBillingDate.toISOString().split('T')[0]
          
          if (!scheduleMap.has(dateKey)) {
            scheduleMap.set(dateKey, {
              date: dateKey,
              amount: 0,
              items: []
            })
          }
          
          const schedule = scheduleMap.get(dateKey)!
          schedule.amount += subscription.cost
          schedule.items.push({
            id: subscription.id,
            name: subscription.name,
            amount: subscription.cost,
            type: "subscription",
            category: subscription.category || "Other"
          })
        }
      } catch (e) {
        console.error("Error processing subscription:", e)
      }
    })
    
    // Convert the map to an array and sort by date
    const schedule = Array.from(scheduleMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Apply optimization strategy
    const optimizedSchedule = [...schedule]
    
    if (optimizationStrategy === "early") {
      // Group payments to the beginning of the month to maximize cash flow later in the month
      // First, calculate total expenses for the month
      const totalExpenses = schedule.reduce((sum, item) => sum + item.amount, 0)
      
      // Determine if we have enough income to cover all expenses at the beginning
      if (totalExpenses <= monthlyIncome * 0.5) {
        // We can pay everything early
        const earlyDate = new Date(startDate)
        earlyDate.setDate(5) // 5th of the month
        const earlyDateKey = earlyDate.toISOString().split('T')[0]
        
        // Create a combined payment for all items
        const combinedItems: PaymentSchedule['items'] = []
        schedule.forEach(item => {
          combinedItems.push(...item.items)
        })
        
        // Replace the schedule with a single optimized payment
        return setPaymentSchedule([{
          date: earlyDateKey,
          amount: totalExpenses,
          items: combinedItems
        }])
      } else {
        // We need to prioritize which bills to pay early
        // Sort items by importance/priority (using amount as a proxy for now)
        const sortedItems = schedule.flatMap(item => item.items).sort((a, b) => b.amount - a.amount)
        
        // Create two payment dates - early and mid-month
        const earlyDate = new Date(startDate)
        earlyDate.setDate(5) // 5th of the month
        const earlyDateKey = earlyDate.toISOString().split('T')[0]
        
        const midDate = new Date(startDate)
        midDate.setDate(15) // 15th of the month
        const midDateKey = midDate.toISOString().split('T')[0]
        
        // Allocate items to early or mid-month based on income
        const earlyItems: PaymentSchedule['items'] = []
        const midItems: PaymentSchedule['items'] = []
        let earlyTotal = 0
        let midTotal = 0
        
        sortedItems.forEach(item => {
          if (earlyTotal + item.amount <= monthlyIncome * 0.5) {
            earlyItems.push(item)
            earlyTotal += item.amount
          } else {
            midItems.push(item)
            midTotal += item.amount
          }
        })
        
        // Create the optimized schedule
        const optimizedSchedule = [
          {
            date: earlyDateKey,
            amount: earlyTotal,
            items: earlyItems
          },
          {
            date: midDateKey,
            amount: midTotal,
            items: midItems
          }
        ]
        
        return setPaymentSchedule(optimizedSchedule)
      }
    } else if (optimizationStrategy === "late") {
      // Group payments toward the end of the month to maximize interest earned
      // Create a payment date near the end of the month
      const lateDate = new Date(startDate)
      lateDate.setDate(25) // 25th of the month
      const lateDateKey = lateDate.toISOString().split('T')[0]
      
      // Create a combined payment for all items
      const combinedItems: PaymentSchedule['items'] = []
      schedule.forEach(item => {
        combinedItems.push(...item.items)
      })
      
      // Replace the schedule with a single optimized payment
      return setPaymentSchedule([{
        date: lateDateKey,
        amount: combinedItems.reduce((sum, item) => sum + item.amount, 0),
        items: combinedItems
      }])
    } else if (optimizationStrategy === "balanced") {
      // Distribute payments evenly throughout the month to maintain steady cash flow
      // Group payments into weekly batches
      const weeklySchedule: PaymentSchedule[] = []
      
      // Create 4 payment dates (roughly weekly)
      for (let week = 0; week < 4; week++) {
        const weekDate = new Date(startDate)
        weekDate.setDate(7 * week + 7) // 7th, 14th, 21st, 28th
        const weekDateKey = weekDate.toISOString().split('T')[0]
        
        weeklySchedule.push({
          date: weekDateKey,
          amount: 0,
          items: []
        })
      }
      
      // Distribute items across the weeks
      schedule.flatMap(item => item.items).forEach((item, index) => {
        const weekIndex = index % 4
        weeklySchedule[weekIndex].items.push(item)
        weeklySchedule[weekIndex].amount += item.amount
      })
      
      // Filter out weeks with no payments
      const filteredSchedule = weeklySchedule.filter(week => week.items.length > 0)
      
      return setPaymentSchedule(filteredSchedule)
    }
    
    // If no optimization strategy applied or it failed, use the original schedule
    setPaymentSchedule(schedule)
  }

  const calculateCategoryExpenses = () => {
    // Initialize category expenses with zero values
    const initialCategories = EXPENSE_CATEGORIES.map(category => ({
      name: category.name,
      value: 0,
      color: category.color
    }))
    
    // Calculate expenses by category
    const categoryMap = new Map<string, number>()
    
    // Process all items in the payment schedule
    paymentSchedule.forEach(schedule => {
      schedule.items.forEach(item => {
        const category = item.category || "Other"
        const currentValue = categoryMap.get(category) || 0
        categoryMap.set(category, currentValue + item.amount)
      })
    })
    
    // Update the category expenses
    const updatedCategories = initialCategories.map(category => {
      const value = categoryMap.get(category.name) || 0
      return {
        ...category,
        value
      }
    })
    
    // Filter out categories with zero value
    const nonZeroCategories = updatedCategories.filter(category => category.value > 0)
    
    setCategoryExpenses(nonZeroCategories)
  }

  const generateCashFlowProjection = () => {
    // Get the start and end of the selected month
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
    
    // Create a projection for each day of the month
    const projection: CashFlowProjection[] = []
    
    // Assume income arrives on the 1st and 15th of the month
    const incomeDates = [
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1),
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 15)
    ]
    
    // Calculate total expenses for the month
    const totalExpenses = paymentSchedule.reduce((sum, item) => sum + item.amount, 0)
    
    // Distribute expenses across the month based on the optimization strategy
    let remainingExpenses = totalExpenses
    let dayCount = 0
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      const isIncomeDay = incomeDates.some(date => 
        date.getDate() === d.getDate() && 
        date.getMonth() === d.getMonth() && 
        date.getFullYear() === d.getFullYear()
      )
      
      // Calculate income for this day
      const income = isIncomeDay ? monthlyIncome / 2 : 0
      
      // Calculate expenses for this day
      let expenses = 0
      
      if (optimizationStrategy === "early") {
        // Front-load expenses
        if (dayCount < 10) {
          expenses = remainingExpenses / (10 - dayCount)
          remainingExpenses -= expenses
        }
      } else if (optimizationStrategy === "late") {
        // Back-load expenses
        const daysLeft = endDate.getDate() - d.getDate() + 1
        if (daysLeft <= 10) {
          expenses = remainingExpenses / daysLeft
          remainingExpenses -= expenses
        }
      } else {
        // Balanced approach - distribute evenly
        expenses = totalExpenses / endDate.getDate()
      }
      
      // Find payments scheduled for this day
      const scheduledPayments = paymentSchedule.filter(item => item.date === dateKey)
      if (scheduledPayments.length > 0) {
        expenses = scheduledPayments.reduce((sum, item) => sum + item.amount, 0)
      }
      
      // Calculate balance
      const previousBalance = projection.length > 0 
        ? projection[projection.length - 1].balance 
        : 0
      
      const balance = previousBalance + income - expenses
      
      projection.push({
        date: dateKey,
        balance,
        income,
        expenses
      })
      
      dayCount++
    }
    
    setCashFlowProjection(projection)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const handleMonthChange = (date: Date | undefined) => {
    if (date) {
      setSelectedMonth(date)
    }
  }

  const handleStrategyChange = (value: string) => {
    setOptimizationStrategy(value)
  }
  
  // Function to save the current payment schedule to Supabase
  const saveSchedule = async () => {
    try {
      setSaving(true)
      setSaveSuccess(false)
      setError(null)
      
      // Get the current user
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (!user) {
        setError("You must be logged in to save your payment schedule")
        return
      }
      
      // Format the schedule for storage
      const scheduleToSave = {
        user_id: user.id,
        month: selectedMonth.toISOString().split('T')[0].substring(0, 7), // YYYY-MM format
        strategy: optimizationStrategy,
        schedule: paymentSchedule,
        created_at: new Date().toISOString(),
        total_amount: paymentSchedule.reduce((sum, item) => sum + item.amount, 0)
      }
      
      // Check if a schedule already exists for this month
      const { data: existingSchedule, error: checkError } = await supabaseClient
        .from('payment_schedules')
        .select('id')
        .eq('user_id', user.id)
        .eq('month', scheduleToSave.month)
        .single()
      
      let saveError
      
      if (existingSchedule) {
        // Update existing schedule
        const { error } = await supabaseClient
          .from('payment_schedules')
          .update({
            strategy: scheduleToSave.strategy,
            schedule: scheduleToSave.schedule,
            updated_at: scheduleToSave.created_at,
            total_amount: scheduleToSave.total_amount
          })
          .eq('id', existingSchedule.id)
        
        saveError = error
      } else {
        // Insert new schedule
        const { error } = await supabaseClient
          .from('payment_schedules')
          .insert(scheduleToSave)
        
        saveError = error
      }
      
      if (saveError) {
        console.error("Error saving schedule:", saveError)
        setError("Failed to save your payment schedule")
        return
      }
      
      setSaveSuccess(true)
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      
    } catch (error) {
      console.error("Error in saveSchedule:", error)
      setError("An unexpected error occurred while saving your schedule")
    } finally {
      setSaving(false)
    }
  }

  const getCategoryColor = (categoryName: string) => {
    const category = EXPENSE_CATEGORIES.find(cat => cat.name === categoryName)
    return category ? category.color : "#c6dbef" // Default to "Other" color
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-500" />
          Smart Payment Scheduler
        </CardTitle>
        <CardDescription>
          Optimize your payment schedule to improve cash flow
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Monthly Income</label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Optimization Strategy</label>
                <Select value={optimizationStrategy} onValueChange={handleStrategyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="early">Early Payments</SelectItem>
                    <SelectItem value="late">Late Payments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Selected Month</label>
                <div className="text-lg font-medium">{getMonthName(selectedMonth)}</div>
              </div>
            </div>
            
            <Tabs defaultValue="calendar" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>
              
              <TabsContent value="calendar" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      onSelect={handleMonthChange}
                      className="rounded-md border"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium mb-4">Payment Schedule for {getMonthName(selectedMonth)}</h3>
                    
                    {paymentSchedule.length === 0 ? (
                      <Alert>
                        <InfoIcon className="h-5 w-5" />
                        <AlertTitle>No payments scheduled</AlertTitle>
                        <AlertDescription>
                          There are no bills or subscriptions due in the selected month.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {paymentSchedule.map((schedule, index) => (
                          <Card key={index} className="overflow-hidden">
                            <div className="p-4 border-b">
                              <div className="flex justify-between items-center">
                                <div className="font-medium">{formatDate(schedule.date)}</div>
                                <div className="font-bold">{formatCurrency(schedule.amount)}</div>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <ul className="space-y-2">
                                {schedule.items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getCategoryColor(item.category) }}></span>
                                      <span>{item.name}</span>
                                      <span className="text-xs text-muted-foreground">({item.category})</span>
                                    </div>
                                    <span>{formatCurrency(item.amount)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="space-y-4">
                <h3 className="text-lg font-medium mb-4">Payment Timeline</h3>
                
                {paymentSchedule.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No payments scheduled</AlertTitle>
                    <AlertDescription>
                      There are no bills or subscriptions due in the selected month.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={paymentSchedule}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.getDate().toString()
                          }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label) => formatDate(label)}
                        />
                        <Legend />
                        <Bar dataKey="amount" name="Payment Amount" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="cashflow" className="space-y-4">
                <h3 className="text-lg font-medium mb-4">Cash Flow Projection</h3>
                
                {cashFlowProjection.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No cash flow data</AlertTitle>
                    <AlertDescription>
                      There are no payments scheduled in the selected month.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={cashFlowProjection}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.getDate().toString()
                          }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label) => formatDate(label)}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          name="Account Balance" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="income" 
                          name="Income" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="expenses" 
                          name="Expenses" 
                          stroke="#ff8042" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-2">Strategy Recommendations</h4>
                  
                  {optimizationStrategy === "balanced" && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <InfoIcon className="h-5 w-5 text-blue-500" />
                      <AlertTitle>Balanced Strategy</AlertTitle>
                      <AlertDescription>
                        Payments are scheduled on their original due dates. This approach maintains your current payment schedule but may result in uneven cash flow.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {optimizationStrategy === "early" && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <AlertTitle>Early Payments Strategy</AlertTitle>
                      <AlertDescription>
                        Payments are moved to the beginning of the month. This approach helps you get bills out of the way early and may improve your credit score, but requires having funds available at the start of the month.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {optimizationStrategy === "late" && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <ClockIcon className="h-5 w-5 text-yellow-500" />
                      <AlertTitle>Late Payments Strategy</AlertTitle>
                      <AlertDescription>
                        Payments are moved to the end of the month. This approach maximizes the time your money stays in your account, but may result in a larger outflow at the end of the month.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="categories" className="space-y-4">
                <h3 className="text-lg font-medium mb-4">Expense Categories</h3>
                
                {categoryExpenses.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No expense data</AlertTitle>
                    <AlertDescription>
                      There are no expenses scheduled in the selected month.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-80">
                        <h4 className="text-md font-medium mb-2">Expense Distribution</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryExpenses}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {categoryExpenses.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div>
                        <h4 className="text-md font-medium mb-2">Category Breakdown</h4>
                        <div className="space-y-2">
                          {categoryExpenses.map((category, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></span>
                                <span>{category.name}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(category.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="text-md font-medium mb-2">Category Insights</h4>
                      
                      {categoryExpenses.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-sm text-muted-foreground">Largest Expense Category</div>
                              <div className="text-xl font-bold">
                                {categoryExpenses.sort((a, b) => b.value - a.value)[0].name}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {formatCurrency(categoryExpenses.sort((a, b) => b.value - a.value)[0].value)}
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-sm text-muted-foreground">Percentage of Income</div>
                              <div className="text-xl font-bold">
                                {((categoryExpenses.reduce((sum, cat) => sum + cat.value, 0) / monthlyIncome) * 100).toFixed(1)}%
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {formatCurrency(categoryExpenses.reduce((sum, cat) => sum + cat.value, 0))} of {formatCurrency(monthlyIncome)}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  )
} 