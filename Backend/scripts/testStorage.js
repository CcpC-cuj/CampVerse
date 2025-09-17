/**
 * Storage Service Test Script
 * 
 * This script tests the unified storage service functionality
 * Run with: node scripts/testStorage.js
 */

require('dotenv').config();
const { unifiedStorageService, getProviderInfo, healthCheck } = require('../Services/driveService');

async function testStorageService() {
  console.log('🧪 Testing Storage Service...\n');
  
  try {
    // Test 1: Get provider info
    console.log('📋 Provider Information:');
    const info = getProviderInfo();
    console.log(JSON.stringify(info, null, 2));
    console.log('');
    
    // Test 2: Health check
    console.log('🏥 Health Check:');
    const health = await healthCheck();
    console.log(JSON.stringify(health, null, 2));
    console.log('');
    
    // Test 3: Test provider switching (if applicable)
    console.log('🔄 Testing Provider Switching:');
    const availableProviders = info.available;
    
    for (const provider of availableProviders) {
      try {
        console.log(`  → Switching to ${provider}...`);
        unifiedStorageService.switchProvider(provider);
        
        const newHealth = await healthCheck();
        console.log(`    Status: ${newHealth.status} - ${newHealth.message}`);
      } catch (error) {
        console.log(`    Error: ${error.message}`);
      }
    }
    
    // Switch back to default
    const defaultProvider = process.env.STORAGE_PROVIDER || 'local';
    unifiedStorageService.switchProvider(defaultProvider);
    console.log(`  → Switched back to default: ${defaultProvider}\n`);
    
    console.log('✅ Storage service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage service test failed:', error);
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
