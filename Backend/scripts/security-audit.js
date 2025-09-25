#!/usr/bin/env node

/**
 * Security Audit Script
 * Comprehensive security check for the CampVerse application
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Security audit results
const auditResults = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: []
};

// Helper functions
const log = (level, message, details = '') => {
  const timestamp = new Date().toISOString();
  const levelColor = {
    critical: colors.red,
    high: colors.red,
    medium: colors.yellow,
    low: colors.blue,
    info: colors.green
  }[level] || colors.white;

  console.log(`${levelColor}[${level.toUpperCase()}]${colors.reset} ${message}`);
  if (details) {
    console.log(`  ${colors.cyan}Details:${colors.reset} ${details}`);
  }
};

const addResult = (level, message, details = '') => {
  auditResults[level].push({ message, details, timestamp: new Date().toISOString() });
  log(level, message, details);
};

// Security checks
const securityChecks = {
  // Check for hardcoded secrets
  checkHardcodedSecrets: () => {
    const filesToCheck = [
      'app.js',
      'config/security.js',
      'docker-compose.yml',
      '.env',
      '.env.example'
    ];

    const secretPatterns = [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
      /key\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/gi
    ];

    filesToCheck.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        secretPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              if (!match.includes('your_') && !match.includes('test-') && !match.includes('example')) {
                addResult('high', `Potential hardcoded secret found in ${file}`, match);
              }
            });
          }
        });
      }
    });
  },

  // Check environment variables
  checkEnvironmentVariables: () => {
    const requiredEnvVars = [
      'JWT_SECRET',
      'MONGO_URI',
      'EMAIL_USER',
      'EMAIL_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      addResult('critical', 'Missing required environment variables', missingVars.join(', '));
    }

    // Check JWT secret strength
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        addResult('critical', 'JWT_SECRET is too short', 'Must be at least 32 characters');
      }
      if (process.env.JWT_SECRET === 'insecure-default-secret-change-in-production') {
        addResult('critical', 'JWT_SECRET is using default value', 'Change from default in production');
      }
    }
  },

  // Check package vulnerabilities
  checkPackageVulnerabilities: async () => {
    try {
      const { execSync } = require('child_process');
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);
      
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([packageName, vuln]) => {
          const severity = vuln.severity || 'unknown';
          addResult(severity, `Vulnerability in ${packageName}`, vuln.title || 'No description');
        });
      }
    } catch (error) {
      addResult('medium', 'Could not run npm audit', error.message);
    }
  },

  // Check CORS configuration
  checkCorsConfiguration: () => {
    const corsConfig = require('../config/security').securityConfig.cors;
    
    if (corsConfig.origin.includes('*')) {
      addResult('high', 'CORS allows all origins', 'Consider restricting to specific domains');
    }
    
    if (corsConfig.credentials && corsConfig.origin.includes('*')) {
      addResult('critical', 'CORS allows credentials with wildcard origin', 'Security risk');
    }
  },

  // Check rate limiting
  checkRateLimiting: () => {
    const rateLimitConfig = require('../config/security').securityConfig.rateLimit;
    
    if (rateLimitConfig.max > 1000) {
      addResult('medium', 'Rate limit is very high', 'Consider reducing for better security');
    }
    
    if (rateLimitConfig.authMax > 50) {
      addResult('high', 'Authentication rate limit is high', 'Consider reducing for security');
    }
  },

  // Check security headers
  checkSecurityHeaders: () => {
    const headersConfig = require('../config/security').securityConfig.headers;
    
    if (!headersConfig.contentSecurityPolicy) {
      addResult('high', 'Content Security Policy not configured', 'CSP helps prevent XSS attacks');
    }
    
    if (!headersConfig.hsts) {
      addResult('medium', 'HSTS not configured', 'HSTS helps prevent protocol downgrade attacks');
    }
  },

  // Check input validation
  checkInputValidation: () => {
    const validationConfig = require('../config/security').securityConfig.validation;
    
    if (validationConfig.maxStringLength > 10000) {
      addResult('medium', 'Max string length is very high', 'Consider reducing to prevent DoS');
    }
    
    if (!validationConfig.preventXss) {
      addResult('high', 'XSS prevention not enabled', 'Enable XSS protection');
    }
    
    if (!validationConfig.preventSqlInjection) {
      addResult('high', 'SQL injection prevention not enabled', 'Enable SQL injection protection');
    }
  },

  // Check file permissions
  checkFilePermissions: () => {
    const sensitiveFiles = [
      '.env',
      'credentials/service-account.json',
      'config/security.js'
    ];

    sensitiveFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const mode = stats.mode & parseInt('777', 8);
        
        if (mode > parseInt('644', 8)) {
          addResult('medium', `File ${file} has overly permissive permissions`, `Mode: ${mode.toString(8)}`);
        }
      }
    });
  },

  // Check for debug information in production
  checkDebugInformation: () => {
    const appJsPath = path.join(__dirname, '..', 'app.js');
    if (fs.existsSync(appJsPath)) {
      const content = fs.readFileSync(appJsPath, 'utf8');
      
      if (content.includes('console.log') && process.env.NODE_ENV === 'production') {
        addResult('low', 'Console.log statements found in production code', 'Remove debug statements');
      }
      
      if (content.includes('debugger')) {
        addResult('medium', 'Debugger statements found', 'Remove debugger statements');
      }
    }
  }
};

// Main audit function
const runSecurityAudit = async () => {
  console.log(`${colors.bold}${colors.cyan}🔒 CampVerse Security Audit${colors.reset}\n`);
  
  console.log(`${colors.blue}Running security checks...${colors.reset}\n`);
  
  // Run all security checks
  securityChecks.checkHardcodedSecrets();
  securityChecks.checkEnvironmentVariables();
  await securityChecks.checkPackageVulnerabilities();
  securityChecks.checkCorsConfiguration();
  securityChecks.checkRateLimiting();
  securityChecks.checkSecurityHeaders();
  securityChecks.checkInputValidation();
  securityChecks.checkFilePermissions();
  securityChecks.checkDebugInformation();
  
  // Generate report
  console.log(`\n${colors.bold}${colors.cyan}📊 Security Audit Report${colors.reset}\n`);
  
  const totalIssues = Object.values(auditResults).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalIssues === 0) {
    console.log(`${colors.green}✅ No security issues found!${colors.reset}`);
  } else {
    console.log(`${colors.red}Found ${totalIssues} security issues:${colors.reset}\n`);
    
    ['critical', 'high', 'medium', 'low', 'info'].forEach(level => {
      if (auditResults[level].length > 0) {
        console.log(`${colors.bold}${level.toUpperCase()}: ${auditResults[level].length}${colors.reset}`);
        auditResults[level].forEach(issue => {
          console.log(`  • ${issue.message}`);
          if (issue.details) {
            console.log(`    ${colors.cyan}${issue.details}${colors.reset}`);
          }
        });
        console.log();
      }
    });
  }
  
  // Generate JSON report
  const reportPath = path.join(__dirname, '..', 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`${colors.blue}📄 Detailed report saved to: ${reportPath}${colors.reset}`);
  
  // Exit with appropriate code
  if (auditResults.critical.length > 0 || auditResults.high.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

// Run the audit
if (require.main === module) {
  runSecurityAudit().catch(error => {
    console.error(`${colors.red}Audit failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit, securityChecks };