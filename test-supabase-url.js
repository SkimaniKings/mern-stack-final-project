// Test Supabase URL and connection with minimal dependencies
const fs = require('fs');
const path = require('path');

// Output file for test results
const outputFile = path.join(__dirname, 'supabase-url-test.txt');

// Log function to write to file
function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(outputFile, logMessage);
  console.log(logMessage);
}

// Clear the output file
fs.writeFileSync(outputFile, `=== Supabase URL Test - ${new Date().toISOString()} ===\n\n`);

log('Starting Supabase URL test...');

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

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

log('Environment variables:', {
  supabaseUrl: supabaseUrl ? '*** URL found' : 'Not found',
  supabaseKey: supabaseKey ? '*** Key found' : 'Not found'
});

if (!supabaseUrl || !supabaseKey) {
  log('Error: Missing Supabase URL or API key in .env.local');
  process.exit(1);
}

// Test URL format
log('Testing Supabase URL format...');

try {
  const url = new URL(supabaseUrl);
  log('URL parsed successfully:', {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || '(default)',
    pathname: url.pathname
  });
  
  // Test making a simple HTTP request to the URL
  log('Testing connection to Supabase URL...');
  const https = require('https');
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
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
  
  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      log('Response received:', {
        statusCode: res.statusCode,
        headers: res.headers,
        data: data ? 'Response received (check console for details)' : 'No data'
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
  });
  
  req.on('timeout', () => {
    log('Request timed out');
    req.destroy();
  });
  
  req.end();
  
} catch (error) {
  log('Error testing Supabase URL:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
}
