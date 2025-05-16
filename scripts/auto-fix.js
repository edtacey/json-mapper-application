#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running auto-fix...\n');

const fixes = [
  {
    file: 'frontend/src/pages/EntityEditor.tsx',
    patterns: [
      {
        find: /if\s*\(\s*isLoading\s*\)\s*{\s*return\s*<div[^>]*>Loading\.\.\.<\/div>/,
        replace: 'if (!isNew && isLoading) {\n    return <div className="p-8 text-center">Loading...</div>',
        description: 'Fix loading state for new entities'
      }
    ]
  },
  {
    file: 'src/index.ts',
    patterns: [
      {
        find: /const PORT = parseInt\(process\.env\.PORT \|\| '3000', 10\);/,
        replace: 'const PORT = parseInt(process.env.PORT || \'3001\', 10);',
        description: 'Use port 3001 to avoid conflicts'
      }
    ]
  }
];

let fixCount = 0;

for (const fix of fixes) {
  const filePath = path.join(__dirname, '..', fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${fix.file}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const pattern of fix.patterns) {
    if (pattern.find.test(content)) {
      content = content.replace(pattern.find, pattern.replace);
      console.log(`✓ Fixed: ${pattern.description} in ${fix.file}`);
      modified = true;
      fixCount++;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log(`\n✅ Applied ${fixCount} fixes.`);

// Run type check after fixes
console.log('\n📝 Running type check...');
const { execSync } = require('child_process');
try {
  execSync('npm run type-check', { stdio: 'inherit' });
  console.log('✅ Type check passed!');
} catch (error) {
  console.warn('⚠️  Type check failed. Please review manually.');
}
