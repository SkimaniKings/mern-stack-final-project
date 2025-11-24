// Test Supabase client connection with enhanced error handling
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('Starting Supabase client test...');

// Log environment variables for debugging
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HAS_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  HAS_SUPABASE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  HAS_DATABASE_URL: !!process.env.DATABASE_URL
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or key in environment variables');
  process.exit(1);
}

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Test function to verify Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test a simple query
    console.log('Running test query...');
    const { data, error, status, statusText } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
    
    console.log('Query result:', {
      status,
      statusText,
      error: error ? error.message : 'No error',
      data: data ? `Received ${data.length} rows` : 'No data'
    });
    
    if (error) {
      console.error('Query error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }
    
    console.log('Successfully connected to Supabase!');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', {
      name: error?.name || 'UnknownError',
      message: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace'
    });
    return false;
  }
}

// Run the test
testSupabaseConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
