import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DebtService } from '@/lib/debt/debt-service';
import { Debt, DebtPayoffProjection } from '@/types/debt';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TrendingDownIcon, TrendingUpIcon, CheckCircleIcon } from 'lucide-react';

const DebtFreedomTimeline: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [extraPayment, setExtraPayment] = useState<number>(100);
  const [projections, setProjections] = useState<{
    baseline: DebtPayoffProjection | null;
    withExtra: DebtPayoffProjection | null;
  }>({ baseline: null, withExtra: null });
  const [paymentScenarios, setPaymentScenarios] = useState<Array<{
    name: string;
    amount: number;
    projection: DebtPayoffProjection | null;
  }>>([
    { name: 'Baseline', amount: 0, projection: null },
    { name: 'Modest Increase', amount: 100, projection: null },
    { name: 'Aggressive', amount: 250, projection: null },
    { name: 'Maximum Effort', amount: 500, projection: null },
  ]);
  const [selectedScenario, setSelectedScenario] = useState<string>('Modest Increase');
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [showCustom, setShowCustom] = useState<boolean>(false);

  const debtService = new DebtService();

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        setDebts(fetchedDebts);
        
        // Calculate baseline projection
        const baselineProjection = await calculateProjection(0);
        
        // Calculate scenarios
        const updatedScenarios = await Promise.all(
          paymentScenarios.map(async (scenario) => {
            const projection = await calculateProjection(scenario.amount);
            return { ...scenario, projection };
          })
        );
        
        setPaymentScenarios(updatedScenarios);
        setProjections({
          baseline: baselineProjection,
          withExtra: updatedScenarios[1].projection, // Modest increase by default
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching debts:', error);
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  const calculateProjection = async (extraAmount: number): Promise<DebtPayoffProjection | null> => {
    try {
      // Mock calculation for now - in real implementation this would call a backend API
      const totalDebt = debts.reduce((sum, debt) => sum + debt.current_balance, 0);
      const avgInterestRate = debts.reduce((sum, debt) => sum + debt.interest_rate, 0) / debts.length || 0;
      const totalMinPayment = debts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
      
      // Simple calculation for demonstration
      const totalMonthlyPayment = totalMinPayment + extraAmount;
      const monthlyInterestRate = avgInterestRate / 100 / 12;
      
      // Calculate months to payoff using the formula for a loan with fixed payment
      // This is a simplified calculation
      let monthsToPayoff = 0;
      if (monthlyInterestRate > 0) {
        monthsToPayoff = Math.ceil(
          Math.log(totalMonthlyPayment / (totalMonthlyPayment - totalDebt * monthlyInterestRate)) / 
          Math.log(1 + monthlyInterestRate)
        );
      } else {
        monthsToPayoff = Math.ceil(totalDebt / totalMonthlyPayment);
      }
      
      // Ensure months is a valid number
      monthsToPayoff = isNaN(monthsToPayoff) || monthsToPayoff === Infinity ? 240 : monthsToPayoff;
      monthsToPayoff = Math.min(monthsToPayoff, 360); // Cap at 30 years
      
      // Calculate total interest
      const totalInterest = (totalMonthlyPayment * monthsToPayoff) - totalDebt;
      
      // Calculate payoff date
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);
      
      // Generate payment schedule
      const schedule = [];
      let remainingBalance = totalDebt;
      let currentDate = new Date();
      
      for (let month = 1; month <= monthsToPayoff && remainingBalance > 0; month++) {
        const interestPayment = remainingBalance * monthlyInterestRate;
        const principalPayment = Math.min(totalMonthlyPayment - interestPayment, remainingBalance);
        remainingBalance -= principalPayment;
        
        currentDate.setMonth(currentDate.getMonth() + 1);
        
        schedule.push({
          month,
          date: currentDate.toISOString().split('T')[0],
          payment: totalMonthlyPayment,
          principal: principalPayment,
          interest: interestPayment,
          remaining_balance: remainingBalance,
          extra_payment: extraAmount
        });
      }
      
      return {
        months_to_payoff: monthsToPayoff,
        total_interest_paid: totalInterest,
        monthly_payment: totalMonthlyPayment,
        payoff_date: payoffDate.toISOString().split('T')[0],
        payment_schedule: schedule,
        debt_free_date: payoffDate.toISOString().split('T')[0],
        total_payment: totalMonthlyPayment * monthsToPayoff,
        interest_saved_with_extra_payments: extraAmount > 0 ? totalInterest * 0.2 : 0, // Simplified calculation
        time_saved_with_extra_payments: extraAmount > 0 ? Math.floor(monthsToPayoff * 0.15) : 0 // Simplified calculation
      };
    } catch (error) {
      console.error('Error calculating projection:', error);
      return null;
    }
  };

  const handleExtraPaymentChange = async (value: number[]) => {
    const amount = value[0];
    setExtraPayment(amount);
    setCustomAmount(amount);
    
    // Calculate new projection with the extra payment
    const newProjection = await calculateProjection(amount);
    
    setProjections({
      ...projections,
      withExtra: newProjection
    });
    
    // Add or update custom scenario
    if (showCustom) {
      const updatedScenarios = paymentScenarios.map(scenario => 
        scenario.name === 'Custom' 
          ? { ...scenario, amount, projection: newProjection }
          : scenario
      );
      setPaymentScenarios(updatedScenarios);
    }
  };

  const handleScenarioChange = (scenarioName: string) => {
    setSelectedScenario(scenarioName);
    
    const scenario = paymentScenarios.find(s => s.name === scenarioName);
    if (scenario) {
      setExtraPayment(scenario.amount);
      setProjections({
        ...projections,
        withExtra: scenario.projection
      });
    }
  };

  const addCustomScenario = async () => {
    if (!showCustom) {
      const customProjection = await calculateProjection(customAmount);
      const newScenario = { 
        name: 'Custom', 
        amount: customAmount, 
        projection: customProjection 
      };
      
      setPaymentScenarios([...paymentScenarios, newScenario]);
      setShowCustom(true);
      setSelectedScenario('Custom');
      setExtraPayment(customAmount);
      
      setProjections({
        ...projections,
        withExtra: customProjection
      });
    }
  };

  const generateTimelineData = () => {
    if (!projections.baseline || !projections.withExtra) return [];
    
    const baselineSchedule = projections.baseline.payment_schedule;
    const extraSchedule = projections.withExtra.payment_schedule;
    
    // Create data points for every 3 months to keep chart readable
    const dataPoints = [];
    const interval = 3;
    
    for (let i = 0; i < Math.max(baselineSchedule.length, extraSchedule.length); i += interval) {
      const baselinePoint = baselineSchedule[i] || baselineSchedule[baselineSchedule.length - 1];
      const extraPoint = extraSchedule[i] || (i < extraSchedule.length ? extraSchedule[extraSchedule.length - 1] : null);
      
      if (baselinePoint) {
        dataPoints.push({
          month: baselinePoint.month,
          date: baselinePoint.date,
          baselineBalance: Math.max(0, baselinePoint.remaining_balance),
          withExtraBalance: extraPoint ? Math.max(0, extraPoint.remaining_balance) : 0
        });
      }
    }
    
    return dataPoints;
  };

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  const calculateSavings = () => {
    if (!projections.baseline || !projections.withExtra) return { months: 0, interest: 0 };
    
    const monthsSaved = projections.baseline.months_to_payoff - projections.withExtra.months_to_payoff;
    const interestSaved = projections.baseline.total_interest_paid - projections.withExtra.total_interest_paid;
    
    return { months: monthsSaved, interest: interestSaved };
  };

  const savings = calculateSavings();

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
          <CalendarIcon className="h-5 w-5 text-primary" />
          Debt Freedom Timeline
        </CardTitle>
        <CardDescription>
          Visualize how different payment scenarios affect your debt-free date
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="timeline">Timeline Chart</TabsTrigger>
            <TabsTrigger value="scenarios">Payment Scenarios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Debt</h3>
                  <p className="text-2xl font-bold">{formatCurrency(debts.reduce((sum, debt) => sum + debt.current_balance, 0))}</p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Baseline Payoff Date</h3>
                  <p className="text-2xl font-bold">{projections.baseline ? formatDate(projections.baseline.payoff_date) : 'N/A'}</p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">New Payoff Date</h3>
                  <p className="text-2xl font-bold text-primary">{projections.withExtra ? formatDate(projections.withExtra.payoff_date) : 'N/A'}</p>
                </div>
              </div>
              
              <div className="h-[350px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={generateTimelineData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      label={{ value: 'Months', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      tickFormatter={formatTooltipValue} 
                      label={{ value: 'Remaining Balance', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip 
                      formatter={formatTooltipValue}
                      labelFormatter={(month) => `Month ${month}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="baselineBalance" 
                      name="Minimum Payments" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="withExtraBalance" 
                      name={`With Extra $${extraPayment}/mo`}
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <Label htmlFor="extra-payment" className="text-base font-medium">
                      Extra Monthly Payment: ${extraPayment}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Adjust the slider to see how extra payments affect your debt freedom date
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs py-1 px-2 bg-primary/10">
                      {savings.months > 0 ? (
                        <span className="flex items-center gap-1">
                          <TrendingDownIcon className="h-3 w-3" /> 
                          {savings.months} months faster
                        </span>
                      ) : 'No change'}
                    </Badge>
                    <Badge variant="outline" className="text-xs py-1 px-2 bg-primary/10">
                      {savings.interest > 0 ? (
                        <span className="flex items-center gap-1">
                          <TrendingDownIcon className="h-3 w-3" /> 
                          Save {formatCurrency(savings.interest)}
                        </span>
                      ) : 'No savings'}
                    </Badge>
                  </div>
                </div>
                
                <Slider
                  id="extra-payment"
                  defaultValue={[100]}
                  max={1000}
                  step={25}
                  value={[extraPayment]}
                  onValueChange={handleExtraPaymentChange}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$0</span>
                  <span>$250</span>
                  <span>$500</span>
                  <span>$750</span>
                  <span>$1,000</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="scenarios" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentScenarios.map((scenario) => (
                <Card 
                  key={scenario.name}
                  className={`cursor-pointer transition-all ${
                    selectedScenario === scenario.name 
                      ? 'border-primary ring-1 ring-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleScenarioChange(scenario.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{scenario.name}</h3>
                      <Badge variant={selectedScenario === scenario.name ? "default" : "outline"}>
                        +${scenario.amount}/mo
                      </Badge>
                    </div>
                    
                    {scenario.projection && (
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Debt-free date:</span>
                          <span className="font-medium">{formatDate(scenario.projection.payoff_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total interest:</span>
                          <span className="font-medium">{formatCurrency(scenario.projection.total_interest_paid)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Time to payoff:</span>
                          <span className="font-medium">{scenario.projection.months_to_payoff} months</span>
                        </div>
                        
                        {scenario.name !== 'Baseline' && projections.baseline && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Time saved:</span>
                              <span className="font-medium text-green-600">
                                {projections.baseline.months_to_payoff - scenario.projection.months_to_payoff} months
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Interest saved:</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(projections.baseline.total_interest_paid - scenario.projection.total_interest_paid)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {!showCustom && (
                <Card className="border-dashed border-2 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all" onClick={addCustomScenario}>
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                      <span className="text-xl">+</span>
                    </div>
                    <h3 className="font-medium">Add Custom Scenario</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a personalized payment plan
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {projections.baseline && projections.withExtra && selectedScenario !== 'Baseline' && (
              <div className="bg-muted/30 p-4 rounded-lg mt-6">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  Savings Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <h4 className="text-xs text-muted-foreground">Time Saved</h4>
                    <p className="text-xl font-bold text-green-600">
                      {projections.baseline.months_to_payoff - projections.withExtra.months_to_payoff} months
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <h4 className="text-xs text-muted-foreground">Interest Saved</h4>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(projections.baseline.total_interest_paid - projections.withExtra.total_interest_paid)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <h4 className="text-xs text-muted-foreground">New Debt-Free Date</h4>
                    <p className="text-xl font-bold text-green-600">
                      {formatDate(projections.withExtra.payoff_date)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DebtFreedomTimeline;
