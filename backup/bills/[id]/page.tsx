import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBillById, getBillPayments, getBillPriceChanges } from '@/lib/bills';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import BillDetail from './components/bill-detail';

export const metadata: Metadata = {
  title: 'Bill Details | Dripcheck',
  description: 'View and manage bill details',
};

interface BillDetailPageProps {
  params: {
    id: string;
  };
}

export default function BillDetailPage({ params }: BillDetailPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        heading="Bill Details"
        subheading="View and manage your bill"
      />
      
      <Suspense fallback={<BillDetailSkeleton />}>
        <BillDetailContent id={params.id} />
      </Suspense>
    </div>
  );
}

async function BillDetailContent({ id }: { id: string }) {
  try {
    const bill = await getBillById(id);
    const payments = await getBillPayments(id);
    const priceChanges = await getBillPriceChanges(id);
    
    if (!bill) {
      return notFound();
    }
    
    return <BillDetail bill={bill} payments={payments} priceChanges={priceChanges} />;
  } catch (error) {
    console.error('Error loading bill details:', error);
    return <div>Error loading bill details. Please try again later.</div>;
  }
}

function BillDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}
