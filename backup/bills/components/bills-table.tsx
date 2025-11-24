import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Bill } from '@/types/bills';
import { formatCurrency } from '@/lib/utils';
import { formatFrequency } from '@/lib/bills';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  ArrowUpDownIcon, 
  MoreHorizontalIcon, 
  PencilIcon, 
  TrashIcon, 
  CreditCardIcon 
} from 'lucide-react';

interface BillsTableProps {
  bills: Bill[];
}

export default function BillsTable({ bills }: BillsTableProps) {
  const [sortField, setSortField] = useState<keyof Bill>('next_due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof Bill) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBills = [...bills].sort((a, b) => {
    if (sortField === 'next_due_date' || sortField === 'created_at' || sortField === 'updated_at') {
      const dateA = new Date(a[sortField] as string).getTime();
      const dateB = new Date(b[sortField] as string).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'amount_due') {
      return sortDirection === 'asc' 
        ? (a[sortField] as number) - (b[sortField] as number)
        : (b[sortField] as number) - (a[sortField] as number);
    } else {
      const valueA = String(a[sortField] || '').toLowerCase();
      const valueB = String(b[sortField] || '').toLowerCase();
      return sortDirection === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
  });

  const getStatusBadge = (status: Bill['status']) => {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('name')}
                className="flex items-center"
              >
                Name
                <ArrowUpDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => handleSort('amount_due')}
                className="flex items-center"
              >
                Amount
                <ArrowUpDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => handleSort('next_due_date')}
                className="flex items-center"
              >
                Due Date
                <ArrowUpDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No bills found. Add your first bill to get started.
              </TableCell>
            </TableRow>
          ) : (
            sortedBills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">
                  <Link href={`/bills/${bill.id}`} className="hover:underline">
                    {bill.name}
                  </Link>
                  {bill.vendor && (
                    <div className="text-sm text-muted-foreground">{bill.vendor}</div>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(bill.amount_due)}</TableCell>
                <TableCell>
                  {bill.next_due_date 
                    ? format(new Date(bill.next_due_date), 'MMM d, yyyy') 
                    : 'Not set'}
                </TableCell>
                <TableCell>{formatFrequency(bill.frequency)}</TableCell>
                <TableCell>{getStatusBadge(bill.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/bills/${bill.id}`}>
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/bills/${bill.id}/pay`}>
                          <CreditCardIcon className="mr-2 h-4 w-4" />
                          Record Payment
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/bills/${bill.id}/delete`} className="text-red-600 hover:text-red-800">
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Delete
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
