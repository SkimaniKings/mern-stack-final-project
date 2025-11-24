// Basic test script to verify Node.js execution
console.log('Basic test script running...');
console.log('Current directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test file system access
const fs = require('fs');
const path = require('path');

// Check if we can read the current directory
try {
  const files = fs.readdirSync('.');
  console.log('\nFiles in current directory:');
  console.log('--------------------------');
  console.log(files.join('\n'));
  console.log('--------------------------');
} catch (error) {
  console.error('Error reading directory:', error.message);
}

// Test writing to a file
try {
  const testFilePath = path.join(__dirname, 'test-file.txt');
  fs.writeFileSync(testFilePath, 'Test content');
  console.log('\nSuccessfully wrote to test file');
  fs.unlinkSync(testFilePath); // Clean up
} catch (error) {
  console.error('Error writing test file:', error.message);
}

console.log('\nBasic test completed successfully!');
