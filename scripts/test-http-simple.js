// Simple HTTP request test using Node's built-in http module
const https = require('https');
const fs = require('fs');
const path = require('path');

// Create a log file
const logFile = path.join(__dirname, 'http-test.log');
fs.writeFileSync(logFile, `HTTP Test Log - ${new Date().toISOString()}\n\n`);

function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(logFile, logMessage);
}

log('Starting HTTP test...');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  log('Successfully read .env.local file');
} catch (error) {
  log('Error reading .env.local file:', { message: error.message });
  process.exit(1);
}

// Parse environment variables
function getEnvVar(name) {
  const match = envContent.match(new RegExp(`${name}=([^\s]+)`));
  return match ? match[1] : null;
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  log('Error: Missing Supabase URL or API key in .env.local');
  process.exit(1);
}

log('Supabase URL found in .env.local');
log('Supabase API key found in .env.local');

// Make a simple HTTP request to Supabase REST API
const url = new URL('/rest/v1/expenses?select=*&limit=1', supabaseUrl);
log(`Making request to: ${url.toString()}`);

const options = {
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
};

const req = https.request(url, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    log('Response received', {
      statusCode: res.statusCode,
      headers: res.headers
    });
    
    try {
      const jsonData = JSON.parse(data);
      log('Response body (parsed):', jsonData);
    } catch (e) {
      log('Response body (raw):', data);
    }
    
    log('Test completed successfully');
  });
});

req.on('error', (error) => {
  log('Request error:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
});

req.on('timeout', () => {
  log('Request timed out');
  req.destroy();
});

// Set a timeout for the entire request
const timeout = setTimeout(() => {
  log('Test timed out after 30 seconds');
  process.exit(1);
}, 30000);

log('Sending request...');
req.end(() => {
  clearTimeout(timeout);
  log('Request sent');
});
