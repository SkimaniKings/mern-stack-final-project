import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DebtService } from '@/lib/debt/debt-service';
import { Debt, PaymentScheduleItem } from '@/types/debt';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUpIcon, BarChartIcon, PieChartIcon, InfoIcon } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Sector, 
  Cell as PieCell
} from 'recharts';

const InterestPrincipalWaterfall: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDebtId, setSelectedDebtId] = useState<string>('');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'quarterly'>('monthly');

  const debtService = new DebtService();

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        setDebts(fetchedDebts);
        
        if (fetchedDebts.length > 0) {
          setSelectedDebtId(fetchedDebts[0].id);
          await fetchPaymentSchedule(fetchedDebts[0].id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching debts:', error);
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  const fetchPaymentSchedule = async (debtId: string) => {
    try {
      // In a real implementation, this would call a backend API
      // For now, we'll generate mock data based on the selected debt
      const selectedDebt = debts.find(debt => debt.id === debtId);
      
      if (!selectedDebt) return;
      
      const balance = selectedDebt.current_balance;
      const interestRate = selectedDebt.interest_rate / 100 / 12; // Monthly interest rate
      const payment = selectedDebt.minimum_payment;
      
      let remainingBalance = balance;
      const schedule: PaymentScheduleItem[] = [];
      let month = 1;
      const currentDate = new Date();
      
      while (remainingBalance > 0 && month <= 360) { // Cap at 30 years
        const interestPayment = remainingBalance * interestRate;
        const principalPayment = Math.min(payment - interestPayment, remainingBalance);
        remainingBalance -= principalPayment;
        
        const paymentDate = new Date(currentDate);
        paymentDate.setMonth(currentDate.getMonth() + month);
        
        schedule.push({
          month,
          date: paymentDate.toISOString().split('T')[0],
          payment,
          principal: principalPayment,
          interest: interestPayment,
          remaining_balance: remainingBalance
        });
        
        month++;
      }
      
      setPaymentSchedule(schedule);
    } catch (error) {
      console.error('Error fetching payment schedule:', error);
    }
  };

  const handleDebtChange = async (debtId: string) => {
    setSelectedDebtId(debtId);
    await fetchPaymentSchedule(debtId);
  };

  const handleViewModeChange = (mode: 'monthly' | 'yearly' | 'quarterly') => {
    setViewMode(mode);
  };

  const getAggregatedData = () => {
    if (!paymentSchedule.length) return [];
    
    if (viewMode === 'monthly') {
      // For monthly view, show first 12 months
      return paymentSchedule.slice(0, 12).map((item, index) => ({
        name: `Month ${item.month}`,
        principal: item.principal,
        interest: item.interest,
        total: item.payment,
        month: item.month,
        remaining: item.remaining_balance
      }));
    } else if (viewMode === 'quarterly') {
      // For quarterly view, aggregate by quarters
      const quarterlyData = [];
      for (let i = 0; i < Math.min(paymentSchedule.length, 24); i += 3) {
        const quarterMonths = paymentSchedule.slice(i, i + 3);
        const quarterNumber = Math.floor(i / 3) + 1;
        
        quarterlyData.push({
          name: `Q${quarterNumber}`,
          principal: quarterMonths.reduce((sum, item) => sum + item.principal, 0),
          interest: quarterMonths.reduce((sum, item) => sum + item.interest, 0),
          total: quarterMonths.reduce((sum, item) => sum + item.payment, 0),
          month: quarterMonths[quarterMonths.length - 1].month,
          remaining: quarterMonths[quarterMonths.length - 1].remaining_balance
        });
      }
      return quarterlyData;
    } else {
      // For yearly view, aggregate by years
      const yearlyData = [];
      for (let i = 0; i < Math.min(paymentSchedule.length, 60); i += 12) {
        const yearMonths = paymentSchedule.slice(i, i + 12);
        const yearNumber = Math.floor(i / 12) + 1;
        
        yearlyData.push({
          name: `Year ${yearNumber}`,
          principal: yearMonths.reduce((sum, item) => sum + item.principal, 0),
          interest: yearMonths.reduce((sum, item) => sum + item.interest, 0),
          total: yearMonths.reduce((sum, item) => sum + item.payment, 0),
          month: yearMonths[yearMonths.length - 1].month,
          remaining: yearMonths[yearMonths.length - 1].remaining_balance
        });
      }
      return yearlyData;
    }
  };

  const getPieData = () => {
    if (!paymentSchedule.length) return [];
    
    const totalPrincipal = paymentSchedule.reduce((sum, item) => sum + item.principal, 0);
    const totalInterest = paymentSchedule.reduce((sum, item) => sum + item.interest, 0);
    
    return [
      { name: 'Principal', value: totalPrincipal },
      { name: 'Interest', value: totalInterest }
    ];
  };

  const getPaymentBreakdown = () => {
    if (!paymentSchedule.length) return { principal: 0, interest: 0, total: 0 };
    
    const totalPrincipal = paymentSchedule.reduce((sum, item) => sum + item.principal, 0);
    const totalInterest = paymentSchedule.reduce((sum, item) => sum + item.interest, 0);
    const totalPayment = totalPrincipal + totalInterest;
    
    return {
      principal: totalPrincipal,
      interest: totalInterest,
      total: totalPayment,
      interestPercentage: (totalInterest / totalPayment) * 100
    };
  };

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  const COLORS = ['#0088FE', '#FF8042'];

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
  
    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${formatCurrency(value)}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
  };

  const selectedDebt = debts.find(debt => debt.id === selectedDebtId);
  const breakdown = getPaymentBreakdown();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChartIcon className="h-5 w-5 text-primary" />
          Interest vs. Principal Waterfall
        </CardTitle>
        <CardDescription>
          Visualize how your payments are distributed between interest and principal over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="w-full md:w-1/2">
              <label className="text-sm font-medium mb-2 block">Select Debt</label>
              <Select
                value={selectedDebtId}
                onValueChange={handleDebtChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a debt" />
                </SelectTrigger>
                <SelectContent>
                  {debts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} - {formatCurrency(debt.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/2">
              <label className="text-sm font-medium mb-2 block">View Mode</label>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-2 rounded-md text-sm flex-1 ${viewMode === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  onClick={() => handleViewModeChange('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-2 rounded-md text-sm flex-1 ${viewMode === 'quarterly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  onClick={() => handleViewModeChange('quarterly')}
                >
                  Quarterly
                </button>
                <button
                  className={`px-3 py-2 rounded-md text-sm flex-1 ${viewMode === 'yearly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  onClick={() => handleViewModeChange('yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>
          
          {selectedDebt && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Balance</h3>
                <p className="text-2xl font-bold">{formatCurrency(selectedDebt.current_balance)}</p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Interest Rate</h3>
                <p className="text-2xl font-bold">{selectedDebt.interest_rate}%</p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Monthly Payment</h3>
                <p className="text-2xl font-bold">{formatCurrency(selectedDebt.minimum_payment)}</p>
              </div>
            </div>
          )}
          
          <Tabs defaultValue="waterfall" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="waterfall">Waterfall Chart</TabsTrigger>
              <TabsTrigger value="breakdown">Payment Breakdown</TabsTrigger>
            </TabsList>
            
            <TabsContent value="waterfall" className="space-y-4">
              <div className="h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getAggregatedData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    stackOffset="sign"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatTooltipValue} />
                    <Tooltip 
                      formatter={formatTooltipValue}
                      labelFormatter={(name) => `${name}`}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="principal" name="Principal" stackId="a" fill="#0088FE" />
                    <Bar dataKey="interest" name="Interest" stackId="a" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                  Understanding the Waterfall Chart
                </h3>
                <p className="text-sm text-muted-foreground">
                  This chart shows how your monthly payments are split between principal and interest over time. 
                  As your balance decreases, more of your payment goes toward principal and less toward interest.
                </p>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#0088FE]"></div>
                    <span className="text-sm">Principal: Reduces your loan balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF8042]"></div>
                    <span className="text-sm">Interest: Cost of borrowing the money</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          activeIndex={activeIndex}
                          activeShape={renderActiveShape}
                          data={getPieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          onMouseEnter={onPieEnter}
                        >
                          {getPieData().map((entry, index) => (
                            <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-medium mb-4">Total Payment Breakdown</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Principal</span>
                        <span className="font-medium">{formatCurrency(breakdown.principal)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${100 - breakdown.interestPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Interest</span>
                        <span className="font-medium">{formatCurrency(breakdown.interest)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-orange-500 h-2.5 rounded-full" 
                          style={{ width: `${breakdown.interestPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="font-medium">Total Payment</span>
                        <span className="font-bold">{formatCurrency(breakdown.total)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg mt-2">
                      <h4 className="text-sm font-medium flex items-center gap-1">
                        <InfoIcon className="h-4 w-4" />
                        Interest Cost
                      </h4>
                      <p className="text-sm mt-1">
                        {breakdown.interestPercentage.toFixed(1)}% of your payments go toward interest.
                        {breakdown.interestPercentage > 40 ? (
                          <span className="block mt-1 text-amber-600">
                            Consider strategies to reduce your interest costs, such as refinancing or making extra payments.
                          </span>
                        ) : (
                          <span className="block mt-1 text-green-600">
                            Your interest-to-payment ratio is good. Keep up the great work!
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterestPrincipalWaterfall;
