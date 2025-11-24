-- Create a secure function to create user profiles
-- This function will be used during registration to create a user profile
-- It bypasses RLS because it's a database function

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_username TEXT,
  user_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This is important - it means the function runs with the privileges of the creator
SET search_path = public
AS $$
BEGIN
  -- Insert the user profile
  INSERT INTO public.users (
    id,
    username,
    email,
    full_name,
    is_email_verified,
    mfa_enabled,
    is_biometrics_enabled,
    suspicious_login_flag,
    session_timeout_minutes,
    emergency_access_enabled,
    has_consented,
    privacy_level,
    local_data_only,
    allow_data_analysis,
    data_retention_policy,
    locale,
    currency_code,
    timezone,
    theme,
    date_format,
    notification_preferences,
    onboarding_completed,
    user_role,
    permission_scope,
    marketing_opt_in,
    last_login_at,
    last_active_at
  ) VALUES (
    user_id,
    user_username,
    user_email,
    user_full_name,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    30,
    FALSE,
    FALSE,
    'standard',
    FALSE,
    TRUE,
    '1y',
    'en-US',
    'USD',
    'UTC',
    'system',
    'YYYY-MM-DD',
    '{}'::jsonb,
    FALSE,
    'user',
    '{}'::jsonb,
    FALSE,
    NOW(),
    NOW()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username TEXT;
BEGIN
  -- Generate a username based on email
  username := split_part(NEW.email, '@', 1) || floor(random() * 1000)::text;
  
  -- Create the user profile
  PERFORM public.create_user_profile(
    NEW.id,
    NEW.email,
    username,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
