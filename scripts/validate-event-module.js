#!/usr/bin/env node

/**
 * Event Module Validation Script
 * Checks for legacy field references and validates event module implementation
 */

const fs = require('fs');
const path = require('path');

const LEGACY_PATTERNS = [
  /schedule\.start/g,
  /schedule\.end/g,
  /event\.startDate/g,
  /event\.endDate/g,
  /\bstartDate:/g,
  /\bendDate:/g,
];

const REQUIRED_FIELDS = [
  'about',
  'sessions',
  'features',
  'coHostRequests',
  'waitlist',
  'verificationStatus',
  'audienceType',
  'socialLinks',
  'requirements',
];

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'coverage',
  'dist',
  'build',
  '.next',
];

const IGNORE_FILES = [
  'EVENT_MODULE_FINAL_FIXES.md',
  'validate-event-module.js',
  'package-lock.json',
  'yarn.lock',
];

let totalFiles = 0;
let issuesFound = 0;
const issues = [];

function shouldIgnore(filePath) {
  const parts = filePath.split(path.sep);
  return IGNORE_DIRS.some(dir => parts.includes(dir)) ||
         IGNORE_FILES.some(file => filePath.endsWith(file));
}

function checkFile(filePath) {
  if (shouldIgnore(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!['.js', '.jsx', '.ts', '.tsx', '.json'].includes(ext)) return;

  totalFiles++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for legacy patterns
    LEGACY_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            issues.push({
              file: filePath,
              line: index + 1,
              issue: `Legacy field reference: ${pattern}`,
              code: line.trim()
            });
            issuesFound++;
          }
        });
      }
    });

    // Special checks for Event model
    if (filePath.includes('Models/Event.js')) {
      const hasSchedule = /schedule:/g.test(content);
      if (hasSchedule) {
        issues.push({
          file: filePath,
          line: 0,
          issue: 'Event model contains "schedule" field',
          code: 'Check for schedule field definition'
        });
        issuesFound++;
      }

      REQUIRED_FIELDS.forEach(field => {
        const pattern = new RegExp(`\\b${field}:`);
        if (!pattern.test(content)) {
          issues.push({
            file: filePath,
            line: 0,
            issue: `Missing required field: ${field}`,
            code: 'Field should be defined in Event schema'
          });
          issuesFound++;
        }
      });
    }

    // Check for event controller
    if (filePath.includes('Controller/event.js')) {
      REQUIRED_FIELDS.forEach(field => {
        const pattern = new RegExp(`\\b${field}\\b`);
        if (!pattern.test(content)) {
          issues.push({
            file: filePath,
            line: 0,
            issue: `Field not handled in controller: ${field}`,
            code: 'Field should be handled in create/update'
          });
          issuesFound++;
        }
      });
    }

  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!shouldIgnore(fullPath)) {
        scanDirectory(fullPath);
      }
    } else {
      checkFile(fullPath);
    }
  });
}

// Main execution
console.log('🔍 Event Module Validation Script\n');
console.log('Scanning for legacy field references and validating implementation...\n');

const projectRoot = process.cwd();
const backendDir = path.join(projectRoot, 'Backend');
const frontendDir = path.join(projectRoot, 'Frontend');

if (fs.existsSync(backendDir)) {
  console.log('📁 Scanning Backend...');
  scanDirectory(backendDir);
}

if (fs.existsSync(frontendDir)) {
  console.log('📁 Scanning Frontend...');
  scanDirectory(frontendDir);
}

console.log(`\n✅ Scanned ${totalFiles} files\n`);

if (issuesFound === 0) {
  console.log('🎉 No issues found! Event module is clean.\n');
  console.log('✅ All legacy field references removed');
  console.log('✅ All required fields present');
  console.log('✅ Event module ready for deployment\n');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${issuesFound} issue(s):\n`);
  
  // Group issues by file
  const issuesByFile = {};
  issues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });

  Object.keys(issuesByFile).forEach(file => {
    console.log(`📄 ${file}`);
    issuesByFile[file].forEach(issue => {
      if (issue.line > 0) {
        console.log(`   Line ${issue.line}: ${issue.issue}`);
        console.log(`   ${issue.code}\n`);
      } else {
        console.log(`   ${issue.issue}`);
        console.log(`   ${issue.code}\n`);
      }
    });
  });

  console.log('\n⚠️  Please fix the issues above before deployment.\n');
  process.exit(1);
}
