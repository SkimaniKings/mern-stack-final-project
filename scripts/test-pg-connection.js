// Test database connection using pg
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

console.log('Starting PostgreSQL connection test...');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

console.log('Using database URL:', databaseUrl.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@'));

// Create a new client
const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
async function testConnection() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database!');
    
    // Run a simple query
    console.log('Running test query...');
    const res = await client.query('SELECT NOW() as current_time');
    console.log('Current database time:', res.rows[0].current_time);
    
    // Check if expenses table exists
    console.log('Checking for expenses table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
      );
    `);
    
    console.log('Expenses table exists:', tableCheck.rows[0].exists);
    
    // If table exists, get column info
    if (tableCheck.rows[0].exists) {
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'expenses';
      `);
      
      console.log('\nExpenses table columns:');
      console.table(columns.rows);
    }
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    // Close the connection
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
