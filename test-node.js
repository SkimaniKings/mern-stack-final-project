// Simple test script to verify Node.js execution
console.log('=== Node.js Test Script ===');
console.log('Current time:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test environment variables
console.log('\nEnvironment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('NEXT_PUBLIC_SUPABASE_URL:', 
  process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? '*** URL is set' 
    : 'not set');

// Test file system access
const fs = require('fs');
const path = require('path');

try {
  const testFilePath = path.join(__dirname, 'test-node-output.txt');
  fs.writeFileSync(testFilePath, 'Test file created at ' + new Date().toISOString());
  
  if (fs.existsSync(testFilePath)) {
    console.log('\n✅ Successfully created and verified test file');
    fs.unlinkSync(testFilePath);
  } else {
    console.log('\n❌ Failed to verify test file creation');
  }
} catch (error) {
  console.error('\n❌ File system error:', error.message);
}

// Test HTTP request
console.log('\nTesting HTTP request...');
const https = require('https');

const req = https.get('https://httpbin.org/get', (res) => {
  console.log('HTTP Response Status Code:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Successfully received and parsed JSON response');
    } catch (e) {
      console.log('Received non-JSON response:', data.substring(0, 100));
    }
  });
});

req.on('error', (error) => {
  console.error('HTTP request failed:', error.message);
});

console.log('\nTest script completed.');
