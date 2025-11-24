import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Bill } from '@/types/bills';
import { deleteBill } from '@/lib/bills';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangleIcon } from 'lucide-react';

interface DeleteConfirmationProps {
  bill: Bill;
}

export default function DeleteConfirmation({ bill }: DeleteConfirmationProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteBill(bill.id);
      router.push('/bills');
      router.refresh();
    } catch (err) {
      console.error('Error deleting bill:', err);
      setError('An error occurred while deleting the bill. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
        <CardTitle className="text-xl text-red-600">Delete Bill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center font-medium">
          Are you sure you want to delete this bill?
        </p>
        <p className="text-center text-muted-foreground">
          This action cannot be undone. All payment history and price change records for this bill will also be deleted.
        </p>
        
        <div className="border rounded-lg p-4 mt-4">
          <h3 className="font-bold text-lg">{bill.name}</h3>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
              <p className="text-muted-foreground">Amount:</p>
              <p className="font-medium">{formatCurrency(bill.amount_due)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date:</p>
              <p className="font-medium">{format(new Date(bill.next_due_date), 'MMM d, yyyy')}</p>
            </div>
            {bill.vendor && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Vendor:</p>
                <p className="font-medium">{bill.vendor}</p>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="text-red-600 text-center p-2 bg-red-50 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/bills/${bill.id}`)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Bill'}
        </Button>
      </CardFooter>
    </Card>
  );
}
