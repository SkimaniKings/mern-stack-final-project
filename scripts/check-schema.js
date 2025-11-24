const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  console.log('Checking database schema...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or key in environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  try {
    // Check if expenses table exists
    const { data: tableExists, error: tableError } = await supabase
      .rpc('table_exists', { table_name: 'expenses' });

    if (tableError || !tableExists) {
      console.error('Expenses table does not exist:', tableError?.message || 'Table not found');
      return;
    }

    console.log('\n=== Expenses Table Columns ===');
    
    // Get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'expenses')
      .order('ordinal_position');

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      return;
    }

    console.table(columns);

    // Check for specific columns
    const requiredColumns = ['latitude', 'longitude', 'is_split', 'split_ratio', 'split_with_user_id', 'category_ids', 'expense_id'];
    const missingColumns = [];

    for (const col of requiredColumns) {
      const exists = columns.some(c => c.column_name === col);
      console.log(`Column '${col}': ${exists ? '✅ Found' : '❌ Missing'}`);
      if (!exists) {
        missingColumns.push(col);
      }
    }

    if (missingColumns.length > 0) {
      console.log('\n❌ Some required columns are missing. Please apply the migrations again.');
      console.log('Missing columns:', missingColumns.join(', '));
    } else {
      console.log('\n✅ All required columns are present in the expenses table');
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

// Create the table_exists function if it doesn't exist
async function ensureTableExistsFunction(supabase) {
  const { error } = await supabase.rpc('table_exists', { table_name: 'test' }).catch(() => ({}));
  
  if (error) {
    console.log('Creating table_exists function...');
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION public.table_exists(table_name text)
      RETURNS boolean AS $$
      DECLARE
        result boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) INTO result;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`;

    await supabase.rpc('exec_sql', { query: createFunctionSql });
  }
}

checkSchema();
