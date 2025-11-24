import { Suspense } from 'react';
import { Metadata } from 'next';
import BillsDashboard from './components/bills-dashboard';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Bills | Dripcheck',
  description: 'Manage your recurring bills and payments',
};

export default function BillsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        heading="Bills Management"
        subheading="Track, manage, and pay your recurring bills"
      />
      
      <Suspense fallback={<BillsDashboardSkeleton />}>
        <BillsDashboard />
      </Suspense>
    </div>
  );
}

function BillsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}
