const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
  console.log('Connecting to database...');
  
  // Get database connection details from environment variables
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL or SUPABASE_DB_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    
    // Check if expenses table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('Expenses table does not exist in the database');
      return;
    }
    
    console.log('\n=== Expenses Table Columns ===');
    
    // Get column information
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'expenses'
      ORDER BY ordinal_position;
    `);
    
    console.table(columns.rows);
    
    // Check for specific columns
    const requiredColumns = ['latitude', 'longitude', 'is_split', 'split_ratio', 'split_with_user_id', 'category_ids', 'expense_id'];
    const missingColumns = [];

    for (const col of requiredColumns) {
      const exists = columns.rows.some(c => c.column_name === col);
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
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
