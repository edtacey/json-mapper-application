#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Starting Smart Build Process...\n');

// Function to execute commands with error handling
function exec(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(`❌ Error executing: ${command}`);
    return false;
  }
}

// 1. Install dependencies if needed
console.log('📦 Checking dependencies...');
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('Installing backend dependencies...');
  exec('npm install');
}

if (!fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'))) {
  console.log('Installing frontend dependencies...');
  exec('npm install', { cwd: path.join(__dirname, 'frontend') });
}

// 2. Type check
console.log('\n📝 Running TypeScript checks...');
const backendTypeCheck = exec('npx tsc --noEmit');
const frontendTypeCheck = exec('npx tsc --noEmit', { cwd: path.join(__dirname, 'frontend') });

if (!backendTypeCheck || !frontendTypeCheck) {
  console.log('\n⚠️  TypeScript errors detected. Attempting to build anyway...');
}

// 3. Build backend
console.log('\n🏗️  Building backend...');
if (!exec('npm run build:backend')) {
  console.error('Backend build failed!');
  process.exit(1);
}

// 4. Build frontend
console.log('\n🎨 Building frontend...');
if (!exec('npm run build:frontend')) {
  console.error('Frontend build failed!');
  process.exit(1);
}

// 5. Verify build outputs
console.log('\n✅ Verifying build outputs...');
const checks = [
  { path: 'dist', name: 'Backend dist' },
  { path: 'frontend/dist', name: 'Frontend dist' },
  { path: 'frontend/dist/index.html', name: 'Frontend HTML' }
];

let allGood = true;
for (const check of checks) {
  if (fs.existsSync(path.join(__dirname, check.path))) {
    console.log(`✓ ${check.name} exists`);
  } else {
    console.error(`✗ ${check.name} missing!`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\n🎉 Build completed successfully!');
  console.log('\nTo start the application:');
  console.log('  npm start');
  console.log('\nOr for development:');
  console.log('  npm run dev');
} else {
  console.error('\n❌ Build completed with errors.');
  process.exit(1);
}
