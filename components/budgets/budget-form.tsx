"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createBudget, updateBudget, Budget, BudgetCategory } from '@/app/actions/budgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';

interface BudgetFormProps {
  budget?: Budget;
  onSuccess?: () => void;
}

export function BudgetForm({ budget, onSuccess }: BudgetFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Budget, 'id' | 'total_allocated'>>(() => {
    return budget
      ? { ...budget }
      : {
          name: '',
          amount: 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          categories: [],
        };
  });

  const totalAllocated = useMemo(() => {
    const calculateTotal = (categories: BudgetCategory[]): number => {
      return categories.reduce((total, cat) => {
        const subTotal = cat.subcategories.length > 0 ? calculateTotal(cat.subcategories) : cat.amount;
        return total + subTotal;
      }, 0);
    };
    return calculateTotal(formData.categories);
  }, [formData.categories]);

  const remainingAmount = formData.amount - totalAllocated;

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (path: number[], field: keyof BudgetCategory, value: any) => {
    const newCategories = JSON.parse(JSON.stringify(formData.categories));
    let current = newCategories;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].subcategories;
    }
    const index = path[path.length - 1];
    current[index][field] = value;
    handleFieldChange('categories', newCategories);
  };

  const addCategory = (path: number[] = []) => {
    const newCategory: BudgetCategory = { id: uuidv4(), name: '', amount: 0, subcategories: [] };
    const newCategories = JSON.parse(JSON.stringify(formData.categories));
    if (path.length === 0) {
      newCategories.push(newCategory);
    } else {
      let current = newCategories;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]].subcategories;
      }
      current.push(newCategory);
    }
    handleFieldChange('categories', newCategories);
  };

  const removeCategory = (path: number[]) => {
    const newCategories = JSON.parse(JSON.stringify(formData.categories));
    let current = newCategories;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].subcategories;
    }
    current.splice(path[path.length - 1], 1);
    handleFieldChange('categories', newCategories);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (budget?.id) {
        await updateBudget(budget.id, formData);
        toast.success('Budget updated successfully');
      } else {
        await createBudget(formData as Budget);
        toast.success('Budget created successfully');
      }
      onSuccess?.();
      router.push('/budgets');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderCategories = (categories: BudgetCategory[], path: number[] = []) => {
    return categories.map((cat, index) => {
      const currentPath = [...path, index];
      const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;

      return (
        <div key={cat.id} className={`pl-4 border-l-2 ${path.length > 0 ? 'mt-2' : ''}`}>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Category Name"
              value={cat.name}
              onChange={(e) => handleCategoryChange(currentPath, 'name', e.target.value)}
              className="flex-grow"
            />
            <Input
              type="number"
              placeholder="Amount"
              value={cat.amount}
              onChange={(e) => handleCategoryChange(currentPath, 'amount', parseFloat(e.target.value) || 0)}
              className="w-24"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => addCategory(currentPath)}>
              <PlusCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => removeCategory(currentPath)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          {path.length > 0 && (
            <div className="text-xs text-muted-foreground pl-2 pt-1">
              Parent category amount: {formatCurrency(path.reduce((parentAmount, idx, i, arr) => {
                let categories = formData.categories;
                for (let j = 0; j < arr.length - 1; j++) {
                  categories = categories[arr[j]].subcategories;
                }
                return categories[arr[arr.length - 2]]?.amount || 0;
              }, 0))}
            </div>
          )}
          {hasSubcategories && (
            <div className="text-sm text-muted-foreground pl-2 pt-1">
              Allocated from subcategories: {formatCurrency(calculateTotalAllocated(cat.subcategories))}
            </div>
          )}
          {renderCategories(cat.subcategories, currentPath)}
        </div>
      );
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{budget ? 'Edit Budget' : 'Create a New Budget'}</CardTitle>
          <CardDescription>Define your budget details and allocate funds across categories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Budget Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Total Budget Amount</Label>
              <Input id="amount" type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <DatePicker name="start_date" defaultValue={formData.start_date} onChange={(date: Date | undefined) => handleFieldChange('start_date', date?.toISOString().split('T')[0])} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <DatePicker name="end_date" defaultValue={formData.end_date || undefined} onChange={(date: Date | undefined) => handleFieldChange('end_date', date?.toISOString().split('T')[0])} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Categories</h3>
                <div className="text-right">
                    <p className={`text-sm font-medium ${remainingAmount < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formatCurrency(remainingAmount)} Remaining
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(totalAllocated)} of {formatCurrency(formData.amount)} allocated
                    </p>
                </div>
            </div>
            <div className="space-y-2 p-4 border rounded-md min-h-[100px] max-h-64 overflow-y-auto">
              {renderCategories(formData.categories)}
              <Button type="button" variant="outline" size="sm" onClick={() => addCategory([])}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </div>
          </div>
        </CardContent>
        {remainingAmount < 0 && (
          <div className="px-4 pb-2 text-destructive font-medium text-sm">
            Error: Allocated amount exceeds total budget. Please adjust your categories.
          </div>
        )}
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/budgets')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || remainingAmount < 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {budget ? 'Save Changes' : 'Create Budget'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function calculateTotalAllocated(categories: BudgetCategory[]): number {
    return categories.reduce((total, category) => {
        if (category.subcategories && category.subcategories.length > 0) {
            return total + calculateTotalAllocated(category.subcategories);
        }
        return total + (category.amount || 0);
    }, 0);
}
