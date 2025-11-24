import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBillById } from '@/lib/bills';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import DeleteConfirmation from './components/delete-confirmation';

export const metadata: Metadata = {
  title: 'Delete Bill | Dripcheck',
  description: 'Delete a bill from your account',
};

interface DeleteBillPageProps {
  params: {
    id: string;
  };
}

export default function DeleteBillPage({ params }: DeleteBillPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        heading="Delete Bill"
        subheading="Permanently delete this bill from your account"
      />
      
      <Suspense fallback={<DeleteConfirmationSkeleton />}>
        <DeleteConfirmationContent id={params.id} />
      </Suspense>
    </div>
  );
}

async function DeleteConfirmationContent({ id }: { id: string }) {
  try {
    const bill = await getBillById(id);
    
    if (!bill) {
      return notFound();
    }
    
    return <DeleteConfirmation bill={bill} />;
  } catch (error) {
    console.error('Error loading bill for deletion:', error);
    return <div>Error loading bill details. Please try again later.</div>;
  }
}

function DeleteConfirmationSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-[300px] rounded-lg" />
    </div>
  );
}
