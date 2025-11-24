// Simple Supabase connection test
console.log('Starting Supabase connection test...');

// Import required modules
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase URL or API key in environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '*** URL set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '*** Key set' : 'Not set');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('Supabase URL:', supabaseUrl);
console.log('API Key:', supabaseKey.substring(0, 10) + '...');

// Initialize Supabase client
try {
  console.log('\nInitializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  console.log('✅ Supabase client initialized');
  
  // Test a simple query
  console.log('\nTesting database connection...');
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('❌ Error executing query:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  } else {
    console.log('✅ Successfully connected to Supabase!');
    console.log('Sample data:', data);
  }
  
} catch (error) {
  console.error('❌ Error initializing Supabase client:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
}

console.log('\nTest completed.');
