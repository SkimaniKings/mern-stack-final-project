/**
 * Authentication Migration Script
 * 
 * This script helps migrate from the old authentication system to the new secure authentication system.
 * It performs the following tasks:
 * 1. Backs up existing auth files
 * 2. Copies new auth files to the appropriate locations
 * 3. Updates imports in relevant files
 * 
 * Usage: node scripts/migrate-auth.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const OLD_AUTH_DIR = path.join(ROOT_DIR, 'components', 'auth');
const NEW_AUTH_DIR = path.join(ROOT_DIR, 'components', 'auth', 'new-auth');
const BACKUP_DIR = path.join(ROOT_DIR, 'components', 'auth-backup-' + Date.now());

// Create backup directory
console.log('Creating backup directory...');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Backup existing auth files
console.log('Backing up existing auth files...');
const authFiles = fs.readdirSync(OLD_AUTH_DIR)
  .filter(file => file !== 'new-auth' && !fs.statSync(path.join(OLD_AUTH_DIR, file)).isDirectory());

authFiles.forEach(file => {
  const sourcePath = path.join(OLD_AUTH_DIR, file);
  const destPath = path.join(BACKUP_DIR, file);
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Backed up ${file}`);
});

// Copy new auth files to replace old ones
console.log('Copying new auth files...');
const newAuthFiles = [
  { source: 'auth-provider.tsx', dest: path.join(OLD_AUTH_DIR, 'auth-provider.tsx') },
  { source: 'auth-guard.tsx', dest: path.join(OLD_AUTH_DIR, 'auth-guard.tsx') },
  { source: 'login-form.tsx', dest: path.join(OLD_AUTH_DIR, 'auth-form.tsx') },
  { source: 'register-form.tsx', dest: path.join(OLD_AUTH_DIR, 'register-form.tsx') },
  { source: 'auth-types.ts', dest: path.join(OLD_AUTH_DIR, 'auth-types.ts') },
  { source: 'index.ts', dest: path.join(OLD_AUTH_DIR, 'index.ts') }
];

newAuthFiles.forEach(({ source, dest }) => {
  fs.copyFileSync(path.join(NEW_AUTH_DIR, source), dest);
  console.log(`Copied ${source} to ${path.basename(dest)}`);
});

console.log('\nMigration completed successfully!');
console.log(`Old auth files backed up to: ${BACKUP_DIR}`);
console.log('\nNext steps:');
console.log('1. Update imports in your app to use the new authentication components');
console.log('2. Test the authentication flow thoroughly');
console.log('3. Once everything is working, you can delete the new-auth directory');
