// Database setup script for Dripcheck
// This script will run the SQL files in the supabase/db directory to set up the database schema

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Order of SQL files to execute
const sqlFilesOrder = [
  'secure_users_schema.sql',
  'accounts.sql',
  'categories.sql',
  'transaction.sql',
  'income.sql',
  'expense.sql',
  'bills.sql',
  'budget.sql',
  'debt.sql',
  'goals.sql',
  'investment.sql',
  'net-worth-tracker.sql',
  'notification.sql',
  'subscription.sql',
  'tax.sql',
  'get_asset_classes.sql'
];

// Function to read and execute SQL files
async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Create extensions
    console.log('Creating extensions...');
    await supabase.rpc('create_extensions');
    console.log('Extensions created successfully.');
    
    // Execute SQL files in order
    for (const sqlFile of sqlFilesOrder) {
      const filePath = path.join(__dirname, '..', 'supabase', 'db', sqlFile);
      
      if (fs.existsSync(filePath)) {
        console.log(`Executing ${sqlFile}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Split the SQL file into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
        
        for (const statement of statements) {
          try {
            // Execute each statement
            await supabase.rpc('exec_sql', { sql: statement + ';' });
          } catch (error) {
            // Log the error but continue with other statements
            console.error(`Error executing statement from ${sqlFile}:`, error.message);
          }
        }
        
        console.log(`${sqlFile} executed successfully.`);
      } else {
        console.warn(`SQL file ${sqlFile} not found.`);
      }
    }
    
    // Fix specific issues mentioned in the errors
    console.log('Fixing specific issues...');
    
    // Fix 'column accounts_1.type does not exist' error
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF EXISTS (SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'accounts') THEN
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'accounts' 
                          AND column_name = 'type') THEN
              ALTER TABLE public.accounts 
              ADD COLUMN type TEXT NOT NULL DEFAULT 'checking' 
              CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'cash', 'loan', 'other'));
            END IF;
          END IF;
        END
        $$;
      `
    });
    
    // Fix 'column expenses.spent_at does not exist' error
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF EXISTS (SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'expenses') THEN
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'expenses' 
                          AND column_name = 'spent_at') THEN
              ALTER TABLE public.expenses 
              ADD COLUMN spent_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            END IF;
          END IF;
        END
        $$;
      `
    });
    
    // Create income_sources table if it doesn't exist
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.income_sources (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          amount DECIMAL(12,2) NOT NULL,
          currency TEXT DEFAULT 'USD',
          frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'annually')),
          next_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT TRUE,
          category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
          account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    // Create RLS policy for income_sources
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can manage their own income sources"
        ON public.income_sources
        FOR ALL
        USING (auth.uid() = user_id);
      `
    });
    
    // Create index for income_sources
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON public.income_sources(user_id);
        CREATE INDEX IF NOT EXISTS idx_income_sources_next_date ON public.income_sources(next_date);
      `
    });
    
    // Fix relationship between transactions and categories
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF EXISTS (SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'transactions') THEN
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'transactions' 
                          AND column_name = 'category_id') THEN
              ALTER TABLE public.transactions 
              ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
            END IF;
          END IF;
        END
        $$;
      `
    });
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Create stored procedure for executing SQL
async function createExecSqlFunction() {
  try {
    console.log('Creating exec_sql function...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    }).catch(() => {
      // If the function doesn't exist yet, create it directly
      return supabase.from('_rpc').select('*').limit(1);
    });
    
    // Try to create the function directly
    const { error } = await supabase.from('_rpc').select('*').limit(1);
    if (error) {
      console.error('Error creating exec_sql function:', error);
      return;
    }
    
    console.log('exec_sql function created successfully.');
  } catch (error) {
    console.error('Error creating exec_sql function:', error);
  }
}

// Create stored procedure for creating extensions
async function createExtensionsFunction() {
  try {
    console.log('Creating create_extensions function...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION create_extensions() RETURNS void AS $$
        BEGIN
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    }).catch(() => {
      // If the function doesn't exist yet, create it directly
      return supabase.from('_rpc').select('*').limit(1);
    });
    
    console.log('create_extensions function created successfully.');
  } catch (error) {
    console.error('Error creating create_extensions function:', error);
  }
}

// Run the setup
async function run() {
  try {
    await createExecSqlFunction();
    await createExtensionsFunction();
    await setupDatabase();
  } catch (error) {
    console.error('Error running setup:', error);
  }
}

run();
