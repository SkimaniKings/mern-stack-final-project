// Final test script with detailed environment checks
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Output file for detailed logging
const logFile = path.join(__dirname, 'final-test-log.txt');

// Clear the log file
fs.writeFileSync(logFile, `=== Final Test - ${new Date().toISOString()} ===\n\n`);

// Log function
function log(message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(logEntry);
}

log('Starting final test...');

// 1. Check .env.local file
const envPath = path.join(__dirname, '.env.local');
log(`Checking for .env.local at: ${envPath}`);

let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
  log('Successfully read .env.local');
  
  // Log a preview of the content (without sensitive data)
  const preview = envContent
    .split('\n')
    .map(line => {
      if (line.includes('KEY') || line.includes('SECRET') || line.includes('PASSWORD')) {
        return line.split('=')[0] + '=***';
      }
      return line;
    })
    .join('\n');
    
  log('Environment variables preview:', { preview });
  
} catch (error) {
  log('❌ Error reading .env.local:', {
    message: error.message,
    code: error.code
  });
  process.exit(1);
}

// 2. Load environment variables
log('Loading environment variables...');
dotenv.config({ path: envPath });

// 3. Check required variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = [];
const envVars = {};

requiredVars.forEach(varName => {
  const value = process.env[varName];
  envVars[varName] = value ? '***' : 'MISSING';
  
  if (!value) {
    missingVars.push(varName);
  }
});

log('Environment variables status:', envVars);

if (missingVars.length > 0) {
  log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  log('Please check your .env.local file and ensure all required variables are set.');
  process.exit(1);
}

log('✅ All required environment variables are present');

// 4. Test Supabase connection
log('\nTesting Supabase connection...');

try {
  // createClient is already imported at the top
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  log('Initializing Supabase client...', {
    url: supabaseUrl,
    key: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'undefined'
  });
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  
  log('Supabase client initialized');
  
  // Test a simple query
  log('Testing database connection...');
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .limit(1);
    
  if (error) {
    log('❌ Error querying database:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
  } else {
    log('✅ Successfully connected to Supabase!');
    log('Sample data:', data);
  }
  
} catch (error) {
  log('❌ Error initializing Supabase client:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
}

log('\nTest completed. Check the log file for details.');
log(`Log file: ${logFile}`);
