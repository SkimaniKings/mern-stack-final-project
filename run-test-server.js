// Script to run test server and display output
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const SERVER_PORT = 3001;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

console.log('Starting test server...');

// Start the test server
const serverProcess = spawn('node', ['test-server.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data}`);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Function to test the server
function testServer() {
  console.log('\nTesting server connection...');
  
  const req = http.get(SERVER_URL, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Server response:');
        console.log(JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('Raw response:');
        console.log(data);
      }
      
      // Stop the server after getting a response
      console.log('\nStopping server...');
      serverProcess.kill();
    });
  });
  
  req.on('error', (error) => {
    console.error('Error connecting to server:', error.message);
    serverProcess.kill();
    process.exit(1);
  });
  
  // Set a timeout for the request
  req.setTimeout(5000, () => {
    console.error('Request timed out');
    req.destroy();
    serverProcess.kill();
    process.exit(1);
  });
}

// Wait a bit for the server to start, then test it
setTimeout(testServer, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  serverProcess.kill();
  process.exit(0);
});
