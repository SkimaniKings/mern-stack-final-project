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
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { DebtService } from '@/lib/debt/debt-service';
import { Debt, DebtToIncomeRatio } from '@/types/debt';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  PercentIcon, 
  TrendingDownIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  InfoIcon,
  BarChart3Icon
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const DebtToIncomeRatioTracker: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000);
  const [annualIncome, setAnnualIncome] = useState<number>(60000);
  const [ratio, setRatio] = useState<DebtToIncomeRatio | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{
    date: string;
    ratio: number;
    target: number;
  }>>([]);
  const [improvements, setImprovements] = useState<Array<{
    title: string;
    description: string;
    impact: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }>>([]);

  const debtService = new DebtService();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        setDebts(fetchedDebts);
        
        // In a real implementation, we would fetch historical data from an API
        // For now, we'll generate mock data
        generateMockHistoricalData();
        
        // Calculate current ratio
        calculateRatio(fetchedDebts, monthlyIncome);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (debts.length > 0) {
      calculateRatio(debts, monthlyIncome);
    }
  }, [monthlyIncome, debts]);

  const generateMockHistoricalData = () => {
    // Generate 12 months of historical data
    const data = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
      
      // Start with a higher ratio and gradually improve
      const baseRatio = 45 - (i * 0.8) + (Math.random() * 5 - 2.5);
      
      data.push({
        date: date.toISOString().split('T')[0],
        ratio: Math.max(20, baseRatio),
        target: 36 // Target ratio
      });
    }
    
    setHistoricalData(data);
  };

  const calculateRatio = (currentDebts: Debt[], income: number) => {
    // Calculate total monthly debt payments
    const totalMonthlyPayments = currentDebts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
    
    // Calculate DTI ratio (debt payments / income) * 100
    const dtiRatio = (totalMonthlyPayments / income) * 100;
    
    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'severe' = 'low';
    if (dtiRatio > 50) {
      riskLevel = 'severe';
    } else if (dtiRatio > 43) {
      riskLevel = 'high';
    } else if (dtiRatio > 36) {
      riskLevel = 'moderate';
    }
    
    // Generate improvement suggestions
    generateImprovementSuggestions(currentDebts, totalMonthlyPayments, income, dtiRatio, riskLevel);
    
    // Set the ratio object
    setRatio({
      ratio: dtiRatio,
      total_debt: currentDebts.reduce((sum, debt) => sum + debt.current_balance, 0),
      annual_income: income * 12,
      monthly_debt_payments: totalMonthlyPayments,
      monthly_income: income,
      risk_level: riskLevel,
      improvement_suggestions: [],
      target_ratio: 36 // Most lenders prefer a DTI ratio of 36% or less
    });
    
    // Update the historical data with the current ratio
    if (historicalData.length > 0) {
      const updatedData = [...historicalData];
      updatedData[updatedData.length - 1].ratio = dtiRatio;
      setHistoricalData(updatedData);
    }
  };

  const generateImprovementSuggestions = (
    currentDebts: Debt[], 
    totalMonthlyPayments: number, 
    income: number, 
    dtiRatio: number,
    riskLevel: 'low' | 'moderate' | 'high' | 'severe'
  ) => {
    const suggestions = [];
    
    // Only generate suggestions if the ratio is above the target
    if (dtiRatio <= 36) {
      suggestions.push({
        title: "You're on track!",
        description: "Your debt-to-income ratio is already within the recommended range. Keep up the good work!",
        impact: 0,
        difficulty: 'easy' as const
      });
    } else {
      // Calculate how much the monthly payments need to be reduced to reach target
      const targetMonthlyPayments = income * 0.36;
      const paymentReductionNeeded = totalMonthlyPayments - targetMonthlyPayments;
      
      // Suggestion 1: Increase income
      const incomeIncreaseNeeded = (paymentReductionNeeded / 0.36);
      suggestions.push({
        title: "Increase your income",
        description: `An additional ${formatCurrency(incomeIncreaseNeeded)} per month would bring your ratio to 36%. Consider asking for a raise, taking on a side job, or freelancing.`,
        impact: (incomeIncreaseNeeded / income) * 100 > 20 ? 3 : 2,
        difficulty: (incomeIncreaseNeeded / income) * 100 > 20 ? 'hard' : 'medium' as const
      });
      
      // Suggestion 2: Refinance high-interest debt
      const highInterestDebts = currentDebts.filter(debt => debt.interest_rate > 10);
      if (highInterestDebts.length > 0) {
        const totalHighInterestDebt = highInterestDebts.reduce((sum, debt) => sum + debt.current_balance, 0);
        const potentialSavings = highInterestDebts.reduce((sum, debt) => {
          // Estimate savings from refinancing to 8%
          const currentPayment = debt.minimum_payment;
          const refinancedPayment = calculateRefinancedPayment(debt.current_balance, 8, 60); // 5-year term at 8%
          return sum + (currentPayment - refinancedPayment);
        }, 0);
        
        suggestions.push({
          title: "Refinance high-interest debt",
          description: `Refinancing ${formatCurrency(totalHighInterestDebt)} of high-interest debt could save you approximately ${formatCurrency(potentialSavings)} per month, reducing your ratio by ${((potentialSavings / income) * 100).toFixed(1)}%.`,
          impact: potentialSavings > paymentReductionNeeded / 2 ? 3 : 2,
          difficulty: 'medium' as const
        });
      }
      
      // Suggestion 3: Consolidate multiple debts
      if (currentDebts.length > 2) {
        const smallDebts = currentDebts.filter(debt => debt.current_balance < 5000);
        if (smallDebts.length >= 2) {
          const totalSmallDebt = smallDebts.reduce((sum, debt) => sum + debt.current_balance, 0);
          const currentTotalPayment = smallDebts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
          const consolidatedPayment = calculateRefinancedPayment(totalSmallDebt, 9, 36); // 3-year term at 9%
          const potentialSavings = currentTotalPayment - consolidatedPayment;
          
          suggestions.push({
            title: "Consolidate smaller debts",
            description: `Consolidating ${smallDebts.length} smaller debts totaling ${formatCurrency(totalSmallDebt)} could save you approximately ${formatCurrency(potentialSavings)} per month, reducing your ratio by ${((potentialSavings / income) * 100).toFixed(1)}%.`,
            impact: potentialSavings > paymentReductionNeeded / 3 ? 2 : 1,
            difficulty: 'easy' as const
          });
        }
      }
      
      // Suggestion 4: Pay off smallest debt
      if (currentDebts.length > 0) {
        const smallestDebt = [...currentDebts].sort((a, b) => a.current_balance - b.current_balance)[0];
        suggestions.push({
          title: "Pay off your smallest debt",
          description: `Eliminating your ${smallestDebt.name} debt of ${formatCurrency(smallestDebt.current_balance)} would reduce your monthly payments by ${formatCurrency(smallestDebt.minimum_payment)}, improving your ratio by ${((smallestDebt.minimum_payment / income) * 100).toFixed(1)}%.`,
          impact: (smallestDebt.minimum_payment / paymentReductionNeeded) > 0.3 ? 2 : 1,
          difficulty: smallestDebt.current_balance < income ? 'easy' : 'medium' as const
        });
      }
      
      // Suggestion 5: Reduce expenses to pay down debt faster
      suggestions.push({
        title: "Reduce expenses to accelerate debt payoff",
        description: "Cutting non-essential expenses by 10% and applying those savings to debt repayment can significantly speed up your debt freedom timeline.",
        impact: 2,
        difficulty: 'medium' as const
      });
    }
    
    // Sort by impact (highest first) and then by difficulty (easiest first)
    suggestions.sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact;
      const difficultyOrder = { 'easy': 0, 'medium': 1, 'hard': 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
    
    setImprovements(suggestions);
  };

  const calculateRefinancedPayment = (balance: number, interestRate: number, termMonths: number): number => {
    const monthlyRate = interestRate / 100 / 12;
    if (monthlyRate === 0) return balance / termMonths;
    
    return balance * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  };

  const handleMonthlyIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setMonthlyIncome(value);
    setAnnualIncome(value * 12);
  };

  const handleAnnualIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setAnnualIncome(value);
    setMonthlyIncome(value / 12);
  };

  const getRiskLevelColor = (level: 'low' | 'moderate' | 'high' | 'severe') => {
    switch (level) {
      case 'low': return 'bg-green-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'severe': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDifficultyColor = (level: 'easy' | 'medium' | 'hard') => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getImpactStars = (impact: number) => {
    return '★'.repeat(impact) + '☆'.repeat(3 - impact);
  };

  const formatTooltipDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

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
          <PercentIcon className="h-5 w-5 text-primary" />
          Debt-to-Income Ratio Tracker
        </CardTitle>
        <CardDescription>
          Monitor your debt-to-income ratio and get personalized improvement suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Current Ratio</h3>
                {ratio && (
                  <Badge className={getRiskLevelColor(ratio.risk_level)}>
                    {ratio.risk_level.charAt(0).toUpperCase() + ratio.risk_level.slice(1)} Risk
                  </Badge>
                )}
              </div>
              
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold">
                  {ratio ? ratio.ratio.toFixed(1) : 0}%
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  of {formatCurrency(monthlyIncome)} monthly income
                </p>
              </div>
              
              <div className="mt-3">
                <Progress 
                  value={ratio ? ratio.ratio : 0} 
                  max={100}
                  className={`h-2 ${
                    ratio?.risk_level === 'low' ? 'bg-green-200' : 
                    ratio?.risk_level === 'moderate' ? 'bg-yellow-200' : 
                    ratio?.risk_level === 'high' ? 'bg-orange-200' : 'bg-red-200'
                  }`}
                />
                
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-green-600">Good (0-36%)</span>
                  <span className="text-yellow-600">Moderate (36-43%)</span>
                  <span className="text-red-600">High (43%+)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Income & Debt Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Monthly Debt Payments:</span>
                  <span className="font-medium">{formatCurrency(ratio?.monthly_debt_payments || 0)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Monthly Income:</span>
                  <span className="font-medium">{formatCurrency(monthlyIncome)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Total Debt Balance:</span>
                  <span className="font-medium">{formatCurrency(ratio?.total_debt || 0)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Annual Income:</span>
                  <span className="font-medium">{formatCurrency(annualIncome)}</span>
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Target Ratio:</span>
                  <span className="font-medium text-green-600">36.0%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="monthly-income" className="text-sm font-medium">
                  Monthly Income
                </Label>
                <Input
                  id="monthly-income"
                  type="number"
                  min="0"
                  step="100"
                  value={monthlyIncome}
                  onChange={handleMonthlyIncomeChange}
                  className="mt-1"
                />
              </div>
              
              <div className="flex-1">
                <Label htmlFor="annual-income" className="text-sm font-medium">
                  Annual Income
                </Label>
                <Input
                  id="annual-income"
                  type="number"
                  min="0"
                  step="1000"
                  value={annualIncome}
                  onChange={handleAnnualIncomeChange}
                  className="mt-1"
                />
              </div>
              
              <Button variant="outline" className="flex-shrink-0">
                Update Income
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="history">Historical Trend</TabsTrigger>
              <TabsTrigger value="improvements">Improvement Suggestions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="space-y-4">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historicalData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatTooltipDate}
                    />
                    <YAxis 
                      domain={[0, 60]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(1)}%`, 'DTI Ratio']}
                      labelFormatter={formatTooltipDate}
                    />
                    <Legend />
                    <ReferenceLine y={36} stroke="green" strokeDasharray="3 3" label="Target (36%)" />
                    <ReferenceLine y={43} stroke="orange" strokeDasharray="3 3" label="High Risk (43%)" />
                    <Line 
                      type="monotone" 
                      dataKey="ratio" 
                      name="DTI Ratio" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                  Understanding Your Debt-to-Income Ratio
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your debt-to-income (DTI) ratio is the percentage of your monthly income that goes toward debt payments. 
                  Lenders typically prefer a DTI ratio of 36% or less, with 43% being the maximum for many mortgage loans.
                </p>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-300">0-36%: Good</h4>
                    <p className="text-green-700 dark:text-green-400 mt-1">
                      You're managing debt well and likely to qualify for most loans.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-300">36-43%: Moderate Risk</h4>
                    <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                      You may qualify for loans but with less favorable terms.
                    </p>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                    <h4 className="font-medium text-red-800 dark:text-red-300">43%+: High Risk</h4>
                    <p className="text-red-700 dark:text-red-400 mt-1">
                      Loan approval may be difficult; focus on reducing debt.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="improvements" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personalized Improvement Suggestions</h3>
                
                {improvements.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {improvements.map((improvement, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-lg">{improvement.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {improvement.description}
                              </p>
                              
                              <div className="flex items-center gap-3 mt-3">
                                <Badge variant="outline" className={getDifficultyColor(improvement.difficulty)}>
                                  {improvement.difficulty.charAt(0).toUpperCase() + improvement.difficulty.slice(1)}
                                </Badge>
                                <span className="text-sm text-amber-500">
                                  Impact: {getImpactStars(improvement.impact)}
                                </span>
                              </div>
                            </div>
                            
                            {improvement.impact > 0 && (
                              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 p-2 rounded-lg">
                                <TrendingDownIcon className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                  Potential Improvement
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <AlertCircleIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p>No improvement suggestions available.</p>
                  </div>
                )}
                
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg mt-6">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <BarChart3Icon className="h-4 w-4 text-blue-600" />
                    Impact of Improvements
                  </h3>
                  <p className="text-sm">
                    Implementing these suggestions could potentially reduce your debt-to-income ratio
                    {ratio && ratio.ratio > 36 ? (
                      <span> from <strong>{ratio.ratio.toFixed(1)}%</strong> to as low as <strong className="text-green-600">36.0%</strong>, making you more attractive to lenders and improving your financial health.</span>
                    ) : (
                      <span> even further, strengthening your already healthy financial position.</span>
                    )}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtToIncomeRatioTracker;
