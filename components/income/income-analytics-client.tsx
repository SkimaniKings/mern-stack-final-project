"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { ArrowUpRight, TrendingUp, DollarSign, Calendar, BarChart3, PieChart as PieChartIcon } from "lucide-react"

// Import client components with dynamic imports
const DiversificationScore = dynamic(() => import("@/components/income/diversification-score").then(mod => mod.DiversificationScore), { ssr: false })

import type { Income } from "@/app/actions/income"

interface IncomeAnalyticsClientProps {
  incomes: Income[]
  diversificationScore: number
}

// Function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Colors for charts
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD", 
  "#5DADE2", "#48C9B0", "#F4D03F", "#EB984E", "#EC7063"
];

export function IncomeAnalyticsClient({ incomes, diversificationScore }: IncomeAnalyticsClientProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Log the diversification score to help debug
  console.log("Diversification score received in IncomeAnalyticsClient:", diversificationScore);

  // Calculate monthly and annual income using monthly_equivalent_amount
  const monthlyIncome = incomes.reduce((sum, income) => {
    return sum + (income.monthly_equivalent_amount || 0);
  }, 0);

  const annualIncome = monthlyIncome * 12;

  // Prepare data for category distribution chart
  const categoryDistributionData = React.useMemo(() => {
    if (!incomes || incomes.length === 0) return [];
    
    // Group incomes by category
    const categoryMap = new Map<string, number>();
    
    incomes.forEach(income => {
      const categoryName = income.category?.name || "Uncategorized";
      const monthlyAmount = income.monthly_equivalent_amount || 0;
      
      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName)! + monthlyAmount);
      } else {
        categoryMap.set(categoryName, monthlyAmount);
      }
    });
    
    // Convert to array format for chart
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [incomes]);
  
  // Prepare data for recurrence distribution chart
  const recurrenceDistributionData = React.useMemo(() => {
    if (!incomes || incomes.length === 0) return [];
    
    // Group incomes by recurrence
    const recurrenceMap = new Map<string, number>();
    
    incomes.forEach(income => {
      const recurrence = income.recurrence;
      const monthlyAmount = income.monthly_equivalent_amount || 0;
      
      if (recurrenceMap.has(recurrence)) {
        recurrenceMap.set(recurrence, recurrenceMap.get(recurrence)! + monthlyAmount);
      } else {
        recurrenceMap.set(recurrence, monthlyAmount);
      }
    });
    
    // Convert to array format for chart
    return Array.from(recurrenceMap.entries())
      .map(([recurrence, amount]) => {
        // Format the recurrence name for display
        let name = recurrence;
        switch (recurrence) {
          case "none": name = "One-Time"; break;
          case "bi_weekly": name = "Bi-Weekly"; break;
          case "semi_annual": name = "Semi-Annual"; break;
          default: name = recurrence.charAt(0).toUpperCase() + recurrence.slice(1);
        }
        
        return {
          name,
          value: amount,
        };
      });
  }, [incomes]);
  
  // Prepare data for frequency distribution analysis
  const frequencyDistributionData = React.useMemo(() => {
    if (!incomes || incomes.length === 0) return [];
    
    // Group incomes by frequency/recurrence
    const frequencyMap = new Map<string, number>();
    
    incomes.forEach(income => {
      let frequency = "";
      switch (income.recurrence) {
        case "weekly": frequency = "Weekly"; break;
        case "bi_weekly": frequency = "Every 2 Weeks"; break;
        case "monthly": frequency = "Monthly"; break;
        case "quarterly": frequency = "Quarterly"; break;
        case "semi_annual": frequency = "Bi-Annually"; break;
        case "annual": frequency = "Yearly"; break;
        default: frequency = "One-Time";
      }
      
      const monthlyAmount = income.monthly_equivalent_amount || 0;
      
      if (frequencyMap.has(frequency)) {
        frequencyMap.set(frequency, frequencyMap.get(frequency)! + monthlyAmount);
      } else {
        frequencyMap.set(frequency, monthlyAmount);
      }
    });
    
    // Convert to array format for chart and sort by frequency
    const frequencyOrder = {
      "Weekly": 1,
      "Every 2 Weeks": 2,
      "Monthly": 3,
      "Quarterly": 4,
      "Bi-Annually": 5,
      "Yearly": 6,
      "One-Time": 7
    };
    
    return Array.from(frequencyMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => frequencyOrder[a.name as keyof typeof frequencyOrder] - frequencyOrder[b.name as keyof typeof frequencyOrder]);
  }, [incomes]);

  // Prepare data for income stability chart (recurring vs one-time)
  const stabilityData = React.useMemo(() => {
    if (!incomes || incomes.length === 0) return [];
    
    let recurring = 0;
    let oneTime = 0;
    
    incomes.forEach((income) => {
      if (income.recurrence === "none") {
        oneTime += (income.monthly_equivalent_amount || 0);
      } else {
        recurring += (income.monthly_equivalent_amount || 0);
      }
    });
    
    return [
      { name: "Recurring", value: recurring },
      { name: "One-Time", value: oneTime }
    ];
  }, [incomes]);

  // Prepare data for income by source bar chart
  const incomeBySourceData = React.useMemo(() => {
    if (!incomes || incomes.length === 0) return [];
    
    return incomes.map(income => ({
      name: income.source_name,
      monthly: income.monthly_equivalent_amount || 0,
      category: income.category?.name || "Uncategorized"
    })).sort((a, b) => b.monthly - a.monthly).slice(0, 10); // Top 10 sources
  }, [incomes]);

  // Prepare data for monthly trend (simulated data since we don't have historical data)
  const monthlyTrendData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    
    return months.map((month, index) => {
      // Create a simulated trend based on current income
      // This is just for visualization purposes
      let multiplier = 1;
      
      // Add some variation based on month
      if (index < currentMonth) {
        // Past months (slight variations)
        multiplier = 0.85 + (Math.random() * 0.3);
      } else if (index === currentMonth) {
        // Current month (actual data)
        multiplier = 1;
      } else {
        // Future months (projected with growth)
        const monthsAhead = index - currentMonth;
        multiplier = 1 + (monthsAhead * 0.02) + (Math.random() * 0.05);
      }
      
      return {
        name: month,
        income: Math.round(monthlyIncome * multiplier),
      };
    });
  }, [monthlyIncome]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Income Analytics</h2>
      <p className="text-muted-foreground mb-6">
        Analyze your income sources, trends, and diversification metrics.
      </p>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="diversification">Diversification</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-primary" />
                  Monthly Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</div>
                <p className="text-xs text-muted-foreground">
                  From {incomes.length} income source{incomes.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  Annual Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(annualIncome)}</div>
                <p className="text-xs text-muted-foreground">Projected yearly total</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                  Average Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {incomes.length > 0 ? formatCurrency(monthlyIncome / incomes.length) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">Average monthly per source</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income by Category</CardTitle>
                <CardDescription>Distribution across different categories</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {categoryDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Income by Frequency</CardTitle>
                <CardDescription>How your income is distributed by payment frequency</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {frequencyDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={frequencyDistributionData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="value" fill="#8884d8">
                        {frequencyDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No frequency data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Income Diversification Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                Income Diversification
              </CardTitle>
              <CardDescription>
                How well your income is diversified across different sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiversificationScore />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Income Sources</CardTitle>
              <CardDescription>Your highest contributing income sources</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {incomeBySourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incomeBySourceData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      labelFormatter={(label) => `Source: ${label}`}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background p-2 border rounded-md shadow-sm">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">Category: {data.category}</p>
                              <p className="text-sm font-semibold">
                                Monthly: {formatCurrency(data.monthly)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="monthly" fill="#8884d8">
                      {incomeBySourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No source data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Income Stability</CardTitle>
              <CardDescription>Recurring vs One-time income sources</CardDescription>
            </CardHeader>
            <CardContent>
              {stabilityData.length > 0 && stabilityData[0].value + stabilityData[1].value > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={stabilityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#4CAF50" />
                        <Cell fill="#FF9800" />
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="flex flex-col justify-center space-y-4">
                    <div>
                      <h4 className="text-sm font-medium flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#4CAF50] mr-2"></div>
                        Recurring Income
                      </h4>
                      <p className="text-2xl font-bold">{formatCurrency(stabilityData[0].value)}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((stabilityData[0].value / (stabilityData[0].value + stabilityData[1].value)) * 100)}% of monthly income
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#FF9800] mr-2"></div>
                        One-Time Income
                      </h4>
                      <p className="text-2xl font-bold">{formatCurrency(stabilityData[1].value)}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((stabilityData[1].value / (stabilityData[0].value + stabilityData[1].value)) * 100)}% of monthly income
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-muted-foreground">No stability data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Income Trend</CardTitle>
              <CardDescription>Income projection based on current sources</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyTrendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name="Monthly Income"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Diversification Tab */}
        <TabsContent value="diversification" className="space-y-6">
          <Card className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                Income Diversification
              </CardTitle>
              <CardDescription>
                How well your income is diversified across different sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiversificationScore />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Income distribution across categories</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {categoryDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No category data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
