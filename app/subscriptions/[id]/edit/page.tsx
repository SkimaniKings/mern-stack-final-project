import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getSubscriptionById, updateSubscription } from '@/app/actions/subscription';
import SubscriptionForm from '@/components/subscription/subscription-form';

export const metadata: Metadata = {
  title: 'Edit Subscription | Dripcheck',
  description: 'Edit your subscription details',
};

interface EditSubscriptionPageProps {
  params: {
    id: string;
  };
}

export default async function EditSubscriptionPage({ params }: EditSubscriptionPageProps) {
  const { id } = await params;
  
  // Fetch subscription data
  const subscription = await getSubscriptionById(id);
  
  if (!subscription) {
    notFound();
  }
  
  // Server action to handle form submission
  async function handleUpdateSubscription(formData: any) {
    'use server';
    
    await updateSubscription(id, {
      ...formData,
      next_renewal_date: formData.next_renewal_date.toISOString().split('T')[0],
    });
    
    redirect(`/subscriptions/${id}`);
  }
  
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Subscription</h1>
        <p className="text-muted-foreground">
          Update the details of your {subscription.name} subscription
        </p>
      </div>
      
      <div className="max-w-2xl">
        <SubscriptionForm 
          subscription={subscription}
          onSubmit={handleUpdateSubscription}
          isSubmitting={false}
        />
      </div>
    </div>
  );
}
