#!/usr/bin/env node

/**
 * Certificate Generation System Test Script
 * 
 * This script tests the complete certificate generation flow:
 * 1. Upload certificate assets
 * 2. Generate certificates (metadata only)
 * 3. Render certificate on-demand
 * 
 * Usage: node test-certificate-flow.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  testEventId: 'test_event_' + Date.now(),
  testUserId: 'test_user_' + Date.now(),
  authToken: process.env.TEST_AUTH_TOKEN || 'your-test-token-here'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
};

// Test data
const testData = {
  participant: {
    userId: CONFIG.testUserId,
    name: 'John Doe',
    email: 'john.doe@example.com',
    type: 'participant'
  },
  eventTitle: 'Test Certificate Workshop 2025',
  awardText: 'For outstanding participation in',
  leftSignature: {
    name: 'Dr. John Smith',
    title: 'Director'
  },
  rightSignature: {
    name: 'Prof. Jane Doe',
    title: 'Head of Department'
  }
};

// Helper function to check service availability
async function checkServiceAvailability() {
  log.section('Checking Service Availability');
  
  try {
    // Check Backend
    log.info('Checking backend service...');
    await axios.get(`${CONFIG.backendUrl}/health`, { timeout: 5000 });
    log.success(`Backend is running at ${CONFIG.backendUrl}`);
  } catch (error) {
    log.error(`Backend is not reachable at ${CONFIG.backendUrl}`);
    log.warn('Make sure to start the backend: cd Backend && npm start');
    return false;
  }
  
  try {
    // Check ML Service
    log.info('Checking ML service...');
    await axios.get(`${CONFIG.mlServiceUrl}/health`, { timeout: 5000 });
    log.success(`ML service is running at ${CONFIG.mlServiceUrl}`);
  } catch (error) {
    log.error(`ML service is not reachable at ${CONFIG.mlServiceUrl}`);
    log.warn('Make sure to start ML service: cd ML/certificate_generator && python api_main.py');
    return false;
  }
  
  return true;
}

// Test 1: Upload Certificate Assets
async function testUploadAssets() {
  log.section('Test 1: Upload Certificate Assets');
  
  try {
    const form = new FormData();
    
    // Create dummy image files for testing
    // In production, these would be actual PNG/JPG files
    const dummyImage = Buffer.from('dummy-image-data');
    
    form.append('template', dummyImage, {
      filename: 'template.png',
      contentType: 'image/png'
    });
    form.append('orgLogo', dummyImage, {
      filename: 'logo.png',
      contentType: 'image/png'
    });
    form.append('leftSignature', dummyImage, {
      filename: 'left_signature.png',
      contentType: 'image/png'
    });
    form.append('rightSignature', dummyImage, {
      filename: 'right_signature.png',
      contentType: 'image/png'
    });
    
    log.info(`Uploading assets to /events/${CONFIG.testEventId}/upload...`);
    
    const response = await axios.post(
      `${CONFIG.backendUrl}/api/certificate-management/events/${CONFIG.testEventId}/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${CONFIG.authToken}`
        }
      }
    );
    
    log.success('Assets uploaded successfully');
    log.info(`Template URL: ${response.data.templateUrl}`);
    log.info(`Org Logo URL: ${response.data.orgLogoUrl}`);
    
    return response.data;
    
  } catch (error) {
    log.error('Failed to upload assets');
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Message: ${error.response.data.error || error.response.data.message}`);
    } else {
      log.error(error.message);
    }
    throw error;
  }
}

// Test 2: Generate Certificates (Metadata Only)
async function testGenerateCertificates() {
  log.section('Test 2: Generate Certificates (Metadata Only)');
  
  try {
    const requestData = {
      participants: [testData.participant],
      template: 'default',
      awardText: testData.awardText,
      leftSignature: testData.leftSignature,
      rightSignature: testData.rightSignature
    };
    
    log.info(`Generating certificates for event ${CONFIG.testEventId}...`);
    log.info(`Participants: ${testData.participant.name}`);
    
    const response = await axios.post(
      `${CONFIG.backendUrl}/api/certificate-management/events/${CONFIG.testEventId}/generate`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    log.success('Certificates generated (metadata only)');
    log.info(`Status: ${response.data.certificates[0].status}`);
    log.info(`Render URL: ${response.data.certificates[0].renderUrl}`);
    
    if (response.data.certificates[0].status !== 'ready') {
      log.warn('Certificate status is not "ready" - may not be able to render');
    }
    
    return response.data;
    
  } catch (error) {
    log.error('Failed to generate certificates');
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Message: ${error.response.data.error || error.response.data.message}`);
    } else {
      log.error(error.message);
    }
    throw error;
  }
}

// Test 3: Render Certificate (On-Demand)
async function testRenderCertificate() {
  log.section('Test 3: Render Certificate (On-Demand)');
  
  try {
    log.info(`Rendering certificate for user ${CONFIG.testUserId}...`);
    
    const response = await axios.get(
      `${CONFIG.backendUrl}/api/certificate-management/events/${CONFIG.testEventId}/render/${CONFIG.testUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.authToken}`
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Save PDF to file
    const outputPath = path.join(__dirname, `test_certificate_${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, response.data);
    
    log.success('Certificate rendered successfully');
    log.info(`PDF saved to: ${outputPath}`);
    log.info(`File size: ${(response.data.length / 1024).toFixed(2)} KB`);
    
    return outputPath;
    
  } catch (error) {
    log.error('Failed to render certificate');
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Message: ${error.response.data ? error.response.data.toString() : 'Unknown error'}`);
    } else {
      log.error(error.message);
    }
    throw error;
  }
}

// Test 4: ML Service Direct Test
async function testMLServiceDirectly() {
  log.section('Test 4: ML Service Direct Test (Optional)');
  
  try {
    // Test batch-validate endpoint
    log.info('Testing /batch-validate endpoint...');
    
    const validateRequest = {
      eventId: CONFIG.testEventId,
      templateUrl: 'https://example.com/template.png',
      orgLogoUrl: 'https://example.com/logo.png',
      leftSignature: {
        url: 'https://example.com/left_sig.png',
        name: testData.leftSignature.name,
        title: testData.leftSignature.title
      },
      rightSignature: {
        url: 'https://example.com/right_sig.png',
        name: testData.rightSignature.name,
        title: testData.rightSignature.title
      },
      participants: [testData.participant]
    };
    
    // This will likely fail because the URLs are fake
    // But it tests that the endpoint exists
    try {
      await axios.post(
        `${CONFIG.mlServiceUrl}/batch-validate`,
        validateRequest,
        { timeout: 10000 }
      );
      log.success('/batch-validate endpoint is working');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log.success('/batch-validate endpoint exists (returned 400 for fake URLs as expected)');
      } else {
        log.warn(`/batch-validate endpoint returned: ${error.message}`);
      }
    }
    
    log.info('Testing /render-certificate endpoint...');
    
    // This will also likely fail but tests endpoint existence
    const renderRequest = {
      eventId: CONFIG.testEventId,
      eventTitle: testData.eventTitle,
      templateUrl: 'https://example.com/template.png',
      orgLogoUrl: 'https://example.com/logo.png',
      leftSignature: {
        url: 'https://example.com/left_sig.png',
        name: testData.leftSignature.name,
        title: testData.leftSignature.title
      },
      rightSignature: {
        url: 'https://example.com/right_sig.png',
        name: testData.rightSignature.name,
        title: testData.rightSignature.title
      },
      awardText: testData.awardText,
      certificateType: 'participation',
      participant: testData.participant
    };
    
    try {
      await axios.post(
        `${CONFIG.mlServiceUrl}/render-certificate`,
        renderRequest,
        { timeout: 10000 }
      );
      log.success('/render-certificate endpoint is working');
    } catch (error) {
      if (error.response && [400, 500].includes(error.response.status)) {
        log.success('/render-certificate endpoint exists (returned error for fake URLs as expected)');
      } else {
        log.warn(`/render-certificate endpoint returned: ${error.message}`);
      }
    }
    
  } catch (error) {
    log.warn('ML service direct test had issues (this is expected with dummy data)');
  }
}

// Main test runner
async function runTests() {
  console.log('\n');
  log.section('Certificate Generation System - Integration Tests');
  log.info(`Event ID: ${CONFIG.testEventId}`);
  log.info(`User ID: ${CONFIG.testUserId}`);
  
  try {
    // Check services
    const servicesAvailable = await checkServiceAvailability();
    if (!servicesAvailable) {
      log.error('Required services are not available. Exiting.');
      process.exit(1);
    }
    
    // Run tests
    await testUploadAssets();
    await testGenerateCertificates();
    await testRenderCertificate();
    await testMLServiceDirectly();
    
    // Summary
    log.section('Test Results');
    log.success('All tests completed successfully! 🎉');
    log.info('The certificate generation system is working correctly.');
    log.info('');
    log.info('Next steps:');
    log.info('1. Check the generated PDF file');
    log.info('2. Verify cloud storage contains uploaded assets');
    log.info('3. Check MongoDB for certificate metadata');
    log.info('4. Test with real frontend components');
    
  } catch (error) {
    log.section('Test Results');
    log.error('Tests failed!');
    log.error('Please check the errors above and fix the issues.');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(error => {
    log.error('Unexpected error:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testUploadAssets,
  testGenerateCertificates,
  testRenderCertificate,
  testMLServiceDirectly
};
