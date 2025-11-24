// Simple test to verify Node.js execution and file writing
const fs = require('fs');
const path = require('path');

// Get the directory of the current script
const scriptDir = __dirname;
const outputFile = path.join(scriptDir, 'test-output.txt');

// Test data
const testData = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    TEST_VAR: process.env.TEST_VAR || 'not set'
  },
  message: 'This is a test message from test-output.js'
};

// Write test data to file
try {
  fs.writeFileSync(outputFile, JSON.stringify(testData, null, 2));
  console.log(`Test data written to: ${outputFile}`);
} catch (error) {
  console.error('Error writing test file:', error);
  process.exit(1);
}
