import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3Icon, 
  CalendarIcon, 
  CreditCardIcon, 
  PercentIcon, 
  TrendingDownIcon,
  MoveHorizontalIcon,
  BarChart2Icon,
  CalculatorIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  LandmarkIcon,
  PartyPopperIcon
} from 'lucide-react';

// Import all the strategic debt management components
import DebtFreedomTimeline from './strategic/debt-freedom-timeline';
import InterestPrincipalWaterfall from './strategic/interest-principal-waterfall';
import RepaymentStrategyComparison from './strategic/repayment-strategy-comparison';
import CreditUtilizationOptimizer from './strategic/credit-utilization-optimizer';
import VisualDebtReducer from './strategic/visual-debt-reducer';
import DebtToIncomeRatioTracker from './strategic/debt-to-income-ratio-tracker';
import { DebtConsolidationAnalyzer } from './strategic/debt-consolidation-analyzer';
import { LoanComparisonCalculator } from './strategic/loan-comparison-calculator';
import DebtFreeCountdown from './debt-free-countdown';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  category: 'analysis' | 'visualization' | 'planning' | 'optimization';
  badge?: string;
}

const StrategicDebtDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const tools: Tool[] = [
    {
      id: 'debt-freedom-timeline',
      name: 'Debt Freedom Timeline',
      description: 'Visualize how different payment scenarios affect your debt-free date',
      icon: <CalendarIcon className="h-5 w-5" />,
      component: <DebtFreedomTimeline />,
      category: 'visualization',
      badge: 'Popular'
    },
    {
      id: 'interest-principal-waterfall',
      name: 'Interest vs. Principal Waterfall',
      description: 'See how your payments are distributed between interest and principal over time',
      icon: <BarChart2Icon className="h-5 w-5" />,
      component: <InterestPrincipalWaterfall />,
      category: 'visualization'
    },
    {
      id: 'repayment-strategy-comparison',
      name: 'Repayment Strategy Comparison',
      description: 'Compare different debt repayment strategies to find the optimal approach',
      icon: <BarChart3Icon className="h-5 w-5" />,
      component: <RepaymentStrategyComparison />,
      category: 'analysis',
      badge: 'Recommended'
    },
    {
      id: 'credit-utilization-optimizer',
      name: 'Credit Utilization Optimizer',
      description: 'Optimize your credit card balances to improve your credit score',
      icon: <CreditCardIcon className="h-5 w-5" />,
      component: <CreditUtilizationOptimizer />,
      category: 'optimization'
    },
    {
      id: 'visual-debt-reducer',
      name: 'Visual Debt Reducer',
      description: 'Visually allocate extra payments to see the impact on your debt payoff timeline',
      icon: <MoveHorizontalIcon className="h-5 w-5" />,
      component: <VisualDebtReducer />,
      category: 'planning',
      badge: 'Interactive'
    },
    {
      id: 'debt-to-income-ratio-tracker',
      name: 'Debt-to-Income Ratio Tracker',
      description: 'Monitor your debt-to-income ratio and get personalized improvement suggestions',
      icon: <PercentIcon className="h-5 w-5" />,
      component: <DebtToIncomeRatioTracker />,
      category: 'analysis'
    },
    {
      id: 'debt-consolidation-analyzer',
      name: 'Debt Consolidation Analyzer',
      description: 'Analyze if consolidating your debts will save you money and time',
      icon: <RefreshCwIcon className="h-5 w-5" />,
      component: <DebtConsolidationAnalyzer />,
      category: 'analysis'
    },
    {
      id: 'loan-comparison-calculator',
      name: 'Loan Comparison Calculator',
      description: 'Compare different loan options to make informed borrowing decisions',
      icon: <CalculatorIcon className="h-5 w-5" />,
      component: <LoanComparisonCalculator />,
      category: 'planning'
    },
    {
      id: 'debt-free-countdown',
      name: 'Debt-Free Countdown',
      description: 'Stay motivated with a countdown to your debt-free date',
      icon: <PartyPopperIcon className="h-5 w-5" />,
      component: <DebtFreeCountdown />,
      category: 'visualization',
      badge: 'Motivational'
    }
  ];

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    setActiveTab('tool');
  };

  const getCategoryTools = (category: 'analysis' | 'visualization' | 'planning' | 'optimization') => {
    return tools.filter(tool => tool.category === category);
  };

  const getSelectedTool = () => {
    return tools.find(tool => tool.id === selectedTool);
  };

  const getCategoryIcon = (category: 'analysis' | 'visualization' | 'planning' | 'optimization') => {
    switch (category) {
      case 'analysis':
        return <BarChart3Icon className="h-5 w-5 text-blue-500" />;
      case 'visualization':
        return <BarChart2Icon className="h-5 w-5 text-purple-500" />;
      case 'planning':
        return <CalculatorIcon className="h-5 w-5 text-green-500" />;
      case 'optimization':
        return <TrendingDownIcon className="h-5 w-5 text-amber-500" />;
    }
  };

  const getCategoryColor = (category: 'analysis' | 'visualization' | 'planning' | 'optimization') => {
    switch (category) {
      case 'analysis':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30';
      case 'visualization':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-950/30';
      case 'planning':
        return 'text-green-500 bg-green-50 dark:bg-green-950/30';
      case 'optimization':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strategic Debt Management</h2>
          <p className="text-muted-foreground">
            Powerful tools to help you analyze, plan, and optimize your debt repayment strategy
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setActiveTab('overview')}>
            <LandmarkIcon className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis Tools</TabsTrigger>
          <TabsTrigger value="visualization">Visualization Tools</TabsTrigger>
          <TabsTrigger value="planning">Planning Tools</TabsTrigger>
          {selectedTool && <TabsTrigger value="tool">{getSelectedTool()?.name}</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Card 
                key={tool.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleToolSelect(tool.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-lg ${getCategoryColor(tool.category)}`}>
                      {tool.icon}
                    </div>
                    {tool.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCategoryTools('analysis').map((tool) => (
              <Card 
                key={tool.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleToolSelect(tool.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-950/30">
                      {tool.icon}
                    </div>
                    {tool.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="visualization" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCategoryTools('visualization').map((tool) => (
              <Card 
                key={tool.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleToolSelect(tool.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg text-purple-500 bg-purple-50 dark:bg-purple-950/30">
                      {tool.icon}
                    </div>
                    {tool.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="planning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCategoryTools('planning').map((tool) => (
              <Card 
                key={tool.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleToolSelect(tool.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg text-green-500 bg-green-50 dark:bg-green-950/30">
                      {tool.icon}
                    </div>
                    {tool.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="tool" className="space-y-4">
          {selectedTool && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getCategoryColor(getSelectedTool()?.category || 'analysis')}`}>
                    {getSelectedTool()?.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{getSelectedTool()?.name}</h3>
                    <p className="text-sm text-muted-foreground">{getSelectedTool()?.description}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setActiveTab('overview')}>
                  Back to Dashboard
                </Button>
              </div>
              
              {getSelectedTool()?.component}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StrategicDebtDashboard;
