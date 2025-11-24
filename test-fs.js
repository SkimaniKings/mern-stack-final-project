// Simple script to test filesystem access
const fs = require('fs');
const path = require('path');

console.log('=== Filesystem Access Test ===\n');

// Test 1: Check current working directory
console.log('Current working directory:');
console.log(process.cwd());
console.log('');

// Test 2: List files in current directory
try {
  console.log('Files in current directory:');
  const files = fs.readdirSync('.');
  console.log(files.join('\n'));
} catch (error) {
  console.error('Error listing directory:', error.message);
}

// Test 3: Try to create a test file
const testFilePath = path.join(__dirname, 'test-write.txt');
try {
  console.log(`\nAttempting to write to: ${testFilePath}`);
  fs.writeFileSync(testFilePath, 'This is a test file created at ' + new Date().toISOString());
  console.log('✅ Successfully wrote to test file');
  
  // Try to read it back
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('File content:', content);
  
  // Clean up
  fs.unlinkSync(testFilePath);
  console.log('✅ Cleaned up test file');
  
} catch (error) {
  console.error('❌ Error writing test file:', error.message);
  console.error('Error details:', {
    code: error.code,
    path: error.path,
    syscall: error.syscall,
    errno: error.errno
  });
}

// Test 4: Check .env.local file
const envPath = path.join(__dirname, '.env.local');
console.log(`\nChecking for .env.local at: ${envPath}`);

try {
  const exists = fs.existsSync(envPath);
  console.log(`.env.local exists: ${exists ? '✅ Yes' : '❌ No'}`);
  
  if (exists) {
    const stats = fs.statSync(envPath);
    console.log(`File size: ${stats.size} bytes`);
    console.log(`Last modified: ${stats.mtime}`);
    
    // Try to read first 100 characters
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      console.log('\nFirst 100 characters of .env.local:');
      console.log('----------------------------------------');
      console.log(content.substring(0, 100) + (content.length > 100 ? '...' : ''));
      console.log('----------------------------------------');
    } catch (readError) {
      console.error('Error reading .env.local:', readError.message);
    }
  }
  
} catch (error) {
  console.error('Error checking .env.local:', error.message);
}

console.log('\n=== Test Complete ===');
