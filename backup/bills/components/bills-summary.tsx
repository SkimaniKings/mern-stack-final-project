import { useMemo } from 'react';
import { Bill } from '@/types/bills';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BillsSummaryProps {
  bills: Bill[];
}

export default function BillsSummary({ bills }: BillsSummaryProps) {
  const categoryData = useMemo(() => {
    const categories = new Map<string, { name: string; value: number; color: string }>();
    
    // Define some colors for the chart
    const colors = [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF',
      '#FF6B6B', '#4BC0C0', '#9F7AEA', '#38B2AC', '#ED64A6'
    ];
    
    // Group bills by category
    bills.forEach(bill => {
      const categoryName = bill.category?.name || 'Uncategorized';
      const existingCategory = categories.get(categoryName);
      
      if (existingCategory) {
        existingCategory.value += bill.amount_due;
      } else {
        const colorIndex = categories.size % colors.length;
        categories.set(categoryName, {
          name: categoryName,
          value: bill.amount_due,
          color: colors[colorIndex]
        });
      }
    });
    
    return Array.from(categories.values());
  }, [bills]);

  const totalAmount = useMemo(() => {
    return bills.reduce((sum, bill) => sum + bill.amount_due, 0);
  }, [bills]);

  // Group bills by frequency
  const frequencyData = useMemo(() => {
    const frequencies = new Map<string, { name: string; value: number; color: string }>();
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF', '#FF6B6B', '#4BC0C0'];
    
    bills.forEach(bill => {
      const frequencyName = bill.frequency;
      const existingFrequency = frequencies.get(frequencyName);
      
      if (existingFrequency) {
        existingFrequency.value += bill.amount_due;
      } else {
        const colorIndex = frequencies.size % colors.length;
        frequencies.set(frequencyName, {
          name: getFrequencyLabel(frequencyName),
          value: bill.amount_due,
          color: colors[colorIndex]
        });
      }
    });
    
    return Array.from(frequencies.values());
  }, [bills]);

  function getFrequencyLabel(frequency: string): string {
    switch (frequency) {
      case 'once': return 'One-time';
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'semi_annual': return 'Semi-annual';
      case 'annual': return 'Annual';
      default: return frequency;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bills by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)} 
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Total Bills: {formatCurrency(totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bills by Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={frequencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {frequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)} 
                  labelFormatter={(label) => `Frequency: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Total Bills: {bills.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
