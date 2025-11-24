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
  LineChart,
  Line
} from 'recharts';
import { DebtService } from '@/lib/debt/debt-service';
import { Debt, DebtRepaymentStrategy, DebtRepaymentPlan } from '@/types/debt';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CompareIcon, TrendingDownIcon, CalendarIcon, DollarSignIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StrategyResult {
  strategy: DebtRepaymentStrategy;
  plans: DebtRepaymentPlan[];
  totalInterest: number;
  totalMonths: number;
  earliestPayoffDate: string;
  latestPayoffDate: string;
}

const RepaymentStrategyComparison: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [extraPayment, setExtraPayment] = useState<number>(100);
  const [results, setResults] = useState<{
    avalanche: StrategyResult | null;
    snowball: StrategyResult | null;
    hybrid: StrategyResult | null;
    custom: StrategyResult | null;
  }>({
    avalanche: null,
    snowball: null,
    hybrid: null,
    custom: null
  });

  const debtService = new DebtService();

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        setDebts(fetchedDebts);
        
        if (fetchedDebts.length > 0) {
          await calculateStrategies(fetchedDebts, extraPayment);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching debts:', error);
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  useEffect(() => {
    if (debts.length > 0) {
      calculateStrategies(debts, extraPayment);
    }
  }, [extraPayment, debts]);

  const calculateStrategies = async (debts: Debt[], extraAmount: number) => {
    try {
      // In a real implementation, these would be API calls
      // For now, we'll simulate the calculations
      
      // Avalanche strategy (highest interest rate first)
      const avalancheDebts = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
      const avalancheResult = await simulateStrategy(avalancheDebts, extraAmount, 'avalanche');
      
      // Snowball strategy (lowest balance first)
      const snowballDebts = [...debts].sort((a, b) => a.current_balance - b.current_balance);
      const snowballResult = await simulateStrategy(snowballDebts, extraAmount, 'snowball');
      
      // Hybrid strategy (custom formula balancing interest rate and balance)
      const hybridDebts = [...debts].sort((a, b) => {
        const aScore = (a.interest_rate / 100) * Math.log10(a.current_balance);
        const bScore = (b.interest_rate / 100) * Math.log10(b.current_balance);
        return bScore - aScore;
      });
      const hybridResult = await simulateStrategy(hybridDebts, extraAmount, 'hybrid');
      
      setResults({
        avalanche: avalancheResult,
        snowball: snowballResult,
        hybrid: hybridResult,
        custom: null
      });
    } catch (error) {
      console.error('Error calculating strategies:', error);
    }
  };

  const simulateStrategy = async (
    orderedDebts: Debt[], 
    extraAmount: number,
    strategy: DebtRepaymentStrategy
  ): Promise<StrategyResult> => {
    // Create a deep copy to avoid modifying the original debts
    const workingDebts = orderedDebts.map(debt => ({...debt}));
    
    // Initialize plans array
    const plans: DebtRepaymentPlan[] = [];
    
    // Initialize variables to track overall statistics
    let totalInterest = 0;
    let maxMonths = 0;
    let earliestPayoff = new Date();
    earliestPayoff.setFullYear(earliestPayoff.getFullYear() + 30); // Set to a far future date
    let latestPayoff = new Date();
    
    // Distribute extra payment according to strategy
    let remainingExtra = extraAmount;
    let currentExtraIndex = 0;
    
    // Calculate payment schedules for each debt
    workingDebts.forEach((debt, index) => {
      const balance = debt.current_balance;
      const interestRate = debt.interest_rate / 100 / 12; // Monthly interest rate
      const minPayment = debt.minimum_payment;
      
      // Determine extra payment for this debt
      let debtExtraPayment = 0;
      if (index === currentExtraIndex) {
        debtExtraPayment = remainingExtra;
      }
      
      const totalPayment = minPayment + debtExtraPayment;
      
      // Calculate months to payoff
      let monthsToPayoff = 0;
      let totalInterestPaid = 0;
      let remainingBalance = balance;
      const paymentSchedule = [];
      
      while (remainingBalance > 0 && monthsToPayoff < 360) { // Cap at 30 years
        const interestPayment = remainingBalance * interestRate;
        const principalPayment = Math.min(totalPayment - interestPayment, remainingBalance);
        
        totalInterestPaid += interestPayment;
        remainingBalance -= principalPayment;
        
        const date = new Date();
        date.setMonth(date.getMonth() + monthsToPayoff + 1);
        
        paymentSchedule.push({
          month: monthsToPayoff + 1,
          date: date.toISOString().split('T')[0],
          payment: totalPayment,
          principal: principalPayment,
          interest: interestPayment,
          remaining_balance: remainingBalance,
          extra_payment: debtExtraPayment
        });
        
        monthsToPayoff++;
      }
      
      // Calculate payoff date
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);
      
      // Update overall statistics
      totalInterest += totalInterestPaid;
      maxMonths = Math.max(maxMonths, monthsToPayoff);
      
      if (payoffDate < earliestPayoff) {
        earliestPayoff = payoffDate;
      }
      
      if (payoffDate > latestPayoff) {
        latestPayoff = payoffDate;
      }
      
      // Create plan for this debt
      plans.push({
        debt_id: debt.id,
        debt_name: debt.name,
        total_balance: balance,
        interest_rate: debt.interest_rate,
        monthly_payment: totalPayment,
        payoff_date: payoffDate.toISOString().split('T')[0],
        total_interest_paid: totalInterestPaid,
        months_to_payoff: monthsToPayoff,
        payment_schedule: paymentSchedule,
        order_in_strategy: index + 1,
        extra_payment_allocation: debtExtraPayment
      });
      
      // If this debt is paid off, move the extra payment to the next debt
      if (monthsToPayoff < maxMonths) {
        currentExtraIndex = Math.min(currentExtraIndex + 1, workingDebts.length - 1);
      }
    });
    
    return {
      strategy,
      plans,
      totalInterest,
      totalMonths: maxMonths,
      earliestPayoffDate: earliestPayoff.toISOString().split('T')[0],
      latestPayoffDate: latestPayoff.toISOString().split('T')[0]
    };
  };

  const handleExtraPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setExtraPayment(value);
  };

  const getComparisonData = () => {
    if (!results.avalanche || !results.snowball || !results.hybrid) return [];
    
    return [
      {
        name: 'Avalanche',
        interest: results.avalanche.totalInterest,
        months: results.avalanche.totalMonths,
        description: 'Highest interest first'
      },
      {
        name: 'Snowball',
        interest: results.snowball.totalInterest,
        months: results.snowball.totalMonths,
        description: 'Lowest balance first'
      },
      {
        name: 'Hybrid',
        interest: results.hybrid.totalInterest,
        months: results.hybrid.totalMonths,
        description: 'Balanced approach'
      }
    ];
  };

  const getTimelineData = () => {
    if (!results.avalanche || !results.snowball || !results.hybrid) return [];
    
    // Create a timeline showing debt payoff over time
    const maxMonths = Math.max(
      results.avalanche.totalMonths,
      results.snowball.totalMonths,
      results.hybrid.totalMonths
    );
    
    const timelineData = [];
    
    for (let month = 0; month <= maxMonths; month += 3) { // Every quarter
      const avalancheDebtsRemaining = results.avalanche.plans.filter(plan => plan.months_to_payoff > month).length;
      const snowballDebtsRemaining = results.snowball.plans.filter(plan => plan.months_to_payoff > month).length;
      const hybridDebtsRemaining = results.hybrid.plans.filter(plan => plan.months_to_payoff > month).length;
      
      timelineData.push({
        month,
        avalanche: avalancheDebtsRemaining,
        snowball: snowballDebtsRemaining,
        hybrid: hybridDebtsRemaining
      });
    }
    
    return timelineData;
  };

  const getBestStrategy = () => {
    if (!results.avalanche || !results.snowball || !results.hybrid) return null;
    
    const strategies = [
      { name: 'Avalanche', result: results.avalanche },
      { name: 'Snowball', result: results.snowball },
      { name: 'Hybrid', result: results.hybrid }
    ];
    
    // Find strategy with lowest interest
    const lowestInterest = strategies.reduce((prev, current) => 
      prev.result.totalInterest < current.result.totalInterest ? prev : current
    );
    
    // Find strategy with shortest time
    const shortestTime = strategies.reduce((prev, current) => 
      prev.result.totalMonths < current.result.totalMonths ? prev : current
    );
    
    // Find strategy with earliest first payoff
    const earliestFirstPayoff = strategies.reduce((prev, current) => 
      new Date(prev.result.earliestPayoffDate) < new Date(current.result.earliestPayoffDate) ? prev : current
    );
    
    return {
      lowestInterest,
      shortestTime,
      earliestFirstPayoff,
      recommendation: lowestInterest.name // Default to lowest interest as recommendation
    };
  };

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  const formatMonthValue = (value: number) => {
    return `${value} mo`;
  };

  const best = getBestStrategy();

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
          <CompareIcon className="h-5 w-5 text-primary" />
          Repayment Strategy Comparison
        </CardTitle>
        <CardDescription>
          Compare different debt repayment strategies to find the optimal approach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <Label htmlFor="extra-payment" className="text-base font-medium">
                  Extra Monthly Payment: ${extraPayment}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Adjust your additional monthly payment to see how it affects each strategy
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Input
                id="extra-payment"
                type="number"
                min="0"
                max="2000"
                step="25"
                value={extraPayment}
                onChange={handleExtraPaymentChange}
                className="w-32"
              />
              
              <div className="flex gap-2">
                {[100, 250, 500].map((amount) => (
                  <button
                    key={amount}
                    className={`px-3 py-1 rounded-md text-sm ${
                      extraPayment === amount ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                    onClick={() => setExtraPayment(amount)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="comparison">Strategy Comparison</TabsTrigger>
              <TabsTrigger value="timeline">Debt Freedom Timeline</TabsTrigger>
              <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['avalanche', 'snowball', 'hybrid'].map((strategy) => {
                  const result = results[strategy as keyof typeof results];
                  if (!result) return null;
                  
                  return (
                    <Card key={strategy} className="overflow-hidden">
                      <div className={`h-2 ${
                        strategy === 'avalanche' ? 'bg-blue-500' : 
                        strategy === 'snowball' ? 'bg-green-500' : 'bg-purple-500'
                      }`}></div>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-lg capitalize">{strategy}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {strategy === 'avalanche' ? 'Highest interest first' : 
                           strategy === 'snowball' ? 'Lowest balance first' : 'Balanced approach'}
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Interest:</span>
                              <span className="font-medium">{formatCurrency(result.totalInterest)}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Time to Debt Freedom:</span>
                              <span className="font-medium">{result.totalMonths} months</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">First Debt Payoff:</span>
                              <span className="font-medium">{new Date(result.earliestPayoffDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Last Debt Payoff:</span>
                              <span className="font-medium">{new Date(result.latestPayoffDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="h-[350px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatTooltipValue} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Bar dataKey="interest" name="Total Interest" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="h-[350px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatMonthValue} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(value) => [`${value} months`, 'Time to Debt Freedom']} />
                    <Legend />
                    <Bar dataKey="months" name="Months to Debt Freedom" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getTimelineData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      label={{ value: 'Months', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: 'Debts Remaining', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip 
                      labelFormatter={(month) => `Month ${month}`}
                    />
                    <Legend />
                    <Line 
                      type="stepAfter" 
                      dataKey="avalanche" 
                      name="Avalanche" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="snowball" 
                      name="Snowball" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="hybrid" 
                      name="Hybrid" 
                      stroke="#ffc658" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <h3 className="font-medium mb-2">Understanding the Timeline</h3>
                <p className="text-sm text-muted-foreground">
                  This chart shows how many debts remain over time with each strategy. 
                  The Snowball method typically pays off individual debts faster at first, 
                  while the Avalanche method often results in lower total interest.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendation" className="space-y-4">
              {best && (
                <div className="space-y-6">
                  <div className="bg-primary/10 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Recommended Strategy: {best.recommendation}</h3>
                    <p className="text-muted-foreground">
                      Based on your debt profile and extra payment amount, we recommend the {best.recommendation} strategy.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSignIcon className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium">Lowest Interest</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Strategy:</p>
                        <p className="font-bold">{best.lowestInterest.name}</p>
                        <p className="text-sm text-muted-foreground mt-3 mb-1">Total Interest:</p>
                        <p className="font-bold">{formatCurrency(best.lowestInterest.result.totalInterest)}</p>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium">Shortest Time</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Strategy:</p>
                        <p className="font-bold">{best.shortestTime.name}</p>
                        <p className="text-sm text-muted-foreground mt-3 mb-1">Total Months:</p>
                        <p className="font-bold">{best.shortestTime.result.totalMonths} months</p>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDownIcon className="h-5 w-5 text-purple-600" />
                          <h4 className="font-medium">Earliest Win</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Strategy:</p>
                        <p className="font-bold">{best.earliestFirstPayoff.name}</p>
                        <p className="text-sm text-muted-foreground mt-3 mb-1">First Debt Payoff:</p>
                        <p className="font-bold">{new Date(best.earliestFirstPayoff.result.earliestPayoffDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Strategy Strengths</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                          <h4 className="font-medium text-blue-600">Avalanche</h4>
                          <ul className="mt-2 space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">✓</span>
                              <span>Minimizes total interest paid</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">✓</span>
                              <span>Mathematically optimal approach</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">✓</span>
                              <span>Best for those focused on financial efficiency</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                          <h4 className="font-medium text-green-600">Snowball</h4>
                          <ul className="mt-2 space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">✓</span>
                              <span>Provides quick wins for motivation</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">✓</span>
                              <span>Reduces number of debts faster</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">✓</span>
                              <span>Best for those who need psychological momentum</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Personalized Advice</h3>
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <p className="text-sm mb-4">
                          Based on your debt profile, here's what you should consider:
                        </p>
                        
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>
                              <strong>If you're disciplined with finances:</strong> The Avalanche method will save you the most money over time.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>
                              <strong>If you need motivation:</strong> The Snowball method will give you quick wins to keep you going.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>
                              <strong>For a balanced approach:</strong> The Hybrid method offers a compromise between savings and psychological benefits.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>
                              <strong>Increasing your extra payment</strong> will significantly reduce your debt-free timeline regardless of which strategy you choose.
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepaymentStrategyComparison;
