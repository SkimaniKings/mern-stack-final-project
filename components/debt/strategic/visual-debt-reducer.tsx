import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { DebtService } from '@/lib/debt/debt-service';
import { Debt } from '@/types/debt';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  MoveHorizontalIcon, 
  TrendingDownIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  PartyPopperIcon
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface DebtWithAllocation extends Debt {
  allocation: number;
  months_to_payoff: number;
  payoff_date: string;
  interest_saved: number;
}

const VisualDebtReducer: React.FC = () => {
  const [debts, setDebts] = useState<DebtWithAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [extraPayment, setExtraPayment] = useState<number>(200);
  const [allocations, setAllocations] = useState<{[key: string]: number}>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartDebtId, setDragStartDebtId] = useState<string | null>(null);
  const [milestoneReached, setMilestoneReached] = useState<{
    show: boolean;
    message: string;
    debt?: DebtWithAllocation;
  }>({ show: false, message: '' });

  const debtService = new DebtService();

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        
        // Initialize with even distribution
        const initialDebts = fetchedDebts.map(debt => {
          return {
            ...debt,
            allocation: 0,
            months_to_payoff: calculateMonthsToPayoff(debt.current_balance, debt.interest_rate, debt.minimum_payment),
            payoff_date: calculatePayoffDate(calculateMonthsToPayoff(debt.current_balance, debt.interest_rate, debt.minimum_payment)),
            interest_saved: 0
          } as DebtWithAllocation;
        });
        
        setDebts(initialDebts);
        
        // Set default even allocation
        if (initialDebts.length > 0) {
          distributeEvenly(initialDebts, extraPayment);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching debts:', error);
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  const calculateMonthsToPayoff = (balance: number, interestRate: number, payment: number, extraPayment: number = 0): number => {
    const monthlyRate = interestRate / 100 / 12;
    const totalPayment = payment + extraPayment;
    
    if (monthlyRate === 0 || totalPayment >= balance) {
      return Math.ceil(balance / totalPayment);
    }
    
    // Formula for calculating months to payoff with interest
    const months = Math.log(totalPayment / (totalPayment - monthlyRate * balance)) / Math.log(1 + monthlyRate);
    return isNaN(months) || !isFinite(months) ? 240 : Math.ceil(months);
  };

  const calculatePayoffDate = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const calculateInterestSaved = (balance: number, interestRate: number, payment: number, extraPayment: number): number => {
    const monthlyRate = interestRate / 100 / 12;
    
    // Calculate total interest without extra payment
    const monthsWithoutExtra = calculateMonthsToPayoff(balance, interestRate, payment);
    const totalWithoutExtra = payment * monthsWithoutExtra;
    const interestWithoutExtra = totalWithoutExtra - balance;
    
    // Calculate total interest with extra payment
    const monthsWithExtra = calculateMonthsToPayoff(balance, interestRate, payment, extraPayment);
    const totalWithExtra = (payment + extraPayment) * monthsWithExtra;
    const interestWithExtra = totalWithExtra - balance;
    
    return Math.max(0, interestWithoutExtra - interestWithExtra);
  };

  const distributeEvenly = (debtsToUpdate: DebtWithAllocation[], amount: number) => {
    const totalDebts = debtsToUpdate.length;
    if (totalDebts === 0) return;
    
    const evenAmount = Math.floor(amount / totalDebts);
    const remainder = amount - (evenAmount * totalDebts);
    
    const newAllocations: {[key: string]: number} = {};
    
    debtsToUpdate.forEach((debt, index) => {
      // Add remainder to the first debt
      const allocation = index === 0 ? evenAmount + remainder : evenAmount;
      newAllocations[debt.id] = allocation;
    });
    
    setAllocations(newAllocations);
    updateDebtsWithAllocations(debtsToUpdate, newAllocations);
  };

  const distributeAvalanche = (debtsToUpdate: DebtWithAllocation[], amount: number) => {
    // Sort by highest interest rate first
    const sortedDebts = [...debtsToUpdate].sort((a, b) => b.interest_rate - a.interest_rate);
    
    const newAllocations: {[key: string]: number} = {};
    let remainingAmount = amount;
    
    // Initialize all allocations to 0
    sortedDebts.forEach(debt => {
      newAllocations[debt.id] = 0;
    });
    
    // Allocate to highest interest rate first
    for (const debt of sortedDebts) {
      if (remainingAmount > 0) {
        newAllocations[debt.id] = remainingAmount;
        remainingAmount = 0;
      }
    }
    
    setAllocations(newAllocations);
    updateDebtsWithAllocations(debtsToUpdate, newAllocations);
  };

  const distributeSnowball = (debtsToUpdate: DebtWithAllocation[], amount: number) => {
    // Sort by lowest balance first
    const sortedDebts = [...debtsToUpdate].sort((a, b) => a.current_balance - b.current_balance);
    
    const newAllocations: {[key: string]: number} = {};
    let remainingAmount = amount;
    
    // Initialize all allocations to 0
    sortedDebts.forEach(debt => {
      newAllocations[debt.id] = 0;
    });
    
    // Allocate to lowest balance first
    for (const debt of sortedDebts) {
      if (remainingAmount > 0) {
        newAllocations[debt.id] = remainingAmount;
        remainingAmount = 0;
      }
    }
    
    setAllocations(newAllocations);
    updateDebtsWithAllocations(debtsToUpdate, newAllocations);
  };

  const updateDebtsWithAllocations = (debtsToUpdate: DebtWithAllocation[], newAllocations: {[key: string]: number}) => {
    const updatedDebts = debtsToUpdate.map(debt => {
      const allocation = newAllocations[debt.id] || 0;
      const monthsToPayoff = calculateMonthsToPayoff(debt.current_balance, debt.interest_rate, debt.minimum_payment, allocation);
      const payoffDate = calculatePayoffDate(monthsToPayoff);
      const interestSaved = calculateInterestSaved(debt.current_balance, debt.interest_rate, debt.minimum_payment, allocation);
      
      return {
        ...debt,
        allocation,
        months_to_payoff: monthsToPayoff,
        payoff_date: payoffDate,
        interest_saved: interestSaved
      };
    });
    
    setDebts(updatedDebts);
    
    // Check for milestones
    checkForMilestones(updatedDebts);
  };

  const checkForMilestones = (updatedDebts: DebtWithAllocation[]) => {
    // Check if any debt will be paid off within 6 months
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    const soonToPayoff = updatedDebts.find(debt => {
      const payoffDate = new Date(debt.payoff_date);
      return payoffDate <= sixMonthsFromNow && debt.allocation > 0;
    });
    
    if (soonToPayoff) {
      const months = soonToPayoff.months_to_payoff;
      let message = '';
      
      if (months <= 1) {
        message = `🎉 Amazing! ${soonToPayoff.name} will be paid off next month!`;
      } else if (months <= 3) {
        message = `🎉 Great progress! ${soonToPayoff.name} will be paid off in just ${months} months!`;
      } else {
        message = `🎉 You're on track to pay off ${soonToPayoff.name} in ${months} months!`;
      }
      
      setMilestoneReached({
        show: true,
        message,
        debt: soonToPayoff
      });
    } else {
      setMilestoneReached({ show: false, message: '' });
    }
  };

  const handleExtraPaymentChange = (value: number[]) => {
    const amount = value[0];
    setExtraPayment(amount);
    
    // Redistribute based on current allocation strategy
    if (debts.length > 0) {
      const totalCurrentAllocation = Object.values(allocations).reduce((sum, value) => sum + value, 0);
      if (totalCurrentAllocation === 0) {
        distributeEvenly(debts, amount);
      } else {
        // Maintain relative proportions
        const newAllocations: {[key: string]: number} = {};
        let remainingAmount = amount;
        
        // Sort debts by current allocation (descending)
        const sortedDebts = [...debts].sort((a, b) => 
          (allocations[b.id] || 0) - (allocations[a.id] || 0)
        );
        
        // Allocate proportionally
        for (const debt of sortedDebts) {
          if (remainingAmount > 0 && allocations[debt.id] > 0) {
            const proportion = allocations[debt.id] / totalCurrentAllocation;
            const newAllocation = Math.min(Math.floor(amount * proportion), remainingAmount);
            newAllocations[debt.id] = newAllocation;
            remainingAmount -= newAllocation;
          } else {
            newAllocations[debt.id] = 0;
          }
        }
        
        // Allocate any remainder to the first debt with allocation
        if (remainingAmount > 0) {
          for (const debt of sortedDebts) {
            if (newAllocations[debt.id] > 0) {
              newAllocations[debt.id] += remainingAmount;
              break;
            }
          }
        }
        
        setAllocations(newAllocations);
        updateDebtsWithAllocations(debts, newAllocations);
      }
    }
  };

  const handleAllocationChange = (debtId: string, allocation: number) => {
    // Ensure allocation is not negative
    allocation = Math.max(0, allocation);
    
    // Calculate total allocation across all debts
    const totalAllocation = Object.entries(allocations)
      .filter(([id]) => id !== debtId)
      .reduce((sum, [, value]) => sum + value, 0) + allocation;
    
    // If total exceeds extra payment, reduce this allocation
    if (totalAllocation > extraPayment) {
      allocation = Math.max(0, extraPayment - (totalAllocation - allocation));
    }
    
    // Update allocations
    const newAllocations = { ...allocations, [debtId]: allocation };
    setAllocations(newAllocations);
    
    // Update debts with new allocations
    updateDebtsWithAllocations(debts, newAllocations);
  };

  const handleDragStart = (debtId: string) => {
    setIsDragging(true);
    setDragStartDebtId(debtId);
  };

  const handleDragOver = (e: React.DragEvent, targetDebtId: string) => {
    e.preventDefault();
    
    if (!isDragging || !dragStartDebtId || dragStartDebtId === targetDebtId) return;
    
    // Get the current allocations
    const sourceAllocation = allocations[dragStartDebtId] || 0;
    const targetAllocation = allocations[targetDebtId] || 0;
    
    // Calculate transfer amount (50% of source allocation)
    const transferAmount = Math.floor(sourceAllocation * 0.5);
    
    if (transferAmount > 0) {
      // Update allocations
      const newAllocations = { 
        ...allocations, 
        [dragStartDebtId]: sourceAllocation - transferAmount,
        [targetDebtId]: targetAllocation + transferAmount
      };
      
      setAllocations(newAllocations);
      updateDebtsWithAllocations(debts, newAllocations);
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStartDebtId(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStartDebtId(null);
  };

  const getTotalInterestSaved = () => {
    return debts.reduce((sum, debt) => sum + debt.interest_saved, 0);
  };

  const getTotalMonthsSaved = () => {
    // Calculate the difference between the longest payoff with minimum payments
    // and the longest payoff with extra payments
    const longestWithMinPayments = Math.max(
      ...debts.map(debt => 
        calculateMonthsToPayoff(debt.current_balance, debt.interest_rate, debt.minimum_payment)
      )
    );
    
    const longestWithExtraPayments = Math.max(
      ...debts.map(debt => debt.months_to_payoff)
    );
    
    return Math.max(0, longestWithMinPayments - longestWithExtraPayments);
  };

  const getEarliestPayoffDate = () => {
    if (debts.length === 0) return 'N/A';
    
    const dates = debts.map(debt => new Date(debt.payoff_date));
    const earliest = new Date(Math.min(...dates.map(date => date.getTime())));
    
    return earliest.toLocaleDateString();
  };

  const getLatestPayoffDate = () => {
    if (debts.length === 0) return 'N/A';
    
    const dates = debts.map(debt => new Date(debt.payoff_date));
    const latest = new Date(Math.max(...dates.map(date => date.getTime())));
    
    return latest.toLocaleDateString();
  };

  const getAllocationPercentage = (debtId: string) => {
    const allocation = allocations[debtId] || 0;
    return extraPayment > 0 ? (allocation / extraPayment) * 100 : 0;
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

  if (debts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoveHorizontalIcon className="h-5 w-5 text-primary" />
            Visual Debt Reducer
          </CardTitle>
          <CardDescription>
            Visually allocate extra payments to see the impact on your debt payoff timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircleIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Debts Found</h3>
            <p className="text-muted-foreground max-w-md">
              Add your debts to your debt list to use this tool.
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
          <MoveHorizontalIcon className="h-5 w-5 text-primary" />
          Visual Debt Reducer
        </CardTitle>
        <CardDescription>
          Visually allocate extra payments to see the impact on your debt payoff timeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          {milestoneReached.show && (
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg flex items-center gap-3 animate-pulse">
              <PartyPopperIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="font-medium text-green-800 dark:text-green-300">
                {milestoneReached.message}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Extra Monthly Payment</h3>
              <p className="text-2xl font-bold">{formatCurrency(extraPayment)}</p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Interest Saved</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalInterestSaved())}</p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Time Saved</h3>
              <p className="text-2xl font-bold text-green-600">{getTotalMonthsSaved()} months</p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <Label htmlFor="extra-payment" className="text-base font-medium">
                  Extra Monthly Payment: {formatCurrency(extraPayment)}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Adjust your additional monthly payment to see how it affects your debt payoff
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => distributeEvenly(debts, extraPayment)}
                >
                  Even Split
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => distributeAvalanche(debts, extraPayment)}
                >
                  Avalanche
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => distributeSnowball(debts, extraPayment)}
                >
                  Snowball
                </Button>
              </div>
            </div>
            
            <Slider
              id="extra-payment"
              defaultValue={[200]}
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
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Payment Allocation</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Debt-free between:</span>
                <Badge variant="outline" className="font-mono">
                  {getEarliestPayoffDate()} - {getLatestPayoffDate()}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Drag between debts to transfer payment allocation, or adjust the sliders directly.
            </p>
            
            <div className="space-y-6">
              {debts.map((debt) => (
                <div 
                  key={debt.id} 
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
                  draggable={true}
                  onDragStart={() => handleDragStart(debt.id)}
                  onDragOver={(e) => handleDragOver(e, debt.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDragOver(e, debt.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{debt.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {debt.interest_rate}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-muted-foreground">
                          Balance: {formatCurrency(debt.current_balance)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Min Payment: {formatCurrency(debt.minimum_payment)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium">
                          Payoff: {new Date(debt.payoff_date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-green-600">
                          Save: {formatCurrency(debt.interest_saved)}
                        </span>
                      </div>
                      <div className="bg-primary/10 p-2 rounded-full">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <Slider
                        defaultValue={[0]}
                        max={extraPayment}
                        step={5}
                        value={[allocations[debt.id] || 0]}
                        onValueChange={(value) => handleAllocationChange(debt.id, value[0])}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max={extraPayment}
                        value={allocations[debt.id] || 0}
                        onChange={(e) => handleAllocationChange(debt.id, parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Badge variant="outline" className="w-16 text-center">
                        {getAllocationPercentage(debt.id).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Payoff Progress</span>
                      <span>{debt.months_to_payoff} months remaining</span>
                    </div>
                    <Progress 
                      value={100 - ((debt.months_to_payoff / (debt.months_to_payoff + 12)) * 100)} 
                      max={100}
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg mt-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              Payment Allocation Tips
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong>Avalanche Method:</strong> Focus on highest interest rate debts first to minimize total interest paid.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong>Snowball Method:</strong> Focus on lowest balance debts first to build momentum with quick wins.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong>Custom Allocation:</strong> Create your own strategy by dragging between debts or adjusting sliders.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VisualDebtReducer;
