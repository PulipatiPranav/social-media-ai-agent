// Manual test script to verify OAuth functionality
// Run this with: node tests/manual/oauth-test.js

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  userId: 'test_user_123',
  email: 'test@example.com'
};

// Generate test JWT token
const testToken = jwt.sign(TEST_USER, process.env.JWT_SECRET, { expiresIn: '1h' });

async function testOAuthEndpoints() {
  console.log('🚀 Starting OAuth endpoint tests...\n');

  try {
    // Test 1: Get Instagram auth URL
    console.log('1. Testing Instagram auth URL generation...');
    const instagramAuthResponse = await axios.get(`${BASE_URL}/api/social/auth/instagram`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (instagramAuthResponse.data.success) {
      console.log('✅ Instagram auth URL generated successfully');
      console.log(`   URL: ${instagramAuthResponse.data.data.authUrl.substring(0, 80)}...`);
    } else {
      console.log('❌ Failed to generate Instagram auth URL');
    }

    // Test 2: Get TikTok auth URL
    console.log('\n2. Testing TikTok auth URL generation...');
    const tiktokAuthResponse = await axios.get(`${BASE_URL}/api/social/auth/tiktok`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (tiktokAuthResponse.data.success) {
      console.log('✅ TikTok auth URL generated successfully');
      console.log(`   URL: ${tiktokAuthResponse.data.data.authUrl.substring(0, 80)}...`);
    } else {
      console.log('❌ Failed to generate TikTok auth URL');
    }

    // Test 3: Get YouTube auth URL
    console.log('\n3. Testing YouTube auth URL generation...');
    const youtubeAuthResponse = await axios.get(`${BASE_URL}/api/social/auth/youtube`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (youtubeAuthResponse.data.success) {
      console.log('✅ YouTube auth URL generated successfully');
      console.log(`   URL: ${youtubeAuthResponse.data.data.authUrl.substring(0, 80)}...`);
    } else {
      console.log('❌ Failed to generate YouTube auth URL');
    }

    // Test 4: Get connected accounts (should be empty initially)
    console.log('\n4. Testing get connected accounts...');
    const accountsResponse = await axios.get(`${BASE_URL}/api/social/connected-accounts`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (accountsResponse.data.success) {
      console.log('✅ Connected accounts retrieved successfully');
      console.log(`   Count: ${accountsResponse.data.data.count}`);
    } else {
      console.log('❌ Failed to get connected accounts');
    }

    // Test 5: Test invalid platform
    console.log('\n5. Testing invalid platform handling...');
    try {
      await axios.get(`${BASE_URL}/api/social/auth/invalid_platform`, {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      console.log('❌ Should have returned error for invalid platform');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid platform correctly rejected');
      } else {
        console.log('❌ Unexpected error for invalid platform');
      }
    }

    console.log('\n🎉 OAuth endpoint tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first with: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('OAuth Functionality Test');
  console.log('========================\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testOAuthEndpoints();
  }
}

if (require.main === module) {
  main();
}

module.exports = { testOAuthEndpoints, checkServer };