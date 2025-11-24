'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Subscription } from '@/types/subscription';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#0790A2', '#07A213', '#FF6B6B'];

interface SubscriptionAnalyticsProps {
  subscriptions?: Subscription[];
}

export function SubscriptionAnalytics({ subscriptions = [] }: SubscriptionAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [localSubscriptions, setLocalSubscriptions] = useState<Subscription[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [frequencyData, setFrequencyData] = useState<any[]>([]);
  const [monthlySpendData, setMonthlySpendData] = useState<any[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [totalAnnual, setTotalAnnual] = useState(0);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        
        // If subscriptions are provided as props, use them
        if (subscriptions && subscriptions.length > 0) {
          processSubscriptionData(subscriptions);
        } else {
          // Otherwise fetch from API - no need to set client-id header
          // The server will prioritize the authenticated user ID from the session
          // or fall back to client-id from cookies if needed
          const response = await fetch('/api/subscriptions');
          
          if (!response.ok) {
            throw new Error('Failed to fetch subscriptions');
          }
          
          const data = await response.json();
          processSubscriptionData(data);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, [subscriptions]);
  
  const processSubscriptionData = (data: Subscription[]) => {
    setLocalSubscriptions(data);
    
    // Process category data
    const categoryMap = new Map<string, number>();
    
    // Process frequency data
    const frequencyMap = new Map<string, number>();
    
    let totalMonthlyAmount = 0;
    let totalAnnualAmount = 0;
    
    data.forEach(sub => {
      // Skip inactive subscriptions
      // Handle both is_active boolean and status string for backwards compatibility
      if (sub.is_active === false || sub.status === 'cancelled' || sub.status === 'inactive') {
        return;
      }
      
      // Process category
      const category = sub.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      
      // Process frequency and calculate monthly/annual costs
      const frequency = sub.frequency || sub.recurrence || 'monthly';
      frequencyMap.set(frequency, (frequencyMap.get(frequency) || 0) + 1);
      
      // Calculate monthly amount
      let monthlyAmount = sub.amount;
      switch (frequency) {
        case 'weekly':
          monthlyAmount = sub.amount * 4.33; // Average weeks in a month
          break;
        case 'bi_weekly':
          monthlyAmount = sub.amount * 2.17; // Average bi-weeks in a month
          break;
        case 'quarterly':
          monthlyAmount = sub.amount / 3;
          break;
        case 'semi_annual':
          monthlyAmount = sub.amount / 6;
          break;
        case 'annual':
          monthlyAmount = sub.amount / 12;
          break;
      }
      
      totalMonthlyAmount += monthlyAmount;
      
      // Calculate annual amount
      let annualAmount = sub.amount;
      switch (frequency) {
        case 'weekly':
          annualAmount = sub.amount * 52;
          break;
        case 'bi_weekly':
          annualAmount = sub.amount * 26;
          break;
        case 'monthly':
          annualAmount = sub.amount * 12;
          break;
        case 'quarterly':
          annualAmount = sub.amount * 4;
          break;
        case 'semi_annual':
          annualAmount = sub.amount * 2;
          break;
      }
      
      totalAnnualAmount += annualAmount;
    });
    
    // Convert Maps to arrays for charts
    const categoryChartData = Array.from(categoryMap).map(([name, value]) => ({ name, value }));
    const frequencyChartData = Array.from(frequencyMap).map(([name, value]) => ({ name: formatFrequency(name), value }));
    
    // Create monthly spend data by category
    const categorySpendMap = new Map<string, number>();
    
    data.forEach(sub => {
      // Handle both is_active boolean and status string for backwards compatibility
      if (sub.is_active === false || sub.status === 'cancelled' || sub.status === 'inactive') {
        return;
      }
      
      const category = sub.category || 'Uncategorized';
      const frequency = sub.frequency || sub.recurrence || 'monthly';
      
      // Calculate monthly amount
      let monthlyAmount = sub.amount;
      switch (frequency) {
        case 'weekly':
          monthlyAmount = sub.amount * 4.33;
          break;
        case 'bi_weekly':
          monthlyAmount = sub.amount * 2.17;
          break;
        case 'quarterly':
          monthlyAmount = sub.amount / 3;
          break;
        case 'semi_annual':
          monthlyAmount = sub.amount / 6;
          break;
        case 'annual':
          monthlyAmount = sub.amount / 12;
          break;
      }
      
      categorySpendMap.set(category, (categorySpendMap.get(category) || 0) + monthlyAmount);
    });
    
    const monthlySpendChartData = Array.from(categorySpendMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    setCategoryData(categoryChartData);
    setFrequencyData(frequencyChartData);
    setMonthlySpendData(monthlySpendChartData);
    setTotalMonthly(totalMonthlyAmount);
    setTotalAnnual(totalAnnualAmount);
  };
  
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'semi_annual': return 'Semi-Annual';
      case 'annual': return 'Annual';
      default: return frequency;
    }
  };
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    ) : null;
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Analytics</CardTitle>
          <CardDescription>Loading your subscription data...</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (localSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Analytics</CardTitle>
          <CardDescription>No subscription data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Add subscriptions to see analytics and insights
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Analytics</CardTitle>
        <CardDescription>
          Analyzing {localSubscriptions.filter(s => s.is_active !== false && s.status !== 'cancelled').length} active subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="spending">Spending</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Monthly Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(totalMonthly)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Annual Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(totalAnnual)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} subscriptions`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} subscriptions`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="spending" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySpendData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Monthly Cost']} />
                <Legend />
                <Bar dataKey="value" fill="#0790A2" name="Monthly Cost" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Based on {localSubscriptions.length} total subscriptions
      </CardFooter>
    </Card>
  );
}
