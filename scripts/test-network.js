// Simple network connectivity test
const https = require('https');

console.log('Starting network test at:', new Date().toISOString());

// Test connection to a public API
const testUrl = 'https://httpbin.org/get';
console.log(`Testing connection to ${testUrl}...`);

const req = https.get(testUrl, (res) => {
  let data = '';
  
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Response data (parsed):', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Response data (raw):', data);
    }
    console.log('Network test completed successfully');
  });
});

req.on('error', (error) => {
  console.error('Network error:', {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: error.stack
  });
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

// Set a timeout for the request
req.setTimeout(10000, () => {
  console.error('Request timed out after 10 seconds');
  req.destroy();
});
