-- Function to create a user in the auth.users table if it doesn't exist
CREATE OR REPLACE FUNCTION create_user_if_not_exists(
  user_id UUID,
  email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if the user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Insert the user
    BEGIN
      INSERT INTO auth.users (
        id, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        created_at, 
        updated_at
      )
      VALUES (
        user_id,
        email,
        '$2a$10$abcdefghijklmnopqrstuvwxyz123456789',  -- Dummy hashed password
        NOW(),
        NOW(),
        NOW()
      );
      RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating user: %', SQLERRM;
      RETURN FALSE;
    END;
  ELSE
    -- User already exists
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
