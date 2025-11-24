// Debug script for Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Create a log file for debugging
const logFile = path.join(__dirname, 'debug-supabase.log');

function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(logFile, logMessage);
}

// Clear the log file
fs.writeFileSync(logFile, `=== Supabase Debug Log - ${new Date().toISOString()} ===\n\n`);

log('Starting Supabase debug script...');

// Read .env.local file directly
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  log('Successfully read .env.local file');
} catch (error) {
  log('Error reading .env.local file:', { message: error.message });
  process.exit(1);
}

// Parse the required environment variables
function getEnvVar(name) {
  const match = envContent.match(new RegExp(`${name}=([^\s]+)`));
  return match ? match[1] : null;
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

log('Environment variables:', {
  supabaseUrl: supabaseUrl ? '*** URL found (hidden for security)' : 'Not found',
  supabaseKey: supabaseKey ? '*** Key found (hidden for security)' : 'Not found'
});

if (!supabaseUrl || !supabaseKey) {
  log('Error: Missing Supabase URL or API key in .env.local');
  process.exit(1);
}

log('Initializing Supabase client...');

// Initialize Supabase client with debug logging
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'x-client-info': 'debug-script'
    }
  }
});

// Test function
async function testSupabase() {
  try {
    log('Testing Supabase connection with a simple query...');
    
    const { data, error, status, statusText } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
    
    log('Query result:', {
      status,
      statusText,
      error: error ? error.message : 'No error',
      data: data ? `Received ${data.length} rows` : 'No data'
    });
    
    if (error) {
      log('Query error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }
    
    log('Successfully connected to Supabase!');
    return true;
  } catch (error) {
    log('Supabase test failed:', {
      name: error?.name || 'UnknownError',
      message: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace'
    });
    return false;
  }
}

// Run the test
testSupabase()
  .then(success => {
    const result = success ? 'SUCCESS' : 'FAILED';
    log(`Test completed: ${result}`);
    console.log(`\nTest completed: ${result}`);
    console.log(`Check ${logFile} for detailed logs.`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log('Unhandled error in test:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });
