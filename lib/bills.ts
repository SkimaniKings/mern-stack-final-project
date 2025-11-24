import { createClient } from '@/lib/supabase/client';
import type { Bill, BillCategory, BillFrequency, BillPayment, BillPriceChange, BillStatus } from '@/types/bills';

// Create a Supabase client
const supabase = createClient();

// Bill Categories
export async function getBillCategories(): Promise<BillCategory[]> {
  const { data, error } = await supabase
    .from('bill_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching bill categories:', error);
    throw error;
  }

  return data || [];
}

// Bills
export async function getBills() {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      category:bill_categories(*)
    `)
    .order('next_due_date');

  if (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }

  return data || [];
}

export async function getBillById(id: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      category:bill_categories(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching bill:', error);
    throw error;
  }

  return data;
}

export async function createBill(bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('bills')
    .insert({
      ...bill,
      user_id: user.user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bill:', error);
    throw error;
  }

  return data;
}

export async function updateBill(id: string, bill: Partial<Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('bills')
    .update(bill)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bill:', error);
    throw error;
  }

  return data;
}

export async function deleteBill(id: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bill:', error);
    throw error;
  }

  return true;
}

// Bill Payments
export async function getBillPayments(billId?: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('bill_payments')
    .select(`
      *,
      bill:bills(*)
    `)
    .order('payment_date', { ascending: false });

  if (billId) {
    query = query.eq('bill_id', billId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bill payments:', error);
    throw error;
  }

  return data || [];
}

export async function createBillPayment(payment: Omit<BillPayment, 'id' | 'user_id' | 'created_at'>) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('bill_payments')
    .insert({
      ...payment,
      user_id: user.user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bill payment:', error);
    throw error;
  }

  return data;
}

// Bill Price Changes
export async function getBillPriceChanges(billId?: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('bill_price_changes')
    .select(`
      *,
      bill:bills(*)
    `)
    .order('changed_at', { ascending: false });

  if (billId) {
    query = query.eq('bill_id', billId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bill price changes:', error);
    throw error;
  }

  return data || [];
}

// Utility functions
export function getNextDueDate(frequency: BillFrequency, startDate: Date = new Date()): Date {
  const date = new Date(startDate);
  
  switch (frequency) {
    case 'once':
      return date;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      return date;
    case 'bi_weekly':
      date.setDate(date.getDate() + 14);
      return date;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      return date;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      return date;
    case 'semi_annual':
      date.setMonth(date.getMonth() + 6);
      return date;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      return date;
    default:
      return date;
  }
}

export function formatFrequency(frequency: BillFrequency): string {
  switch (frequency) {
    case 'once':
      return 'One-time';
    case 'weekly':
      return 'Weekly';
    case 'bi_weekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'semi_annual':
      return 'Semi-annual';
    case 'annual':
      return 'Annual';
    default:
      return frequency;
  }
}
