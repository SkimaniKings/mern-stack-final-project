'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Subscription, SubscriptionCategoryInfo } from '@/types/subscription';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithin } from 'date-fns';

interface SubscriptionAnalyticsProps {
  subscriptions: Subscription[];
  categories: SubscriptionCategoryInfo[];
}

export default function SubscriptionAnalytics({ subscriptions, categories }: SubscriptionAnalyticsProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<[number, number]>([0, 1000]);
  
  // Calculate max price for slider
  const maxPrice = useMemo(() => {
    return Math.max(...subscriptions.map(sub => sub.amount), 100);
  }, [subscriptions]);
  
  // Apply filters to subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(subscription => {
      // Status filter
      if (statusFilter !== 'all') {
        // Handle the three status types: active, paused, cancelled
        if (statusFilter === 'active' && subscription.status !== 'active') {
          return false;
        }
        if (statusFilter === 'paused' && subscription.status !== 'paused') {
          return false;
        }
        if (statusFilter === 'cancelled' && subscription.status !== 'cancelled') {
          return false;
        }
        // For backward compatibility with older data
        if (statusFilter === 'active' && subscription.status === undefined && subscription.is_active) {
          return true;
        }
        if ((statusFilter === 'paused' || statusFilter === 'cancelled') && 
            subscription.status === undefined && !subscription.is_active) {
          return false;
        }
      }
      
      // Category filter
      if (categoryFilter !== 'all' && subscription.category !== categoryFilter) {
        return false;
      }
      
      // Price range filter
      if (subscription.amount < priceRangeFilter[0] || subscription.amount > priceRangeFilter[1]) {
        return false;
      }
      
      return true;
    });
  }, [subscriptions, statusFilter, categoryFilter, priceRangeFilter]);
  
  // Calculate annual cost
  const calculateAnnualCost = (subscription: Subscription) => {
    const { amount, recurrence } = subscription;
    switch (recurrence) {
      case 'weekly': return amount * 52;
      case 'bi_weekly': return amount * 26;
      case 'monthly': return amount * 12;
      case 'quarterly': return amount * 4;
      case 'semi_annual': return amount * 2;
      case 'annual': return amount;
      case 'yearly': return amount;
      default: return amount;
    }
  };
  
  // Calculate total annual cost
  const totalAnnualCost = useMemo(() => {
    return filteredSubscriptions.reduce(
      (total, subscription) => total + calculateAnnualCost(subscription),
      0
    );
  }, [filteredSubscriptions]);
  
  // Calculate monthly cost
  const totalMonthlyCost = useMemo(() => {
    return totalAnnualCost / 12;
  }, [totalAnnualCost]);
  
  // Prepare data for category distribution chart
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredSubscriptions.forEach(subscription => {
      const category = subscription.category;
      const annualCost = calculateAnnualCost(subscription);
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category)! + annualCost);
      } else {
        categoryMap.set(category, annualCost);
      }
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredSubscriptions]);
  
  // Prepare data for monthly distribution chart
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyExpenses = Array(12).fill(0);
    
    filteredSubscriptions.forEach(subscription => {
      const { amount, recurrence } = subscription;
      
      switch (recurrence) {
        case 'monthly':
          // Add monthly amount to each month
          for (let i = 0; i < 12; i++) {
            monthlyExpenses[i] += amount;
          }
          break;
        case 'quarterly':
          // Add quarterly amount to every 3 months
          for (let i = 0; i < 12; i += 3) {
            monthlyExpenses[i] += amount;
          }
          break;
        case 'semi_annual':
          // Add semi-annual amount to every 6 months
          for (let i = 0; i < 12; i += 6) {
            monthlyExpenses[i] += amount;
          }
          break;
        case 'annual':
        case 'yearly':
          // Add annual amount to first month
          monthlyExpenses[0] += amount;
          break;
        case 'weekly':
          // Distribute weekly amount across all months
          const weeklyToMonthly = amount * 4.33;
          for (let i = 0; i < 12; i++) {
            monthlyExpenses[i] += weeklyToMonthly;
          }
          break;
        case 'bi_weekly':
          // Distribute bi-weekly amount across all months
          const biWeeklyToMonthly = amount * 2.17;
          for (let i = 0; i < 12; i++) {
            monthlyExpenses[i] += biWeeklyToMonthly;
          }
          break;
      }
    });
    
    return months.map((month, index) => ({
      name: month,
      amount: monthlyExpenses[index],
    }));
  }, [filteredSubscriptions]);
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
  
  // View filtered subscriptions
  const viewFilteredSubscriptions = () => {
    // Construct filter parameters
    const params = new URLSearchParams();
    
    if (statusFilter !== 'all') {
      params.append('status', statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      params.append('category', categoryFilter);
    }
    
    params.append('minPrice', priceRangeFilter[0].toString());
    params.append('maxPrice', priceRangeFilter[1].toString());
    
    // Navigate to filtered list
    router.push(`/subscriptions?${params.toString()}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Annual Cost</CardTitle>
            <CardDescription>Based on current subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalAnnualCost, 'USD')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Average</CardTitle>
            <CardDescription>Estimated monthly expense</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalMonthlyCost, 'USD')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Count by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Active:</span>
                <span className="font-medium">
                  {filteredSubscriptions.filter(sub => 
                    sub.status === 'active' || (sub.status === undefined && sub.is_active)
                  ).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Paused:</span>
                <span className="font-medium">
                  {filteredSubscriptions.filter(sub => sub.status === 'paused').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Cancelled:</span>
                <span className="font-medium">
                  {filteredSubscriptions.filter(sub => 
                    sub.status === 'cancelled' || (sub.status === undefined && !sub.is_active)
                  ).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Refine your subscription view</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Price Range: {formatCurrency(priceRangeFilter[0], 'USD')} - {formatCurrency(priceRangeFilter[1], 'USD')}
              </label>
              <Slider
                defaultValue={[0, maxPrice]}
                min={0}
                max={maxPrice}
                step={1}
                value={priceRangeFilter}
                onValueChange={setPriceRangeFilter}
              />
            </div>
            
            <Button onClick={viewFilteredSubscriptions} className="w-full mt-4">
              View Filtered Subscriptions
            </Button>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Annual cost by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number, 'USD')}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available with current filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expense Distribution</CardTitle>
          <CardDescription>Estimated expenses throughout the year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {monthlyData.some(item => item.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, 'USD', true)} />
                  <Tooltip formatter={(value) => formatCurrency(value as number, 'USD')} />
                  <Legend />
                  <Bar dataKey="amount" name="Monthly Expense" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available with current filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
