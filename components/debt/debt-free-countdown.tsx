"use client";

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
  CalendarIcon, 
  PartyPopperIcon, 
  TrendingDownIcon, 
  CheckCircleIcon,
  StarIcon,
  AwardIcon,
  TrophyIcon
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import confetti from 'canvas-confetti';

const DebtFreeCountdown: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [debtFreeDate, setDebtFreeDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [originalDebtTotal, setOriginalDebtTotal] = useState<number>(0);
  const [currentDebtTotal, setCurrentDebtTotal] = useState<number>(0);
  const [milestones, setMilestones] = useState<Array<{
    id: string;
    name: string;
    description: string;
    threshold: number;
    reached: boolean;
    icon: React.ReactNode;
  }>>([]);
  const [motivationalQuotes, setMotivationalQuotes] = useState<Array<{
    quote: string;
    author: string;
  }>>([
    {
      quote: "The journey of a thousand miles begins with one step.",
      author: "Lao Tzu"
    },
    {
      quote: "Financial freedom is available to those who learn about it and work for it.",
      author: "Robert Kiyosaki"
    },
    {
      quote: "It's not about how much money you make, but how much money you keep.",
      author: "Robert Kiyosaki"
    },
    {
      quote: "Do not save what is left after spending, but spend what is left after saving.",
      author: "Warren Buffett"
    },
    {
      quote: "The goal isn't more money. The goal is living life on your terms.",
      author: "Chris Brogan"
    },
    {
      quote: "Never spend your money before you have it.",
      author: "Thomas Jefferson"
    },
    {
      quote: "A journey of a thousand miles must begin with a single step.",
      author: "Lao Tzu"
    },
    {
      quote: "The price of anything is the amount of life you exchange for it.",
      author: "Henry David Thoreau"
    }
  ]);
  const [currentQuote, setCurrentQuote] = useState<number>(0);

  const debtService = new DebtService();

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const fetchedDebts = await debtService.getDebts();
        // Even if the user is not authenticated, getDebts will return an empty array
        // instead of throwing an error now
        setDebts(fetchedDebts);
        
        // Calculate debt-free date based on current debts and payment plans
        calculateDebtFreeDate(fetchedDebts);
        
        // Calculate progress
        calculateProgress(fetchedDebts);
        
        // Generate milestones
        generateMilestones(fetchedDebts);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching debts:', error);
        // Set empty debts array to prevent UI errors
        setDebts([]);
        setLoading(false);
      }
    };

    fetchDebts();
    
    // Set up interval to change motivational quote every 10 seconds
    const quoteInterval = setInterval(() => {
      setCurrentQuote(prevQuote => (prevQuote + 1) % motivationalQuotes.length);
    }, 10000);
    
    // Set up interval to update days remaining every day
    const daysInterval = setInterval(() => {
      if (debtFreeDate) {
        setDaysRemaining(calculateDaysRemaining(debtFreeDate));
      }
    }, 86400000); // 24 hours
    
    return () => {
      clearInterval(quoteInterval);
      clearInterval(daysInterval);
    };
  }, []);

  const calculateDebtFreeDate = (currentDebts: Debt[]) => {
    if (currentDebts.length === 0) {
      setDebtFreeDate(null);
      setDaysRemaining(0);
      return;
    }
    
    // Simple calculation for demonstration purposes
    // In a real implementation, this would use more sophisticated amortization calculations
    
    // Find the debt with the longest payoff time
    const longestPayoffMonths = currentDebts.reduce((maxMonths, debt) => {
      const balance = debt.current_balance;
      const monthlyPayment = debt.minimum_payment;
      const interestRate = debt.interest_rate / 100 / 12; // Monthly interest rate
      
      let months = 0;
      if (interestRate > 0 && monthlyPayment > 0) {
        // Use the loan amortization formula to calculate months to payoff
        months = Math.log(monthlyPayment / (monthlyPayment - balance * interestRate)) / Math.log(1 + interestRate);
      } else if (monthlyPayment > 0) {
        // Simple division for 0% interest
        months = balance / monthlyPayment;
      } else {
        // Default to a very long time if no payment is being made
        months = 360; // 30 years
      }
      
      // Handle edge cases
      months = isNaN(months) || !isFinite(months) ? 360 : Math.ceil(months);
      
      return Math.max(maxMonths, months);
    }, 0);
    
    // Calculate the debt-free date
    const date = new Date();
    date.setMonth(date.getMonth() + longestPayoffMonths);
    
    setDebtFreeDate(date);
    setDaysRemaining(calculateDaysRemaining(date));
  };

  const calculateDaysRemaining = (targetDate: Date): number => {
    const today = new Date();
    const timeDiff = targetDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const calculateProgress = (currentDebts: Debt[]) => {
    // Calculate total original debt (assuming current balance + 10% as a simple estimate)
    // In a real implementation, this would use actual original balances from the database
    const estimatedOriginalTotal = currentDebts.reduce((sum, debt) => {
      const originalBalance = debt.original_balance || debt.current_balance * 1.1;
      return sum + originalBalance;
    }, 0);
    
    const currentTotal = currentDebts.reduce((sum, debt) => sum + debt.current_balance, 0);
    
    setOriginalDebtTotal(estimatedOriginalTotal);
    setCurrentDebtTotal(currentTotal);
    
    // Calculate progress percentage
    const paidAmount = estimatedOriginalTotal - currentTotal;
    const progressPercent = (paidAmount / estimatedOriginalTotal) * 100;
    
    setProgressPercent(Math.min(100, Math.max(0, progressPercent)));
  };

  const generateMilestones = (currentDebts: Debt[]) => {
    if (currentDebts.length === 0 || !originalDebtTotal || originalDebtTotal === 0) {
      setMilestones([]);
      return;
    }
    
    const paidOffAmount = originalDebtTotal - currentDebtTotal;
    const paidOffPercent = Math.round((paidOffAmount / originalDebtTotal) * 100);
    
    // Generate milestones based on percentage paid off
    const newMilestones = [
      {
        id: '5-percent',
        name: 'First Steps',
        description: 'You\'ve begun your debt-free journey by paying off 5% of your debt!',
        threshold: 5,
        reached: paidOffPercent >= 5,
        icon: <StarIcon className="h-4 w-4" />
      },
      {
        id: '10-percent',
        name: '10% Milestone',
        description: 'You\'ve paid off 10% of your debt! Keep the momentum going!',
        threshold: 10,
        reached: paidOffPercent >= 10,
        icon: <StarIcon className="h-4 w-4" />
      },
      {
        id: '25-percent',
        name: 'Quarter Way There',
        description: 'You\'ve paid off 25% of your debt! You\'re making significant progress!',
        threshold: 25,
        reached: paidOffPercent >= 25,
        icon: <StarIcon className="h-4 w-4" />
      },
      {
        id: '33-percent',
        name: 'One-Third Complete',
        description: 'You\'ve paid off a third of your debt! Your financial freedom is becoming clearer.',
        threshold: 33,
        reached: paidOffPercent >= 33,
        icon: <AwardIcon className="h-4 w-4" />
      },
      {
        id: '50-percent',
        name: 'Halfway Champion',
        description: 'You\'ve paid off half of your debt! This is a major achievement!',
        threshold: 50,
        reached: paidOffPercent >= 50,
        icon: <AwardIcon className="h-4 w-4" />
      },
      {
        id: '66-percent',
        name: 'Two-Thirds Complete',
        description: 'You\'ve paid off two-thirds of your debt! The finish line is in sight!',
        threshold: 66,
        reached: paidOffPercent >= 66,
        icon: <TrophyIcon className="h-4 w-4" />
      },
      {
        id: '75-percent',
        name: 'Almost There',
        description: 'You\'ve paid off 75% of your debt! You\'re in the final stretch!',
        threshold: 75,
        reached: paidOffPercent >= 75,
        icon: <TrophyIcon className="h-4 w-4" />
      },
      {
        id: '90-percent',
        name: 'Final Countdown',
        description: 'You\'ve paid off 90% of your debt! Freedom is just around the corner!',
        threshold: 90,
        reached: paidOffPercent >= 90,
        icon: <TrophyIcon className="h-4 w-4" />
      },
      {
        id: '100-percent',
        name: 'Debt Free Champion!',
        description: 'CONGRATULATIONS! You\'ve paid off all your debt! You\'ve achieved financial freedom!',
        threshold: 100,
        reached: paidOffPercent >= 100,
        icon: <PartyPopperIcon className="h-4 w-4" />
      }
    ];
    
    // Add milestones for each individual debt paid off
    currentDebts.forEach((debt, index) => {
      if (debt.current_balance === 0) {
        newMilestones.push({
          id: `debt-${debt.id}`,
          name: `Paid Off: ${debt.name}`,
          description: `You've completely paid off your ${debt.name} debt! One step closer to financial freedom!`,
          threshold: -1, // Special threshold for individual debts
          reached: true,
          icon: <CheckCircleIcon className="h-4 w-4" />
        });
      }
    });
    
    // Add milestones for paying off highest interest debt
    if (currentDebts.length > 0) {
      const highestInterestDebt = [...currentDebts].sort((a, b) => b.interest_rate - a.interest_rate)[0];
      if (highestInterestDebt.current_balance === 0) {
        newMilestones.push({
          id: `highest-interest-${highestInterestDebt.id}`,
          name: 'Avalanche Victory',
          description: `You've paid off your highest interest debt (${highestInterestDebt.name})! Smart financial move!`,
          threshold: -1,
          reached: true,
          icon: <TrendingDownIcon className="h-4 w-4" />
        });
      }
    }
    
    // Add milestone for paying off smallest debt (snowball method victory)
    if (currentDebts.length > 0) {
      const smallestDebt = [...currentDebts].sort((a, b) => {
        // Use current_balance as fallback if original_balance is undefined
        const aBalance = a.original_balance || a.current_balance;
        const bBalance = b.original_balance || b.current_balance;
        return aBalance - bBalance;
      })[0];
      
      if (smallestDebt.current_balance === 0) {
        newMilestones.push({
          id: `smallest-debt-${smallestDebt.id}`,
          name: 'Snowball Victory',
          description: `You've paid off your smallest debt (${smallestDebt.name})! Building momentum!`,
          threshold: -1,
          reached: true,
          icon: <TrendingDownIcon className="h-4 w-4" />
        });
      }
    }
    const sortedMilestones = newMilestones.sort((a, b) => a.threshold - b.threshold);
    
    setMilestones(sortedMilestones);
    
    // Trigger confetti if a milestone was just reached
    const justReachedMilestone = sortedMilestones.find(milestone => 
      milestone.reached && 
      milestone.threshold <= progressPercent && 
      milestone.threshold > progressPercent - 1
    );
    
    if (justReachedMilestone) {
      triggerConfetti();
    }
  };

  const triggerConfetti = () => {
    if (typeof window !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getNextMilestone = () => {
    return milestones.find(milestone => !milestone.reached);
  };

  const getReachedMilestones = () => {
    return milestones.filter(milestone => milestone.reached);
  };

  const getUnreachedMilestones = () => {
    return milestones.filter(milestone => !milestone.reached);
  };

  const getProgressColor = () => {
    if (progressPercent >= 75) return 'bg-green-500';
    if (progressPercent >= 50) return 'bg-blue-500';
    if (progressPercent >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
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
            <CalendarIcon className="h-5 w-5 text-primary" />
            Debt-Free Countdown
          </CardTitle>
          <CardDescription>
            Track your progress toward financial freedom
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <PartyPopperIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Debts Found</h3>
            <p className="text-muted-foreground max-w-md">
              Add your debts to your debt list to start tracking your journey to financial freedom.
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
          <CalendarIcon className="h-5 w-5 text-primary" />
          Debt-Free Countdown
        </CardTitle>
        <CardDescription>
          Track your progress toward financial freedom
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Debt-Free Date</h3>
              <p className="text-2xl font-bold">
                {debtFreeDate ? formatDate(debtFreeDate) : 'Calculating...'}
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Days Remaining</h3>
              <p className="text-2xl font-bold">
                {daysRemaining > 0 ? daysRemaining.toLocaleString() : 'Debt Free!'}
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Progress</h3>
              <p className="text-2xl font-bold">{progressPercent.toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Paid: {formatCurrency(originalDebtTotal - currentDebtTotal)}</span>
              <span>Remaining: {formatCurrency(currentDebtTotal)}</span>
            </div>
            <Progress 
              value={progressPercent} 
              max={100}
              className={`h-3 ${getProgressColor()}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getNextMilestone()?.icon || <CheckCircleIcon className="h-5 w-5 text-green-500" />}
              <h3 className="font-medium">
                {getNextMilestone() 
                  ? `Next Milestone: ${getNextMilestone()?.name}`
                  : 'All Milestones Completed!'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {getNextMilestone()?.description || 'Congratulations on becoming debt-free!'}
            </p>
            
            {getNextMilestone() && (
              <div className="mt-3">
                <Progress 
                  value={progressPercent} 
                  max={getNextMilestone()?.threshold || 100}
                  className="h-2 bg-primary/20"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span>Current: {progressPercent.toFixed(1)}%</span>
                  <span>Target: {getNextMilestone()?.threshold}%</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-primary/5 p-4 rounded-lg">
            <blockquote className="italic text-center">
              "{motivationalQuotes[currentQuote].quote}"
              <footer className="text-sm text-muted-foreground mt-2">
                — {motivationalQuotes[currentQuote].author}
              </footer>
            </blockquote>
          </div>
          
          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="milestones" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Your Debt Payoff Journey</h3>
                
                <div className="relative">
                  <div className="absolute left-3 h-full w-0.5 bg-muted-foreground/20"></div>
                  
                  <div className="space-y-4">
                    {milestones.map((milestone, index) => (
                      <div key={milestone.id} className="relative pl-8">
                        <div className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${
                          milestone.reached 
                            ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500' 
                            : 'bg-muted border border-muted-foreground/30'
                        }`}>
                          {milestone.reached && (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        
                        <div className={`p-3 rounded-lg ${
                          milestone.reached 
                            ? 'bg-green-50 dark:bg-green-950/30' 
                            : 'bg-muted/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              {milestone.icon}
                              {milestone.name}
                            </h4>
                            <Badge variant={milestone.reached ? "default" : "outline"}>
                              {milestone.threshold}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="achievements" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Your Achievements</h3>
                
                {getReachedMilestones().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getReachedMilestones().map((milestone) => (
                      <div 
                        key={milestone.id} 
                        className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg flex items-start gap-3"
                      >
                        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                          {milestone.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{milestone.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-muted-foreground">
                      You haven't reached any milestones yet. Keep going!
                    </p>
                  </div>
                )}
                
                {getUnreachedMilestones().length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Upcoming Achievements</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getUnreachedMilestones().slice(0, 4).map((milestone) => (
                        <div 
                          key={milestone.id} 
                          className="bg-muted/50 p-4 rounded-lg flex items-start gap-3"
                        >
                          <div className="bg-muted p-2 rounded-full">
                            {milestone.icon}
                          </div>
                          <div>
                            <h4 className="font-medium">{milestone.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtFreeCountdown;
