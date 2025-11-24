import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DebtService } from '@/lib/debt/debt-service';
import { Debt } from '@/types/debt';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CreditCardIcon, AlertCircleIcon, CheckCircleIcon, TrendingDownIcon, ArrowRightIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreditCard extends Debt {
  credit_limit: number;
  credit_utilization: number;
  optimal_balance: number;
  balance_to_transfer: number;
  utilization_status: 'good' | 'warning' | 'high';
}

const CreditUtilizationOptimizer: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [targetUtilization, setTargetUtilization] = useState<number>(30);
  const [overallUtilization, setOverallUtilization] = useState<number>(0);
  const [optimizedCards, setOptimizedCards] = useState<CreditCard[]>([]);
  const [showOptimized, setShowOptimized] = useState<boolean>(false);

  const debtService = new DebtService();

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        setDebts(fetchedDebts);
        
        // Filter for credit cards and add utilization data
        const cards = fetchedDebts
          .filter(debt => debt.type === 'credit_card' && debt.credit_limit && debt.credit_limit > 0)
          .map(card => {
            const utilization = (card.current_balance / (card.credit_limit || 1)) * 100;
            return {
              ...card,
              credit_limit: card.credit_limit || 0,
              credit_utilization: utilization,
              optimal_balance: 0,
              balance_to_transfer: 0,
              utilization_status: getUtilizationStatus(utilization)
            } as CreditCard;
          });
        
        setCreditCards(cards);
        
        // Calculate overall utilization
        const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
        const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
        const overall = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
        setOverallUtilization(overall);
        
        // Calculate optimal distribution
        calculateOptimalDistribution(cards, targetUtilization);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching debts:', error);
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  useEffect(() => {
    if (creditCards.length > 0) {
      calculateOptimalDistribution(creditCards, targetUtilization);
    }
  }, [targetUtilization, creditCards]);

  const getUtilizationStatus = (utilization: number): 'good' | 'warning' | 'high' => {
    if (utilization <= 30) return 'good';
    if (utilization <= 50) return 'warning';
    return 'high';
  };

  const calculateOptimalDistribution = (cards: CreditCard[], target: number) => {
    // Calculate total balance and limit
    const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
    
    // Calculate target balance for each card based on the target utilization
    const optimized = cards.map(card => {
      const optimalBalance = (card.credit_limit * target) / 100;
      const balanceToTransfer = card.current_balance - optimalBalance;
      
      return {
        ...card,
        optimal_balance: optimalBalance,
        balance_to_transfer: balanceToTransfer,
        utilization_status: getUtilizationStatus(target)
      };
    });
    
    setOptimizedCards(optimized);
  };

  const handleTargetUtilizationChange = (value: number[]) => {
    setTargetUtilization(value[0]);
  };

  const toggleOptimizedView = () => {
    setShowOptimized(!showOptimized);
  };

  const getUtilizationColor = (status: 'good' | 'warning' | 'high') => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUtilizationTextColor = (status: 'good' | 'warning' | 'high') => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getOverallUtilizationStatus = () => {
    return getUtilizationStatus(overallUtilization);
  };

  const getUtilizationData = (cards: CreditCard[]) => {
    return cards.map(card => ({
      name: card.name,
      value: card.current_balance,
      limit: card.credit_limit,
      utilization: card.credit_utilization
    }));
  };

  const getOptimizedUtilizationData = () => {
    return optimizedCards.map(card => ({
      name: card.name,
      value: card.optimal_balance,
      limit: card.credit_limit,
      utilization: targetUtilization
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getTransferPlan = () => {
    const cardsToReduceBalance = optimizedCards.filter(card => card.balance_to_transfer > 0);
    const cardsToIncreaseBalance = optimizedCards.filter(card => card.balance_to_transfer < 0);
    
    const transfers = [];
    
    // Simple greedy algorithm for balance transfers
    for (const sourceCard of cardsToReduceBalance) {
      let remainingToTransfer = sourceCard.balance_to_transfer;
      
      for (const targetCard of cardsToIncreaseBalance) {
        if (remainingToTransfer <= 0) break;
        
        const targetCapacity = Math.abs(targetCard.balance_to_transfer);
        const transferAmount = Math.min(remainingToTransfer, targetCapacity);
        
        if (transferAmount > 0) {
          transfers.push({
            from: sourceCard.name,
            to: targetCard.name,
            amount: transferAmount,
            fromId: sourceCard.id,
            toId: targetCard.id
          });
          
          remainingToTransfer -= transferAmount;
          // Update the target card's capacity
          targetCard.balance_to_transfer += transferAmount;
        }
      }
    }
    
    return transfers;
  };

  const getCreditScoreImpact = () => {
    // Simple estimation of credit score impact
    const currentUtilization = overallUtilization;
    const targetUtil = targetUtilization;
    
    if (currentUtilization <= targetUtil) {
      return { points: 0, description: 'No significant change expected' };
    }
    
    const difference = currentUtilization - targetUtil;
    
    if (difference > 50) {
      return { points: '30-50', description: 'Significant improvement possible' };
    } else if (difference > 20) {
      return { points: '15-30', description: 'Moderate improvement expected' };
    } else {
      return { points: '5-15', description: 'Slight improvement expected' };
    }
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

  if (creditCards.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-primary" />
            Credit Utilization Optimizer
          </CardTitle>
          <CardDescription>
            Optimize your credit card balances to improve your credit score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircleIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Credit Cards Found</h3>
            <p className="text-muted-foreground max-w-md">
              Add your credit cards to your debt list and make sure to include the credit limit to use this tool.
              Set the debt type to "credit_card" to identify them correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-primary" />
          Credit Utilization Optimizer
        </CardTitle>
        <CardDescription>
          Optimize your credit card balances to improve your credit score
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Credit Limit</h3>
              <p className="text-2xl font-bold">
                {formatCurrency(creditCards.reduce((sum, card) => sum + card.credit_limit, 0))}
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Utilization</h3>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {overallUtilization.toFixed(1)}%
                </p>
                <Badge className={getUtilizationColor(getOverallUtilizationStatus())}>
                  {getOverallUtilizationStatus()}
                </Badge>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Credit Score Impact</h3>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {getCreditScoreImpact().points === 0 ? 'None' : `+${getCreditScoreImpact().points} pts`}
                </p>
                {getCreditScoreImpact().points !== 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                    Improvement
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <Label htmlFor="target-utilization" className="text-base font-medium">
                  Target Utilization: {targetUtilization}%
                </Label>
                <p className="text-sm text-muted-foreground">
                  Experts recommend keeping credit utilization below 30% for optimal credit scores
                </p>
              </div>
              <Button 
                variant={showOptimized ? "default" : "outline"} 
                onClick={toggleOptimizedView}
                className="whitespace-nowrap"
              >
                {showOptimized ? "Current Balance" : "Show Optimized"}
              </Button>
            </div>
            
            <Slider
              id="target-utilization"
              defaultValue={[30]}
              max={50}
              step={1}
              value={[targetUtilization]}
              onValueChange={handleTargetUtilizationChange}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>10%</span>
              <span className="text-green-500 font-medium">30%</span>
              <span>40%</span>
              <span>50%</span>
            </div>
          </div>
          
          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="cards">Card Utilization</TabsTrigger>
              <TabsTrigger value="transfers">Balance Transfer Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cards" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={showOptimized ? getOptimizedUtilizationData() : getUtilizationData(creditCards)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(showOptimized ? getOptimizedUtilizationData() : getUtilizationData(creditCards)).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {showOptimized ? "Optimized Distribution" : "Current Distribution"}
                  </h3>
                  
                  <div className="space-y-4">
                    {(showOptimized ? optimizedCards : creditCards).map((card) => (
                      <div key={card.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{card.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={getUtilizationTextColor(card.utilization_status)}>
                              {showOptimized ? targetUtilization : card.credit_utilization.toFixed(1)}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(showOptimized ? card.optimal_balance : card.current_balance)} 
                              / {formatCurrency(card.credit_limit)}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={showOptimized ? targetUtilization : card.credit_utilization} 
                          max={100}
                          className={`h-2 ${
                            showOptimized 
                              ? 'bg-primary/20' 
                              : card.utilization_status === 'good' 
                                ? 'bg-green-200' 
                                : card.utilization_status === 'warning' 
                                  ? 'bg-yellow-200' 
                                  : 'bg-red-200'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  Credit Utilization Tips
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong>Keep utilization below 30%</strong> on each card and overall for the best credit score impact.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong>Pay down highest utilization cards first</strong> to see the biggest credit score improvement.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong>Consider balance transfers</strong> to distribute balances more evenly across cards.
                    </span>
                  </li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="transfers" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Balance Transfer Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Follow this plan to optimize your credit card utilization to {targetUtilization}% across all cards.
                </p>
                
                {getTransferPlan().length > 0 ? (
                  <div className="space-y-3 mt-4">
                    {getTransferPlan().map((transfer, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <CreditCardIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{transfer.from}</p>
                                <p className="text-sm text-muted-foreground">Source Card</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              <ArrowRightIcon className="h-5 w-5 text-muted-foreground mx-2" />
                              <Badge variant="outline" className="font-bold">
                                {formatCurrency(transfer.amount)}
                              </Badge>
                              <ArrowRightIcon className="h-5 w-5 text-muted-foreground mx-2" />
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="bg-green-500/10 p-2 rounded-full">
                                <CreditCardIcon className="h-5 w-5 text-green-500" />
                              </div>
                              <div>
                                <p className="font-medium">{transfer.to}</p>
                                <p className="text-sm text-muted-foreground">Target Card</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg flex items-center gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <p>
                      Your credit cards are already optimally balanced or very close to the target utilization.
                      No transfers are needed at this time.
                    </p>
                  </div>
                )}
                
                <div className="bg-muted/30 p-4 rounded-lg mt-6">
                  <h3 className="font-medium mb-2">Balance Transfer Considerations</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>
                        <strong>Transfer fees:</strong> Most cards charge 3-5% of the transferred amount. Consider this cost before transferring.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>
                        <strong>Promotional rates:</strong> Look for 0% APR offers on balance transfers to save on interest during the repayment period.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>
                        <strong>Credit score impact:</strong> Opening new cards for balance transfers can temporarily lower your score, but may help long-term.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditUtilizationOptimizer;
