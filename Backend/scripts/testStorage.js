/**
 * Storage Service Test Script
 * 
 * This script tests the unified storage service functionality
 * Run with: node scripts/testStorage.js
 */

require('dotenv').config();
const { unifiedStorageService, getProviderInfo, healthCheck } = require('../Services/driveService');

async function testStorageService() {
  // ...existing code...
  
  try {
    // Test 1: Get provider info
    const info = getProviderInfo();
    
    // Test 2: Health check
    await healthCheck();
    
    // Test 3: Test provider switching (if applicable)
    const availableProviders = info.available;
    
    for (const provider of availableProviders) {
      try {
        unifiedStorageService.switchProvider(provider);
        
        await healthCheck();
      } catch (error) {
        // Ignore errors during provider switching
      }
    }
    
    // Switch back to default
    const defaultProvider = process.env.STORAGE_PROVIDER || 'local';
    unifiedStorageService.switchProvider(defaultProvider);
    
    
  } catch (error) {
    // ...existing code...
  }
}

// Run the test
if (require.main === module) {
  testStorageService().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}

module.exports = { testStorageService };
