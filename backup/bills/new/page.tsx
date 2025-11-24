import { Metadata } from 'next';
import BillForm from '../components/bill-form';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Add New Bill | Dripcheck',
  description: 'Add a new bill to track and manage',
};

export default function NewBillPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        heading="Add New Bill"
        subheading="Create a new bill to track and manage"
      />
      
      <div className="mt-6">
        <BillForm />
      </div>
    </div>
  );
}
