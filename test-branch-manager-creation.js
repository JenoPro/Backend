// Test script to debug the branch manager creation endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
let authToken = null;

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data, useAuth = false) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (useAuth && authToken) {
    options.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`\n🌐 ${method} ${url}`);
    if (data) {
      console.log('📤 Request data:', JSON.stringify(data, null, 2));
    }

    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`📥 Response status: ${response.status}`);
    console.log('📥 Response data:', JSON.stringify(result, null, 2));

    return { success: response.ok, status: response.status, data: result };
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Login...');
  
  const result = await makeRequest('POST', '/api/auth/admin/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  if (result.success) {
    authToken = result.data.data.token;
    console.log('✅ Admin login successful');
    console.log(`🎫 Token: ${authToken ? 'Generated' : 'Missing'}`);
  } else {
    console.log('❌ Admin login failed:', result.data?.message || result.error);
  }
  
  return result.success;
}

async function testGetBranches() {
  console.log('\n🏢 Testing Get Branches...');
  
  const result = await makeRequest('GET', '/api/admin/branches', null, true);
  
  if (result.success) {
    console.log('✅ Branches retrieved successfully');
    console.log(`📊 Found ${result.data.data?.length || 0} branches`);
    
    // Show first branch if any
    if (result.data.data && result.data.data.length > 0) {
      const firstBranch = result.data.data[0];
      console.log('📋 First branch:');
      console.log(`   ID: ${firstBranch.branch_id}`);
      console.log(`   Name: ${firstBranch.branch_name}`);
      console.log(`   Area: ${firstBranch.area}`);
      console.log(`   Location: ${firstBranch.location}`);
      return firstBranch;
    }
  } else {
    console.log('❌ Failed to get branches:', result.data?.message || result.error);
  }
  
  return null;
}

async function testCreateBranchManager(branchId) {
  console.log('\n👤 Testing Create Branch Manager...');
  
  // Test with different field name formats that frontend might send
  const testData = [
    // Format 1: snake_case (backend expected)
    {
      name: 'snake_case format',
      data: {
        branch_id: branchId,
        manager_username: 'test_manager_1',
        password: 'password123',
        first_name: 'Test',
        last_name: 'Manager',
        email: 'test.manager@example.com',
        contact_number: '09123456789'
      }
    },
    // Format 2: camelCase (frontend common)
    {
      name: 'camelCase format',
      data: {
        branchId: branchId,
        username: 'test_manager_2',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Manager',
        email: 'test.manager2@example.com',
        contactNumber: '09123456789'
      }
    },
    // Format 3: Mixed format (realistic scenario)
    {
      name: 'mixed format',
      data: {
        branchId: branchId,
        manager_username: 'test_manager_3',
        manager_password: 'password123',
        firstName: 'Test',
        last_name: 'Manager',
        email: 'test.manager3@example.com',
        phone: '09123456789'
      }
    }
  ];

  for (const test of testData) {
    console.log(`\n🧪 Testing ${test.name}...`);
    
    const result = await makeRequest('POST', '/api/admin/branch-managers', test.data, true);
    
    if (result.success) {
      console.log(`✅ ${test.name} - Branch manager created successfully`);
      return true;
    } else {
      console.log(`❌ ${test.name} - Failed:`, result.data?.message || result.error);
      if (result.data?.missingFields) {
        console.log('📋 Missing fields:', result.data.missingFields);
      }
      if (result.data?.availableFields) {
        console.log('📋 Available fields:', result.data.availableFields);
      }
    }
  }
  
  return false;
}

async function runTests() {
  console.log('🚀 Starting Branch Manager Creation Tests...');
  
  // Step 1: Login as admin
  const loginSuccess = await testAdminLogin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin login');
    return;
  }
  
  // Step 2: Get branches to find a valid branch_id
  const branch = await testGetBranches();
  if (!branch) {
    console.log('❌ Cannot proceed without a valid branch');
    return;
  }
  
  // Step 3: Test creating branch manager
  const createSuccess = await testCreateBranchManager(branch.branch_id);
  
  console.log('\n📊 Test Summary:');
  console.log(`   Admin Login: ${loginSuccess ? '✅' : '❌'}`);
  console.log(`   Get Branches: ${branch ? '✅' : '❌'}`);
  console.log(`   Create Manager: ${createSuccess ? '✅' : '❌'}`);
  
  if (createSuccess) {
    console.log('\n🎉 All tests passed! The endpoint is working correctly.');
  } else {
    console.log('\n⚠️  Branch manager creation failed. Check server logs for details.');
  }
}

// Run the tests
runTests().catch(console.error);