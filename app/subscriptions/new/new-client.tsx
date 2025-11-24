'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionForm from '@/components/subscription/subscription-form';
import ClientSubscriptionManager from '@/components/subscription/client-subscription-manager';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface NewSubscriptionClientProps {
  serverAction: (formData: any) => Promise<{
    success: boolean;
    redirectTo?: string;
    subscription?: any;
    error?: string;
  }>;
}

export default function NewSubscriptionClient({ serverAction }: NewSubscriptionClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = async (formData: any) => {
    // Log the form data to debug what's being submitted
    console.log('Form data being submitted:', formData);
    
    setIsSubmitting(true);
    setError(null);
    setFormSubmitted(true);
    
    try {
      // Make sure all form data is properly formatted
      // Especially handle date objects correctly
      const result = await serverAction(formData);
      
      if (result.success && result.redirectTo) {
        // Show success message before redirecting
        setError(null);
        // Use a slight delay before redirecting to show success state
        setTimeout(() => {
          router.push(result.redirectTo!);
        }, 500);
      } else if (!result.success && result.error) {
        setError(result.error);
        setFormSubmitted(false);
      }
    } catch (err: any) {
      console.error('Error in client component:', err);
      setError(err.message || 'An error occurred while creating the subscription');
      setFormSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container py-6">
      {/* Include the ClientSubscriptionManager to ensure client ID is set */}
      <ClientSubscriptionManager />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Subscription</h1>
        <p className="text-muted-foreground">
          Track your recurring subscriptions and never miss a payment
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {formSubmitted && !error && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded flex items-center">
          <span>Subscription created successfully! Redirecting...</span>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
        </div>
      )}
      
      <div className="max-w-2xl">
        {!formSubmitted || error ? (
          <SubscriptionForm 
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="flex justify-center py-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/subscriptions')}
              className="mr-2"
            >
              View All Subscriptions
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setFormSubmitted(false);
                setError(null);
              }}
            >
              Add Another Subscription
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
