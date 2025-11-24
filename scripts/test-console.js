// Simple test to verify console output
console.log('Test script started at:', new Date().toISOString());

// Test different console methods
console.log('This is a log message');
console.warn('This is a warning message');
console.error('This is an error message');

// Test object logging
console.log('Object test:', { key: 'value', number: 42, bool: true });

// Test error with stack trace
console.error('Error with stack trace:', new Error('Test error'));

// Test async operation
setTimeout(() => {
  console.log('Async operation completed at:', new Date().toISOString());
  console.log('Test script completed successfully');
}, 1000);
