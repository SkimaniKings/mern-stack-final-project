"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBudgets, deleteBudget, Budget, BudgetCategory } from '@/app/actions/budgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { BudgetForm } from './budget-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, MoreVertical, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BudgetDashboardProps { budgetId?: string }

export function BudgetDashboard({ budgetId }: BudgetDashboardProps) {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(budgetId ?? null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: budgets, isLoading, error } = useQuery<Budget[]>({ 
    queryKey: ['budgets'], 
    queryFn: getBudgets 
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: (data, variables) => {
      toast.success('Budget deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      if (selectedBudgetId === variables) {
        setSelectedBudgetId(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete budget');
    },
  });

  // Sync external prop
  useEffect(() => {
    if (budgetId) setSelectedBudgetId(budgetId)
  }, [budgetId])

  const selectedBudget = useMemo(() => {
    if (!selectedBudgetId || !budgets) return null;
    return budgets.find(b => b.id === selectedBudgetId) || null;
  }, [selectedBudgetId, budgets]);

  const handleAddNew = () => {
    setEditingBudget(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const handleDelete = (budgetId: string) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      deleteMutation.mutate(budgetId);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
  };

  if (isLoading) return <div className="text-center p-8">Loading budgets...</div>;
  if (error) return <div className="text-center p-8 text-destructive">Error loading budgets: {(error as Error).message}</div>;

  // --- Category Breakdown Chart Data Aggregation ---
  // Flatten and sum all categories by name across all budgets
  const categoryTotals: Record<string, number> = {};
  function aggregateCategories(categories: BudgetCategory[]) {
    for (const cat of categories) {
      if (!cat.name) continue;
      if (!categoryTotals[cat.name]) categoryTotals[cat.name] = 0;
      categoryTotals[cat.name] += cat.amount || 0;
      if (cat.subcategories && cat.subcategories.length > 0) {
        aggregateCategories(cat.subcategories);
      }
    }
  }
  if (selectedBudget) {
    if (selectedBudget.categories && selectedBudget.categories.length > 0) {
      aggregateCategories(selectedBudget.categories)
    }
  }
  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  const chartColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb',
    '#b39ddb', '#ffb74d', '#aed581', '#4dd0e1', '#e57373', '#ba68c8', '#ffd54f', '#81c784', '#64b5f6',
  ];

  return (
    <div className="space-y-6">
      {/* Category Breakdown Chart */}
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Category Allocation Analytics</CardTitle>
            <CardDescription>Pie chart of total allocated amounts by category across all budgets.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name }) => name}
                  >
                    {chartData.map((entry, idx) => (
                      <Cell key={`cell-${entry.name}`} fill={chartColors[idx % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground">No category data available for analytics.</div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create a New Budget'}</DialogTitle>
            </DialogHeader>
            <BudgetForm budget={editingBudget} onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <div className="md:col-span-1 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Budgets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {budgets && budgets.length > 0 ? (
                budgets.map(budget => (
                  <div
                    key={budget.id}
                    className={`p-3 rounded-lg cursor-pointer border ${selectedBudgetId === budget.id ? 'bg-muted border-primary' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedBudgetId(budget.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{budget.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(budget.start_date)} - {budget.end_date ? formatDate(budget.end_date) : 'Ongoing'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(budget)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(budget.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2">
                      <Progress value={(0 / (budget.amount || 1)) * 100} className="h-2" />
                      <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                        <span>{formatCurrency(0)} spent</span>
                        <span>{formatCurrency(budget.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No budgets found. Create one to get started.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          {selectedBudget ? (
            <BudgetDetails budget={selectedBudget} />
          ) : (
            <Card className="flex items-center justify-center h-full min-h-[400px]">
              <CardContent className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Select a budget to see its details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface BudgetDetailsProps {
  budget: Budget;
}

function BudgetDetails({ budget }: BudgetDetailsProps) {
  const totalAllocated = useMemo(() => {
    const calculateTotal = (categories: BudgetCategory[]): number => {
      let total = 0;
      for (const category of categories) {
        total += category.amount || 0;
        if (category.subcategories && category.subcategories.length > 0) {
          total += calculateTotal(category.subcategories);
        }
      }
      return total;
    };
    return calculateTotal(budget.categories || []);
  }, [budget.categories]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{budget.name}</CardTitle>
        <CardDescription>
          {formatDate(budget.start_date)} - {budget.end_date ? formatDate(budget.end_date) : 'Ongoing'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-baseline p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Allocated</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground text-right">Total Budget</p>
              <p className="text-2xl font-bold text-right">{formatCurrency(budget.amount)}</p>
            </div>
          </div>
          <Progress value={(totalAllocated / (budget.amount || 1)) * 100} />
          <div className="space-y-2 pt-4">
            <h3 className="font-semibold">Category Breakdown</h3>
            <div className="max-h-[350px] overflow-auto pr-2">
              {Array.isArray(budget.categories) && budget.categories.length > 0 ? (
                <CategoryList categories={budget.categories} />
              ) : (
                <p className="text-sm text-muted-foreground">No categories defined for this budget.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryListProps {
  categories: BudgetCategory[];
}

function CategoryList({ categories }: CategoryListProps) {
  return (
    <div className="space-y-3">
      {categories.map((category, idx) => (
        <div key={category.id ?? `${category.name}-${idx}`}>
          <div className="flex justify-between items-center">
            <span className="font-medium">{category.name}</span>
            <span className="font-mono text-sm">{formatCurrency(category.amount)}</span>
          </div>
          <Progress value={(0 / (category.amount || 1)) * 100} className="h-2 mt-1" />
          {category.subcategories && category.subcategories.length > 0 && (
            <div className="ml-4 mt-2 space-y-2 border-l pl-4">
              <CategoryList categories={category.subcategories} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
