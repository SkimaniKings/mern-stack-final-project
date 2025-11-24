import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBillById } from '@/lib/bills';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import BillForm from '../../components/bill-form';

export const metadata: Metadata = {
  title: 'Edit Bill | Dripcheck',
  description: 'Edit your bill details',
};

interface EditBillPageProps {
  params: {
    id: string;
  };
}

export default function EditBillPage({ params }: EditBillPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        heading="Edit Bill"
        subheading="Update your bill details"
      />
      
      <Suspense fallback={<BillFormSkeleton />}>
        <EditBillContent id={params.id} />
      </Suspense>
    </div>
  );
}

async function EditBillContent({ id }: { id: string }) {
  try {
    const bill = await getBillById(id);
    
    if (!bill) {
      return notFound();
    }
    
    return <BillForm bill={bill} isEditing={true} />;
  } catch (error) {
    console.error('Error loading bill for editing:', error);
    return <div>Error loading bill details. Please try again later.</div>;
  }
}

function BillFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-[600px] rounded-lg" />
    </div>
  );
}
