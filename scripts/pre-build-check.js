#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-build checks...\n');

const issues = [];

// Check for common React issues
const problemFiles = [
  {
    path: 'frontend/src/pages/EntityEditor.tsx',
    checks: [
      {
        pattern: /if\s*\(\s*isLoading\s*\)\s*{\s*return.*Loading/,
        fix: 'if (!isNew && isLoading) {',
        description: 'Loading state should only apply to existing entities'
      }
    ]
  }
];

for (const file of problemFiles) {
  const filePath = path.join(__dirname, '..', file.path);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const check of file.checks) {
      if (check.pattern.test(content)) {
        issues.push({
          file: file.path,
          issue: check.description,
          fix: check.fix
        });
      }
    }
  }
}

// Check for proper TypeScript configurations
const tsConfigs = [
  'tsconfig.json',
  'frontend/tsconfig.json'
];

for (const config of tsConfigs) {
  const configPath = path.join(__dirname, '..', config);
  if (!fs.existsSync(configPath)) {
    issues.push({
      file: config,
      issue: 'TypeScript config missing',
      fix: 'Create appropriate tsconfig.json'
    });
  }
}

// Check for environment variables
if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
  console.warn('⚠️  Warning: .env file not found. Using defaults.');
}

// Report issues
if (issues.length > 0) {
  console.log('⚠️  Found potential issues:\n');
  for (const issue of issues) {
    console.log(`File: ${issue.file}`);
    console.log(`Issue: ${issue.issue}`);
    console.log(`Fix: ${issue.fix}\n`);
  }
  
  console.log('Run "npm run fix" to auto-fix these issues.\n');
} else {
  console.log('✅ No common issues detected!\n');
}

process.exit(issues.length > 0 ? 1 : 0);
