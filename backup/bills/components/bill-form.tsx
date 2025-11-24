import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Bill, BillCategory, BillFrequency, BillStatus } from '@/types/bills';
import { createBill, updateBill, getBillCategories } from '@/lib/bills';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, DollarSignIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the form schema
const billFormSchema = z.object({
  name: z.string().min(2, { message: 'Bill name must be at least 2 characters' }),
  description: z.string().optional(),
  amount_due: z.coerce.number().positive({ message: 'Amount must be greater than 0' }),
  currency: z.string().default('USD'),
  frequency: z.enum(['once', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']),
  next_due_date: z.date({ required_error: 'Due date is required' }),
  category_id: z.string().optional(),
  is_automatic: z.boolean().default(false),
  status: z.enum(['unpaid', 'paid', 'overdue', 'cancelled']).default('unpaid'),
  reminder_days: z.coerce.number().int().min(0).default(3),
  expected_payment_account: z.string().optional(),
  vendor: z.string().optional(),
});

type BillFormValues = z.infer<typeof billFormSchema>;

interface BillFormProps {
  bill?: Bill;
  isEditing?: boolean;
}

export default function BillForm({ bill, isEditing = false }: BillFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values or existing bill data
  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: bill
      ? {
          ...bill,
          next_due_date: new Date(bill.next_due_date),
          amount_due: Number(bill.amount_due),
          reminder_days: Number(bill.reminder_days),
        }
      : {
          name: '',
          description: '',
          amount_due: 0,
          currency: 'USD',
          frequency: 'monthly',
          next_due_date: new Date(),
          is_automatic: false,
          status: 'unpaid',
          reminder_days: 3,
        },
  });

  // Fetch bill categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getBillCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching bill categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Handle form submission
  const onSubmit = async (data: BillFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && bill) {
        await updateBill(bill.id, data);
      } else {
        await createBill(data);
      }
      router.push('/bills');
      router.refresh();
    } catch (error) {
      console.error('Error saving bill:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Bill' : 'Add New Bill'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bill Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electricity Bill" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vendor */}
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor/Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electric Company" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details about this bill"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount Due */}
              <FormField
                control={form.control}
                name="amount_due"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Due</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSignIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <FormField
                control={form.control}
                name="next_due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Frequency */}
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="once">One-time</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi_annual">Semi-annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reminder Days */}
              <FormField
                control={form.control}
                name="reminder_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Days Before Due</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Days before due date to send a reminder
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expected Payment Account */}
              <FormField
                control={form.control}
                name="expected_payment_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Account (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Checking Account"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-Pay */}
            <FormField
              control={form.control}
              name="is_automatic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Automatic Payment</FormLabel>
                    <FormDescription>
                      Is this bill set up for automatic payment?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/bills')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Bill' : 'Add Bill'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
