-- Function to create a default user in both auth.users and public.users tables if it doesn't exist
CREATE OR REPLACE FUNCTION create_default_user()
RETURNS void AS $$
DECLARE
    default_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Check if the default user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = default_user_id) THEN
        -- Insert the default user into auth.users
        BEGIN
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
            VALUES (
                default_user_id,
                'default@example.com',
                '$2a$10$abcdefghijklmnopqrstuvwxyz123456789',  -- Dummy hashed password
                NOW(),
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Default user created successfully in auth.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating default user in auth.users: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Default user already exists in auth.users';
    END IF;
    
    -- Also ensure the user exists in public.users table (for foreign key constraints)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = default_user_id) THEN
        -- Insert the default user into public.users
        BEGIN
            INSERT INTO public.users (id, email, created_at, updated_at)
            VALUES (
                default_user_id,
                'default@example.com',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Default user created successfully in public.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating default user in public.users: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Default user already exists in public.users';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
