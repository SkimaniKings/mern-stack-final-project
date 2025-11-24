// Simple file system test using direct Node.js APIs
const fs = require('fs');
const path = require('path');

console.log('Starting file system test...');

// Define test file path
const testFilePath = path.join(__dirname, 'test-fs-output.txt');
const testContent = `File system test at ${new Date().toISOString()}
Node.js Version: ${process.version}
Platform: ${process.platform}
Architecture: ${process.arch}
`;

try {
  // Write to file
  console.log(`Writing to ${testFilePath}...`);
  fs.writeFileSync(testFilePath, testContent);
  console.log('Successfully wrote to file');
  
  // Read from file
  console.log('Reading from file...');
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('File content:');
  console.log(content);
  
  // Delete the test file
  fs.unlinkSync(testFilePath);
  console.log('Test file cleaned up');
  
  console.log('File system test completed successfully');
} catch (error) {
  console.error('File system test failed:', {
    name: error.name,
    message: error.message,
    code: error.code,
    path: error.path,
    syscall: error.syscall,
    stack: error.stack
  });
  
  // Try to get directory listing
  try {
    console.log('\nTrying to list directory contents...');
    const files = fs.readdirSync(__dirname);
    console.log(`Directory contains ${files.length} items`);
    console.log('First 10 items:', files.slice(0, 10).join(', '));
  } catch (dirError) {
    console.error('Failed to list directory:', dirError.message);
  }
  
  process.exit(1);
}
