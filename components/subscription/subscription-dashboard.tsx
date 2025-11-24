'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Subscription } from '@/types/subscription';
import { Loader2 } from 'lucide-react';
import SubscriptionCard from './subscription-card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SubscriptionDashboardProps {
  serverSubscriptions: Subscription[];
}

export default function SubscriptionDashboard({ serverSubscriptions }: SubscriptionDashboardProps) {
  const router = useRouter();

  // Sort subscriptions by name
  const sortedSubscriptions = [...serverSubscriptions].sort((a, b) => a.name.localeCompare(b.name));

  if (serverSubscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">You don't have any subscriptions yet.</p>
          <Button 
            onClick={() => router.push('/subscriptions/new')} 
            className="mt-4"
          >
            Add Your First Subscription
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSubscriptions.map((subscription) => (
          <SubscriptionCard 
            key={subscription.id} 
            subscription={subscription}
          />
        ))}
      </div>
      
      <div className="flex justify-center">
        <Button onClick={() => router.push('/subscriptions/new')}>
          Add New Subscription
        </Button>
      </div>
    </div>
  );
}

// Helper component to display a grid of subscriptions
function SubscriptionsGrid({ 
  subscriptions, 
  emptyMessage 
}: { 
  subscriptions: Subscription[], 
  emptyMessage: string 
}) {
  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subscriptions.map((subscription) => (
        <SubscriptionCard 
          key={subscription.id} 
          subscription={subscription}
          isClientSide={!!subscription.client_side}
        />
      ))}
    </div>
  );
}
