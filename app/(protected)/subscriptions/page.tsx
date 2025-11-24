import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Repeat } from 'lucide-react';
import { getUserSubscriptions, getSubscriptionCategories } from '@/app/actions/subscription';
import SubscriptionList from '@/components/subscription/subscription-list';
import SubscriptionAnalytics from '@/components/subscription/subscription-analytics';
import SyncClientSubscriptions from '@/components/subscription/sync-client-subscriptions';
import SubscriptionDashboard from '@/components/subscription/subscription-dashboard';
import Link from 'next/link';
import ClientSubscriptionManager from '@/components/subscription/client-subscription-manager';

export const metadata: Metadata = {
  title: 'Subscriptions | Dripcheck',
  description: 'Manage your subscriptions and recurring payments',
};

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  // Fetch subscriptions and categories
  const [subscriptions, categories] = await Promise.all([
    getUserSubscriptions(),
    getSubscriptionCategories(),
  ]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <Repeat className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage your recurring subscriptions.
          </p>
        </div>
        <Button asChild>
          <Link href="/subscriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Subscription List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Filters</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {/* Include the ClientSubscriptionManager to ensure client ID is set */}
          <ClientSubscriptionManager />
          
          {/* Use SubscriptionDashboard to display both server and client-side subscriptions */}
          <SubscriptionDashboard serverSubscriptions={subscriptions} />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          {/* Include the ClientSubscriptionManager to ensure client ID is set */}
          <ClientSubscriptionManager />
          
          {/* Pass the categories as any to avoid type errors - the component will handle it */}
          <SubscriptionAnalytics 
            subscriptions={subscriptions} 
            categories={categories as any}
          />
        </TabsContent>
        
        <TabsContent value="tools" className="space-y-4">
          {/* Include the ClientSubscriptionManager to ensure client ID is set */}
          <ClientSubscriptionManager />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-1">
              <Link href="/subscriptions/roi-calculator" className="block h-full">
                <div className="h-full border rounded-lg p-6 hover:border-primary hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold mb-2">ROI Calculator</h3>
                  <p className="text-muted-foreground mb-4">Analyze the value and return on investment of your subscriptions.</p>
                  <Button variant="outline" className="w-full">Open Calculator</Button>
                </div>
              </Link>
            </div>
            
            <div className="col-span-1">
              <Link href="/subscriptions/duplicates" className="block h-full">
                <div className="h-full border rounded-lg p-6 hover:border-primary hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold mb-2">Duplicate Detector</h3>
                  <p className="text-muted-foreground mb-4">Find overlapping services and potential duplicate subscriptions.</p>
                  <Button variant="outline" className="w-full">Check Duplicates</Button>
                </div>
              </Link>
            </div>
            
            <div className="col-span-1">
              <Link href="/subscriptions/payment-timeline" className="block h-full">
                <div className="h-full border rounded-lg p-6 hover:border-primary hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold mb-2">Payment Timeline</h3>
                  <p className="text-muted-foreground mb-4">View your upcoming subscription payments on a calendar.</p>
                  <Button variant="outline" className="w-full">View Timeline</Button>
                </div>
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

