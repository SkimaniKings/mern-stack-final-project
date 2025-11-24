'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { 
  AlertCircle, 
  Calendar, 
  Edit, 
  ExternalLink, 
  MoreVertical, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { Subscription, SubscriptionCategory } from '@/types/subscription';
import { deleteSubscription, logSubscriptionUsage } from '@/app/actions/subscription';
import { formatCurrency } from '@/lib/utils';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  categories: SubscriptionCategory[];
}

export default function SubscriptionList({ subscriptions, categories }: SubscriptionListProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoggingUsage, setIsLoggingUsage] = useState<string | null>(null);
  
  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };
  
  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'semi_annual': return 'Semi-Annual';
      case 'annual': return 'Annual';
      default: return frequency;
    }
  };
  
  // Calculate annual cost
  const calculateAnnualCost = (subscription: Subscription) => {
    const { amount, frequency } = subscription;
    switch (frequency) {
      case 'weekly': return amount * 52;
      case 'bi_weekly': return amount * 26;
      case 'monthly': return amount * 12;
      case 'quarterly': return amount * 4;
      case 'semi_annual': return amount * 2;
      case 'annual': return amount;
      default: return amount;
    }
  };
  
  // Calculate total annual cost of all subscriptions
  const totalAnnualCost = subscriptions.reduce(
    (total, subscription) => total + calculateAnnualCost(subscription),
    0
  );
  
  // Handle delete subscription
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await deleteSubscription(id);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    } finally {
      setIsDeleting(null);
    }
  };
  
  // Handle log usage
  const handleLogUsage = async (id: string) => {
    try {
      setIsLoggingUsage(id);
      await logSubscriptionUsage(id, new Date().toISOString().split('T')[0]);
      router.refresh();
    } catch (error) {
      console.error('Failed to log subscription usage:', error);
    } finally {
      setIsLoggingUsage(null);
    }
  };
  
  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
  
  // Check if renewal date is approaching (within 7 days)
  const isRenewalSoon = (renewalDate: string) => {
    const today = new Date();
    const renewal = parseISO(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Subscriptions</h2>
          <p className="text-muted-foreground">
            Total Annual Cost: {formatCurrency(totalAnnualCost)}
          </p>
        </div>
        <Button onClick={() => router.push('/subscriptions/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add Subscription
        </Button>
      </div>
      
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">You don't have any subscriptions yet.</p>
              <Button onClick={() => router.push('/subscriptions/new')}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="relative">
              {isRenewalSoon(subscription.next_renewal_date) && (
                <div className="absolute top-2 right-2">
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Renews Soon
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{subscription.name}</CardTitle>
                    <CardDescription>
                      {subscription.vendor || 'No vendor specified'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => router.push(`/subscriptions/${subscription.id}`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleLogUsage(subscription.id)}
                        disabled={!!isLoggingUsage}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Log Usage
                      </DropdownMenuItem>
                      {subscription.cancel_url && (
                        <DropdownMenuItem asChild>
                          <a 
                            href={subscription.cancel_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Cancel Page
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(subscription.id)}
                        disabled={!!isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Badge variant="outline" className="mt-2 w-fit">
                  {getCategoryName(subscription.category_id)}
                </Badge>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency:</span>
                    <span>{formatFrequency(subscription.frequency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Renewal:</span>
                    <span>
                      {format(parseISO(subscription.next_renewal_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={getStatusBadgeVariant(subscription.status) as any}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  {subscription.usage_rating !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usage Rating:</span>
                      <span>{subscription.usage_rating}/10</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="pt-0">
                <div className="w-full flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Annual cost: {formatCurrency(calculateAnnualCost(subscription), subscription.currency)}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/subscriptions/${subscription.id}`)}
                  >
                    Details
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
