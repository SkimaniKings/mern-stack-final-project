import { User as SupabaseUser } from "@supabase/supabase-js";

// Define our extended user type without extending SupabaseUser directly
export interface UserAttributes {
  // Extended properties from the secure user schema
  username?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'non-binary' | 'other' | 'prefer not to say';
  
  // Security & Auth Metadata
  is_email_verified?: boolean;
  mfa_enabled?: boolean;
  mfa_type?: string;
  is_biometrics_enabled?: boolean;
  biometric_type?: string;
  suspicious_login_flag?: boolean;
  last_login_at?: string;
  session_timeout_minutes?: number;
  
  // Emergency Access
  emergency_access_enabled?: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Privacy & Consent
  has_consented?: boolean;
  consent_updated_at?: string;
  privacy_level?: 'standard' | 'strict' | 'paranoid';
  local_data_only?: boolean;
  allow_data_analysis?: boolean;
  data_retention_policy?: string;
  
  // Localization & Preferences
  locale?: string;
  currency_code?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  date_format?: string;
  notification_preferences?: Record<string, any>;
  
  // Onboarding
  onboarding_completed?: boolean;
  onboarding_step?: string;
  
  // Roles & Access Control
  user_role?: 'user' | 'admin' | 'coach' | 'viewer';
  permission_scope?: Record<string, any>;
  
  // Metadata
  referral_code?: string;
  signup_source?: string;
  marketing_opt_in?: boolean;
  last_active_at?: string;
  
  // Audit Fields
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Combine SupabaseUser with our UserAttributes
export type User = SupabaseUser & {
  user_metadata: UserAttributes & Record<string, any>;
};

export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  user_role: string;
  theme: string;
  currency_code: string;
  timezone: string;
  onboarding_completed: boolean;
}

export interface UserSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  currency_code: string;
  timezone: string;
  date_format: string;
  notification_preferences: Record<string, any>;
  privacy_level: 'standard' | 'strict' | 'paranoid';
  local_data_only: boolean;
  allow_data_analysis: boolean;
  session_timeout_minutes: number;
}
