import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBillById } from '@/lib/bills';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import PaymentForm from './components/payment-form';

export const metadata: Metadata = {
  title: 'Record Payment | Dripcheck',
  description: 'Record a payment for your bill',
};

interface RecordPaymentPageProps {
  params: {
    id: string;
  };
}

export default function RecordPaymentPage({ params }: RecordPaymentPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        heading="Record Payment"
        subheading="Record a payment for your bill"
      />
      
      <Suspense fallback={<PaymentFormSkeleton />}>
        <PaymentFormContent id={params.id} />
      </Suspense>
    </div>
  );
}

async function PaymentFormContent({ id }: { id: string }) {
  try {
    const bill = await getBillById(id);
    
    if (!bill) {
      return notFound();
    }
    
    return <PaymentForm bill={bill} />;
  } catch (error) {
    console.error('Error loading bill for payment:', error);
    return <div>Error loading bill details. Please try again later.</div>;
  }
}

function PaymentFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}
