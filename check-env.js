// Simple script to check environment variables and test Supabase connection
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Output file for test results
const outputFile = path.join(__dirname, 'env-check-result.txt');

// Log function to write to file and console
function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(outputFile, logMessage);
  console.log(logMessage);
}

// Clear the output file
fs.writeFileSync(outputFile, `=== Environment Check - ${new Date().toISOString()} ===\n\n`);

log('Starting environment check...');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  log('❌ Error: .env.local file not found');
  process.exit(1);
}

// Load environment variables from .env.local
require('dotenv').config({ path: envPath });
log('✅ .env.local file loaded');

// Check required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL'
];

log('Checking required environment variables...');

let allVarsPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = value !== undefined && value !== '';
  
  log(`${isPresent ? '✅' : '❌'} ${varName}: ${isPresent ? 'Present' : 'Missing'}`);
  
  if (!isPresent) {
    allVarsPresent = false;
  }
});

if (!allVarsPresent) {
  log('❌ Some required environment variables are missing');
  process.exit(1);
}

log('✅ All required environment variables are present');

// Test Supabase connection
log('\nTesting Supabase connection...');

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  log('Initializing Supabase client with:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
    key: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'undefined'
  });
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  
  log('Supabase client initialized, testing connection...');
  
  // Test a simple query
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .limit(1);
    
  if (error) {
    log('❌ Supabase query failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  } else {
    log('✅ Successfully connected to Supabase!');
    log(`Retrieved ${data.length} expense records`);
  }
  
} catch (error) {
  log('❌ Error initializing Supabase client:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
}

log('\nEnvironment check completed. Check the logs above for any issues.');
