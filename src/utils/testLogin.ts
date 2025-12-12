/**
 * Test login credentials script
 * This script tests if the demo credentials work for authentication
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';

const testLogin = async (email: string, password: string) => {
  try {
    console.log(`🔐 Testing login for: ${email}`);
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });

    if (response.data.success) {
      console.log('✅ Login successful!');
      console.log('📋 User data:', {
        name: response.data.data.user.name,
        email: response.data.data.user.email,
        role: response.data.data.user.role,
        isActive: response.data.data.user.isActive,
        isEmailVerified: response.data.data.user.isEmailVerified
      });
      console.log('🎫 Token received:', response.data.data.token ? 'Yes' : 'No');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    console.log('📍 Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return false;
  }
};

const runTests = async () => {
  console.log('🧪 Starting login tests...\n');

  // Test admin credentials
  await testLogin('admin@sevadaan.org', 'admin123');
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test a regular user (we'll need to find one from the database)
  try {
    const healthResponse = await axios.get(`${API_BASE}/../health`);
    console.log('🏥 Server health:', healthResponse.data.status);
  } catch (error) {
    console.log('❌ Server health check failed');
  }
};

runTests().catch(console.error);
