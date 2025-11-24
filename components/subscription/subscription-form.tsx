'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { 
  Subscription, 
  SubscriptionCategory, 
  SubscriptionFrequency, 
  SubscriptionStatus 
} from '@/types/subscription';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSubscriptionCategories } from '@/app/actions/subscription';

// Form schema using Zod
const subscriptionFormSchema = z.object({
  name: z.string().min(1, 'Subscription name is required'),
  vendor: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  amount: z.coerce.number().min(0, 'Amount must be a positive number'),
  currency: z.string().default('USD'),
  frequency: z.enum(['weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']),
  next_renewal_date: z.date(),
  auto_renew: z.boolean().default(true),
  status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  usage_rating: z.coerce.number().min(0).max(10).optional().nullable(),
  notes: z.string().optional(),
  cancel_url: z.string().url().optional().or(z.literal('')),
  support_contact: z.string().optional(),
});

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSubmit: (data: SubscriptionFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export default function SubscriptionForm({ 
  subscription, 
  onSubmit, 
  isSubmitting 
}: SubscriptionFormProps) {
  const [categories, setCategories] = useState<SubscriptionCategory[]>([]);
  
  // Initialize form with default values or existing subscription data
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: subscription ? {
      ...subscription,
      next_renewal_date: subscription.next_renewal_date ? new Date(subscription.next_renewal_date) : new Date(),
      usage_rating: subscription.usage_rating || null,
      cancel_url: subscription.cancel_url || '',
      support_contact: subscription.support_contact || '',
    } : {
      name: '',
      vendor: '',
      description: '',
      category_id: '',
      amount: 0,
      currency: 'USD',
      frequency: 'monthly',
      next_renewal_date: new Date(),
      auto_renew: true,
      status: 'active',
      usage_rating: null,
      notes: '',
      cancel_url: '',
      support_contact: '',
    }
  });
  
  // Fetch subscription categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getSubscriptionCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch subscription categories:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Handle form submission
  const handleSubmit = async (data: SubscriptionFormValues) => {
    try {
      await onSubmit(data);
      if (!subscription) {
        form.reset(); // Reset form after successful submission if creating new
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };
  
  const frequencyOptions: { value: SubscriptionFrequency; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi_weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi_annual', label: 'Semi-Annual' },
    { value: 'annual', label: 'Annual' },
  ];
  
  const statusOptions: { value: SubscriptionStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subscription Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscription Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Netflix, Spotify, etc." {...field} />
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
                  <Input placeholder="Company providing the service" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Category */}
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  defaultValue={field.value || 'none'}
                  value={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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
          
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount*</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
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
                <FormControl>
                  <Input placeholder="USD" {...field} />
                </FormControl>
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
                <FormLabel>Billing Frequency*</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Next Renewal Date */}
          <FormField
            control={form.control}
            name="next_renewal_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Next Renewal Date*</FormLabel>
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
          
          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Auto Renew */}
          <FormField
            control={form.control}
            name="auto_renew"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Auto Renew</FormLabel>
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
          
          {/* Usage Rating */}
          <FormField
            control={form.control}
            name="usage_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usage Rating (0-10)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="10" 
                    {...field} 
                    value={field.value === null ? '' : field.value}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseInt(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Cancel URL */}
          <FormField
            control={form.control}
            name="cancel_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancellation URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Support Contact */}
          <FormField
            control={form.control}
            name="support_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Support Contact</FormLabel>
                <FormControl>
                  <Input placeholder="Email or phone number" {...field} value={field.value || ''} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of the subscription" 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes" 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : subscription ? 'Update Subscription' : 'Add Subscription'}
        </Button>
      </form>
    </Form>
  );
}
