// Direct PostgreSQL connection test
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local file directly
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('Successfully read .env.local file');
} catch (error) {
  console.error('Error reading .env.local file:', error.message);
  process.exit(1);
}

// Parse the DATABASE_URL from the .env.local file
const dbUrlMatch = envContent.match(/DATABASE_URL=([^\s]+)/);

if (!dbUrlMatch) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const databaseUrl = dbUrlMatch[1];
console.log('Using DATABASE_URL:', databaseUrl.replace(/:([^:]*?)@/, ':****@'));

// Create a new client
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false } // Required for Supabase
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
