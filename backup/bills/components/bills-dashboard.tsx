import { useState } from 'react';
import Link from 'next/link';
import { getBills } from '@/lib/bills';
import { Bill, BillStatus } from '@/types/bills';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CreditCardIcon, PlusIcon, ArrowUpDownIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import BillsTable from './bills-table';
import BillsSummary from './bills-summary';
import BillsCalendar from './bills-calendar';

export default async function BillsDashboard() {
  const bills = await getBills();
  
  // Group bills by status
  const upcomingBills = bills.filter(bill => bill.status === 'unpaid');
  const overdueBills = bills.filter(bill => bill.status === 'overdue');
  const paidBills = bills.filter(bill => bill.status === 'paid');
  
  // Calculate totals
  const totalDue = upcomingBills.reduce((sum, bill) => sum + bill.amount_due, 0);
  const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.amount_due, 0);
  const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount_due, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title="Upcoming Bills" 
          amount={totalDue} 
          count={upcomingBills.length} 
          status="unpaid"
        />
        <SummaryCard 
          title="Overdue Bills" 
          amount={totalOverdue} 
          count={overdueBills.length} 
          status="overdue"
        />
        <SummaryCard 
          title="Paid This Month" 
          amount={totalPaid} 
          count={paidBills.length} 
          status="paid"
        />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Bills</h2>
        <Button asChild>
          <Link href="/bills/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add New Bill
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <BillsTable bills={bills} />
        </TabsContent>
        <TabsContent value="calendar">
          <BillsCalendar bills={bills} />
        </TabsContent>
        <TabsContent value="summary">
          <BillsSummary bills={bills} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ 
  title, 
  amount, 
  count, 
  status 
}: { 
  title: string; 
  amount: number; 
  count: number; 
  status: BillStatus;
}) {
  const getStatusColor = (status: BillStatus) => {
    switch (status) {
      case 'unpaid':
        return 'bg-blue-50 border-blue-200';
      case 'paid':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'cancelled':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: BillStatus) => {
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
  };

  return (
    <Card className={`${getStatusColor(status)} border`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{title}</CardTitle>
          {getStatusBadge(status)}
        </div>
        <CardDescription>{count} bill{count !== 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/bills?status=${status}`}>
            View details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
