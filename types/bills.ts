export type BillFrequency = 'once' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export type BillStatus = 'unpaid' | 'paid' | 'overdue' | 'cancelled';

export interface BillCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount_due: number;
  currency: string;
  frequency: BillFrequency;
  next_due_date: string;
  category_id: string | null;
  is_automatic: boolean;
  status: BillStatus;
  last_paid_date: string | null;
  reminder_days: number;
  expected_payment_account: string | null;
  vendor: string | null;
  created_at: string;
  updated_at: string;
  category?: BillCategory; // Optional joined field
}

export interface BillPayment {
  id: string;
  bill_id: string;
  user_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string | null;
  note: string | null;
  created_at: string;
  bill?: Bill; // Optional joined field
}

export interface BillPriceChange {
  id: string;
  bill_id: string;
  old_amount: number;
  new_amount: number;
  changed_at: string;
  reason: string | null;
  bill?: Bill; // Optional joined field
}
