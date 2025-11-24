-- Function to create a subscription bypassing RLS
CREATE OR REPLACE FUNCTION create_subscription_bypass_rls(subscription_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This is important as it allows the function to bypass RLS
AS $$
DECLARE
  new_subscription JSONB;
BEGIN
  -- Insert the subscription data
  INSERT INTO subscriptions (
    name,
    vendor,
    description,
    category_id,
    amount,
    currency,
    frequency,
    next_renewal_date,
    auto_renew,
    status,
    usage_rating,
    notes,
    cancel_url,
    support_contact,
    user_id
  )
  VALUES (
    subscription_data->>'name',
    subscription_data->>'vendor',
    subscription_data->>'description',
    subscription_data->>'category_id',
    (subscription_data->>'amount')::numeric,
    subscription_data->>'currency',
    subscription_data->>'frequency',
    (subscription_data->>'next_renewal_date')::timestamp,
    (subscription_data->>'auto_renew')::boolean,
    subscription_data->>'status',
    (subscription_data->>'usage_rating')::integer,
    subscription_data->>'notes',
    subscription_data->>'cancel_url',
    subscription_data->>'support_contact',
    subscription_data->>'user_id'
  )
  RETURNING to_jsonb(subscriptions.*) INTO new_subscription;
  
  -- Return the newly created subscription
  RETURN new_subscription;
END;
$$;
