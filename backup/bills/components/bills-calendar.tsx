import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Bill } from '@/types/bills';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';

interface BillsCalendarProps {
  bills: Bill[];
}

export default function BillsCalendar({ bills }: BillsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getBillsForDay = (day: Date) => {
    return bills.filter(bill => {
      const dueDate = new Date(bill.next_due_date);
      return isSameDay(dueDate, day);
    });
  };

  const getDayClass = (day: Date) => {
    const today = new Date();
    const isToday = isSameDay(day, today);
    const hasBills = getBillsForDay(day).length > 0;
    
    let className = "h-24 border p-1 relative";
    
    if (isToday) {
      className += " bg-blue-50";
    }
    
    if (hasBills) {
      className += " font-bold";
    }
    
    return className;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold py-2 bg-muted">
            {day}
          </div>
        ))}
        
        {daysInMonth.map((day, i) => (
          <div key={i} className={getDayClass(day)}>
            <div className="text-right">{format(day, 'd')}</div>
            <div className="overflow-y-auto max-h-16">
              {getBillsForDay(day).map((bill) => (
                <Link key={bill.id} href={`/bills/${bill.id}`}>
                  <div className="text-xs mb-1 truncate">
                    <Badge 
                      variant="outline" 
                      className={`
                        ${bill.status === 'paid' ? 'bg-green-100 text-green-800' : 
                          bill.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'}
                      `}
                    >
                      {formatCurrency(bill.amount_due)}
                    </Badge> {bill.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
