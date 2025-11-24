'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Subscription } from '@/types/subscription';
import { useClientSubscriptions } from './client-subscription-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, Calendar, Clock, DollarSign, Edit, ExternalLink, Trash } from 'lucide-react';

interface ClientSubscriptionListProps {
  serverSubscriptions: Subscription[];
}

export default function ClientSubscriptionList({ serverSubscriptions }: ClientSubscriptionListProps) {
  const router = useRouter();
  const { deleteLocalSubscription, isLoaded } = useClientSubscriptions();
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to get local subscriptions - moved outside the effect to avoid dependency issues
  const getAndMergeSubscriptions = () => {
    if (!isLoaded) return;
    
    try {
      // Access localStorage directly instead of using the hook function
      const getLocalSubs = () => {
        if (typeof window === 'undefined') return [];
        
        try {
          const storedData = localStorage.getItem('finance-hub-subscriptions');
          if (!storedData) return [];
          
          const allSubscriptions = JSON.parse(storedData);
          return allSubscriptions || [];
        } catch (error) {
          console.error('Error getting local subscriptions:', error);
          return [];
        }
      };
      
      // Get local subscriptions
      const localSubscriptions = getLocalSubs();
      
      // Merge with server subscriptions, avoiding duplicates
      // We consider subscriptions with the same ID as duplicates
      const serverIds = new Set(serverSubscriptions.map(sub => sub.id));
      const filteredLocalSubscriptions = localSubscriptions.filter(sub => !serverIds.has(sub.id));
      
      // Combine and sort by creation date (newest first)
      const combined = [...serverSubscriptions, ...filteredLocalSubscriptions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setAllSubscriptions(combined);
    } catch (error) {
      console.error('Error merging subscriptions:', error);
      // If there's an error, just use server subscriptions
      setAllSubscriptions(serverSubscriptions);
    } finally {
      setIsLoading(false);
    }
  };

  // Use effect with stable dependencies
  useEffect(() => {
    getAndMergeSubscriptions();
  }, [serverSubscriptions, isLoaded]);

  // Handle deleting a client-side subscription
  const handleDeleteClientSubscription = (id: string) => {
    try {
      deleteLocalSubscription(id);
      setAllSubscriptions(prev => prev.filter(sub => sub.id !== id));
      toast.success('Subscription deleted');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get recurrence text
  const getRecurrenceText = (recurrence: string) => {
    switch (recurrence) {
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'semi_annual': return 'Semi-Annual';
      case 'annual': case 'yearly': return 'Annual';
      default: return recurrence.charAt(0).toUpperCase() + recurrence.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (allSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Subscriptions Found</CardTitle>
          <CardDescription>
            You don't have any subscriptions yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start tracking your recurring subscriptions to manage your expenses better.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push('/subscriptions/new')}>
            Add Your First Subscription
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {allSubscriptions.map((subscription) => (
        <Card key={subscription.id} className={subscription.client_side ? 'border-dashed border-amber-300' : ''}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{subscription.name}</CardTitle>
                <CardDescription>
                  {subscription.service_provider || 'No provider specified'}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {subscription.client_side && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Local Only
                  </Badge>
                )}
                <Badge variant="outline" className={subscription.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {subscription.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>{formatCurrency(subscription.amount, subscription.currency)}</span>
                <span className="text-muted-foreground ml-1">
                  / {getRecurrenceText(subscription.recurrence)}
                </span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>Started: {formatDate(subscription.start_date)}</span>
              </div>
              {subscription.end_date && (
                <div className="flex items-center col-span-2">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>Ends: {formatDate(subscription.end_date)}</span>
                </div>
              )}
            </div>
            {subscription.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {subscription.description}
              </p>
            )}
          </CardContent>
          <CardFooter className="pt-0 flex justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/subscriptions/${subscription.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <div className="space-x-2">
              {subscription.client_side ? (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteClientSubscription(subscription.id)}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push(`/subscriptions/${subscription.id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
