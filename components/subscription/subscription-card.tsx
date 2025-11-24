'use client';

import { Subscription } from '@/types/subscription';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Edit, ExternalLink, Trash } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SubscriptionCategoryInfo } from '@/types/subscription';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatFrequency, getUsageRatingColorClass } from '@/lib/subscription-utils';

interface SubscriptionCardProps {
  subscription: Subscription;
}

export default function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // Format the recurring amount
  const formattedAmount = formatCurrency(subscription.amount, subscription.currency);
  
  // Get the recurrence text using the utility function
  const getRecurrenceText = () => {
    // Use frequency if available, otherwise fall back to recurrence
    return formatFrequency(subscription.frequency || subscription.recurrence);
  };

  // Handle edit click
  const handleEdit = () => {
    router.push(`/subscriptions/${subscription.id}`);
  };

  // Handle delete click
  const handleDelete = async () => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Import the server action to delete the subscription
      const { deleteSubscription } = await import('@/app/actions/subscription');
      
      // Delete using server action instead of API route
      await deleteSubscription(subscription.id);
      
      toast.success('Subscription deleted successfully');
      
      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={`flex flex-col h-full hover:shadow-md transition-shadow ${getUsageRatingColorClass(subscription.usage_rating)}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{subscription.name}</CardTitle>
        </div>
        {subscription.service_provider && (
          <p className="text-sm text-muted-foreground">{subscription.service_provider}</p>
        )}
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-3">
          <div className="flex items-center text-lg font-semibold">
            <DollarSign className="h-5 w-5 mr-1 text-primary" />
            {formattedAmount}
          </div>
          
          <div className="flex items-center text-sm font-medium">
            <Clock className="h-4 w-4 mr-1" />
            <span>{getRecurrenceText()}</span>
          </div>
          
          {subscription.category && (
            <Badge variant="secondary" className="mt-2 font-medium">
              {typeof subscription.category === 'string' ? subscription.category : 'Uncategorized'}
            </Badge>
          )}
          
          {subscription.description && (
            <p className="text-sm mt-2 font-medium line-clamp-2">
              {subscription.description}
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleEdit}
          className="bg-gray-200 text-black hover:bg-gray-300 transition-colors"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        
        <Button 
          variant="destructive" 
          size="sm" 
          className="bg-red-500 text-black hover:bg-red-600 transition-colors" 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash className="h-4 w-4 mr-1" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </CardFooter>
    </Card>
  );
}
