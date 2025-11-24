import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Bill, BillPayment, BillPriceChange } from '@/types/bills';
import { formatCurrency } from '@/lib/utils';
import { formatFrequency } from '@/lib/bills';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CalendarIcon, 
  CreditCardIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowUpDownIcon,
  ClockIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  BuildingIcon
} from 'lucide-react';

interface BillDetailProps {
  bill: Bill;
  payments: BillPayment[];
  priceChanges: BillPriceChange[];
}

export default function BillDetail({ bill, payments, priceChanges }: BillDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{bill.name}</h1>
          {bill.vendor && (
            <p className="text-muted-foreground">
              <BuildingIcon className="inline-block mr-1 h-4 w-4" />
              {bill.vendor}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/bills/${bill.id}/pay`}>
              <CreditCardIcon className="mr-2 h-4 w-4" />
              Record Payment
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/bills/${bill.id}/edit`}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit Bill
            </Link>
          </Button>
          <Button asChild variant="destructive">
            <Link href={`/bills/${bill.id}/delete`}>
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BillInfoCard 
          title="Amount Due" 
          value={formatCurrency(bill.amount_due)} 
          icon={<CreditCardIcon className="h-5 w-5" />} 
        />
        <BillInfoCard 
          title="Next Due Date" 
          value={format(new Date(bill.next_due_date), 'MMMM d, yyyy')} 
          icon={<CalendarIcon className="h-5 w-5" />} 
        />
        <BillInfoCard 
          title="Status" 
          value={<BillStatusBadge status={bill.status} />} 
          icon={<ClockIcon className="h-5 w-5" />} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium text-muted-foreground">Frequency</dt>
                <dd>{formatFrequency(bill.frequency)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium text-muted-foreground">Category</dt>
                <dd>{bill.category?.name || 'Uncategorized'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium text-muted-foreground">Automatic Payment</dt>
                <dd>{bill.is_automatic ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium text-muted-foreground">Reminder Days</dt>
                <dd>{bill.reminder_days} days before due</dd>
              </div>
              {bill.expected_payment_account && (
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="font-medium text-muted-foreground">Payment Account</dt>
                  <dd>{bill.expected_payment_account}</dd>
                </div>
              )}
              {bill.last_paid_date && (
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="font-medium text-muted-foreground">Last Paid</dt>
                  <dd>{format(new Date(bill.last_paid_date), 'MMMM d, yyyy')}</dd>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd>{format(new Date(bill.created_at), 'MMMM d, yyyy')}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {bill.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="price-changes">Price Changes</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <PaymentHistoryTable payments={payments} />
        </TabsContent>
        <TabsContent value="price-changes">
          <PriceChangesTable priceChanges={priceChanges} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BillInfoCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <div className="mr-2 rounded-md bg-primary/10 p-2">
            {icon}
          </div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function BillStatusBadge({ status }: { status: Bill['status'] }) {
  switch (status) {
    case 'unpaid':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Upcoming</Badge>;
    case 'paid':
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case 'overdue':
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>;
    default:
      return null;
  }
}

function PaymentHistoryTable({ payments }: { payments: BillPayment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>Record of all payments made for this bill</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No payment history found for this bill.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{formatCurrency(payment.amount_paid)}</TableCell>
                  <TableCell>{payment.payment_method || 'Not specified'}</TableCell>
                  <TableCell>{payment.note || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/bills/${payments[0]?.bill_id}/pay`}>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Record New Payment
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function PriceChangesTable({ priceChanges }: { priceChanges: BillPriceChange[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Change History</CardTitle>
        <CardDescription>Track changes in bill amount over time</CardDescription>
      </CardHeader>
      <CardContent>
        {priceChanges.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No price changes recorded for this bill.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Previous Amount</TableHead>
                <TableHead>New Amount</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceChanges.map((change) => {
                const difference = change.new_amount - change.old_amount;
                const percentChange = ((difference / change.old_amount) * 100).toFixed(2);
                const isIncrease = difference > 0;
                
                return (
                  <TableRow key={change.id}>
                    <TableCell>{format(new Date(change.changed_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{formatCurrency(change.old_amount)}</TableCell>
                    <TableCell>{formatCurrency(change.new_amount)}</TableCell>
                    <TableCell>
                      <span className={isIncrease ? 'text-red-600' : 'text-green-600'}>
                        {isIncrease ? '+' : ''}{formatCurrency(difference)} ({isIncrease ? '+' : ''}{percentChange}%)
                      </span>
                    </TableCell>
                    <TableCell>{change.reason || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
