// Simple database connection test
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

console.log('Starting database connection test...');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set in environment variables');
  process.exit(1);
}

console.log('Using database URL:', databaseUrl.replace(/:([^:]*?)@/, ':****@'));

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
    console.log('Successfully connected to database!');
    
    // Run a simple query
    console.log('Running test query...');
    const res = await client.query('SELECT NOW() as current_time');
    console.log('Current database time:', res.rows[0].current_time);
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
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
