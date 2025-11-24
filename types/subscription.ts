export type SubscriptionRecurrence = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'yearly';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export type SubscriptionCategory = 
  'entertainment' | 
  'utilities' | 
  'software' | 
  'health' | 
  'education' | 
  'food' | 
  'transportation' | 
  'housing' | 
  'insurance' | 
  'investments' | 
  'streaming' | 
  'gaming' | 
  'music' | 
  'news' | 
  'shopping' | 
  'fitness' | 
  'productivity' | 
  'cloud_storage' | 
  'communication' | 
  'finance' | 
  'security' | 
  'other';

export interface SubscriptionCategoryInfo {
  id: string;
  name: SubscriptionCategory;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  service_provider: string | null;
  description: string | null;
  category: SubscriptionCategory;
  amount: number;
  currency: string;
  recurrence: SubscriptionRecurrence;
  frequency?: SubscriptionRecurrence; // New field for compatibility with form data
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  roi_expected: number | null;
  roi_actual: number | null;
  roi_notes: string | null;
  created_at: string;
  updated_at: string;
  next_renewal_date?: string; // Optional property for the next renewal date
  client_side?: boolean; // Flag to indicate if this is a client-side only subscription
  usage_rating?: number | null; // Usage rating from 0-10
  vendor?: string | null; // Alternative name for service_provider
  notes?: string | null; // General notes
  cancel_url?: string | null; // URL to cancel subscription
  support_contact?: string | null; // Contact info for support
  status?: SubscriptionStatus; // Active, paused, or cancelled
  auto_renew?: boolean; // Whether subscription auto-renews
  last_renewed_at?: string; // Date of last renewal
}

export interface SubscriptionFormData {
  name: string;
  service_provider: string | null;
  description: string | null;
  category: SubscriptionCategory;
  amount: number;
  currency: string;
  recurrence: SubscriptionRecurrence;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  roi_expected: number | null;
  roi_notes: string | null;
}

export interface SubscriptionUsageLog {
  id: string;
  subscription_id: string;
  user_id: string;
  used_on: string;
  note: string | null;
  created_at: string;
  subscription_name?: string; // Name of the subscription
  service_provider?: string | null; // Provider of the subscription
}

export interface SubscriptionPriceChange {
  id: string;
  subscription_id: string;
  old_amount: number;
  new_amount: number;
  changed_at: string;
  reason: string | null;
}

export interface OverlappingSubscription {
  overlapping_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
}

export interface ROICalculation {
  subscription_id: string;
  total_cost: number;
  expected_return: number;
  actual_return: number | null;
  roi_percentage: number;
  roi_ratio: number;
  monthly_cost: number;
  annual_cost: number;
  break_even_months: number | null;
}

export interface PotentialDuplicateSubscription {
  id: string;
  user_id: string;
  category: string;
  subscriptions: Subscription[];
  reason: string;
  recommendation: string;
  created_at: string;
}
