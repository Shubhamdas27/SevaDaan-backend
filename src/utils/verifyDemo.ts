/**
 * Comprehensive demo verification script
 * Tests all major functionalities to ensure demo is working correctly
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      _id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      isEmailVerified: boolean;
    };
  };
}

let authToken = '';

const testLogin = async (email: string, password: string): Promise<boolean> => {
  try {
    console.log(`🔐 Testing login for: ${email}`);
    
    const response = await axios.post<LoginResponse>(`${API_BASE}/auth/login`, {
      email,
      password
    });

    if (response.data.success) {
      console.log('✅ Login successful!');
      authToken = response.data.data.token;
      console.log('📋 User data:', {
        name: response.data.data.user.name,
        email: response.data.data.user.email,
        role: response.data.data.user.role,
        isActive: response.data.data.user.isActive,
        isEmailVerified: response.data.data.user.isEmailVerified
      });
      return true;
    } else {
      console.log('❌ Login failed');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
};

const testEndpoint = async (endpoint: string, description: string) => {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log(`✅ ${description}: ${response.status} - ${response.data.data?.length || 'OK'} items`);
    return true;
  } catch (error: any) {
    console.log(`❌ ${description}: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const runComprehensiveTests = async () => {
  console.log('🧪 Starting comprehensive demo verification...\n');

  // Test 1: Admin Login
  console.log('='.repeat(60));
  console.log('📋 TEST 1: Admin Authentication');
  console.log('='.repeat(60));
  
  const adminLoginSuccess = await testLogin('admin@sevadaan.org', 'admin123');
  if (!adminLoginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST 2: API Endpoints');
  console.log('='.repeat(60));

  // Test various endpoints
  await testEndpoint('/users', 'Users endpoint');
  await testEndpoint('/ngos', 'NGOs endpoint');
  await testEndpoint('/programs', 'Programs endpoint');
  await testEndpoint('/donations', 'Donations endpoint');
  await testEndpoint('/volunteers', 'Volunteers endpoint');
  await testEndpoint('/dashboard/admin', 'Admin dashboard');

  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST 3: Regular User Login');
  console.log('='.repeat(60));

  // Test regular user login
  try {
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (usersResponse.data.data && usersResponse.data.data.length > 1) {
      const regularUser = usersResponse.data.data.find((u: any) => u.email !== 'admin@sevadaan.org' && u.isActive);
      
      if (regularUser) {
        console.log(`🔐 Testing regular user: ${regularUser.email}`);
        await testLogin(regularUser.email, 'password123');
      }
    }
  } catch (error) {
    console.log('❌ Could not test regular user login');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST 4: CORS Configuration');
  console.log('='.repeat(60));

  try {
    const response = await axios.options(`${API_BASE}/auth/login`);
    console.log('✅ CORS preflight check: OK');
  } catch (error: any) {
    console.log('❌ CORS preflight check failed:', error.message);
  }

  console.log('\n🎉 Demo verification completed!');
  console.log('\n🔑 Working Demo Credentials:');
  console.log('   📧 Email: admin@sevadaan.org');
  console.log('   🔒 Password: admin123');
  console.log('   🌐 Frontend: http://localhost:5174');
  console.log('   ⚡ Backend: http://localhost:3000');
};

runComprehensiveTests().catch(console.error);
