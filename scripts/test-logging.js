// Simple test script to verify logging works
console.log('Test script started');
console.error('This is an error message');
console.warn('This is a warning message');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Test writing to a file
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'test-log.txt');
fs.writeFileSync(logFile, 'Test log content at ' + new Date().toISOString());
console.log('Wrote test log to:', logFile);

// Test reading the file back
try {
  const content = fs.readFileSync(logFile, 'utf8');
  console.log('File content:', content);
} catch (error) {
  console.error('Error reading file:', error.message);
}

console.log('Test script completed');
