import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { 
  getSubscriptionById, 
  getSubscriptionCategories,
  getSubscriptionUsageLogs,
  getSubscriptionPriceChanges
} from '@/app/actions/subscription';
import SubscriptionDetail from '@/components/subscription/subscription-detail';

export const metadata: Metadata = {
  title: 'Subscription Details | Dripcheck',
  description: 'View and manage your subscription details',
};

interface SubscriptionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params;
  
  try {
    // Fetch subscription data
    const subscription = await getSubscriptionById(id);
    
    if (!subscription) {
      // Instead of showing a 404, show a helpful message
      return (
        <div className="container py-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  No subscription found. 
                  <a href="/subscriptions" className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-1">
                    View all subscriptions
                  </a> or 
                  <a href="/subscriptions/new" className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-1">
                    create a new one
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Fetch additional data in parallel
    const [categories, usageLogs, priceChanges] = await Promise.all([
      getSubscriptionCategories(),
      getSubscriptionUsageLogs(id),
      getSubscriptionPriceChanges(id),
    ]);
    
    // Find the category info for this subscription's category
    let categoryInfo = null;
    if (subscription.category) {
      // Find the category by name
      categoryInfo = categories.find(cat => cat.name === subscription.category);
    }
    
    // Create a proper category object to pass to the component
    const category = categoryInfo || null;
    
    return (
      <div className="container py-6">
        <SubscriptionDetail 
          subscription={subscription}
          category={category}
          usageLogs={usageLogs}
          priceChanges={priceChanges}
        />
      </div>
    );
  } catch (error) {
    // Handle authentication errors gracefully
    if (error instanceof Error && error.message === 'User not authenticated') {
      return (
        <div className="container py-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You need to be logged in to view subscription details.
                  <a href="/login" className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-1">
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // For other errors, throw to the error boundary
    throw error;
  }
}
