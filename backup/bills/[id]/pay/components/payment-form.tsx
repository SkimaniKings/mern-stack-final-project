import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Bill } from '@/types/bills';
import { createBillPayment } from '@/lib/bills';
import { formatCurrency } from '@/lib/utils';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, DollarSignIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the form schema
const paymentFormSchema = z.object({
  amount_paid: z.coerce.number().positive({ message: 'Amount must be greater than 0' }),
  payment_date: z.date({ required_error: 'Payment date is required' }),
  payment_method: z.string().optional(),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  bill: Bill;
}

export default function PaymentForm({ bill }: PaymentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount_paid: bill.amount_due,
      payment_date: new Date(),
      payment_method: '',
      note: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await createBillPayment({
        ...data,
        bill_id: bill.id,
      });
      router.push(`/bills/${bill.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Payment for {bill.name}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 p-4 bg-muted rounded-lg mb-4">
              <div>
                <p className="text-sm font-medium">Bill Amount:</p>
                <p className="text-lg font-bold">{formatCurrency(bill.amount_due)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Due Date:</p>
                <p className="text-lg font-bold">{format(new Date(bill.next_due_date), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status:</p>
                <p className="text-lg font-bold">{bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}</p>
              </div>
            </div>

            {/* Amount Paid */}
            <FormField
              control={form.control}
              name="amount_paid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
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

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
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

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Credit Card, Bank Transfer, Cash"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this payment"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/bills/${bill.id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
