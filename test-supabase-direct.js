// Simple test to verify Supabase connection with direct URL check
const fs = require('fs');
const path = require('path');
const https = require('https');

// Output file for test results
const outputFile = path.join(__dirname, 'supabase-test-direct.txt');

// Log function to write to file
function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(outputFile, logMessage);
  console.log(logMessage);
}

// Clear the output file
fs.writeFileSync(outputFile, `=== Supabase Direct Test - ${new Date().toISOString()} ===\n\n`);

log('Starting Supabase direct test...');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
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

// Get Supabase URL and key
let supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

log('Environment variables:', {
  supabaseUrl: supabaseUrl ? '*** URL found' : 'Not found',
  supabaseKey: supabaseKey ? '*** Key found' : 'Not found'
});

if (!supabaseUrl || !supabaseKey) {
  log('Error: Missing Supabase URL or API key in .env.local');
  process.exit(1);
}

// Ensure the URL has a protocol
if (!supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
  log('Added https:// to Supabase URL:', { supabaseUrl });
}

// Test the Supabase REST API
log('Testing Supabase REST API...');

// Parse the URL
let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
  log('URL parsed successfully:', {
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || '(default)',
    pathname: parsedUrl.pathname
  });
} catch (error) {
  log('Error parsing Supabase URL:', {
    url: supabaseUrl,
    error: error.message
  });
  process.exit(1);
}

// Make a request to the Supabase REST API
const options = {
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || 443,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  },
  rejectUnauthorized: false, // For testing only
  timeout: 10000
};

log('Making request to Supabase REST API...', {
  hostname: options.hostname,
  port: options.port,
  path: options.path
});

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    log('Response received:', {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
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
    code: error.code,
    stack: error.stack
  });  
  process.exit(1);
});

req.on('timeout', () => {
  log('Request timed out');
  req.destroy();
  process.exit(1);
});

// Set a timeout for the entire script
setTimeout(() => {
  log('Test timed out after 10 seconds');
  process.exit(1);
}, 10000);

// Send the request
log('Sending request...');
req.end();
