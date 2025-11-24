// Simple test to check file system access
const fs = require('fs');
const path = require('path');

console.log('Starting file write test...');

const testFilePath = path.join(__dirname, 'test-output.txt');
const testContent = `Test content generated at: ${new Date().toISOString()}\n`;

try {
  // Write to file
  fs.writeFileSync(testFilePath, testContent);
  console.log(`Successfully wrote to ${testFilePath}`);
  
  // Read back the file
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('File content:', content.trim());
  
  // Delete the test file
  fs.unlinkSync(testFilePath);
  console.log('Test file cleaned up');
  
  console.log('File system test completed successfully!');
} catch (error) {
  console.error('File system test failed:', error);
  process.exit(1);
}
