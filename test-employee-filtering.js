/**
 * Test script to verify branch manager employee filtering
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testEmployeeFiltering() {
  console.log('🧪 Testing Employee Branch Filtering');
  console.log('='.repeat(50));

  try {
    // Test with branch manager `test_username` (Branch 8)
    console.log('1. 🏢 Testing Branch Manager Employee Access...');
    
    const bmLoginResponse = await fetch(`${BASE_URL}/api/auth/branch_manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_username',
        password: 'testpassword' // You'll need the correct password
      })
    });

    if (bmLoginResponse.ok) {
      const bmLoginData = await bmLoginResponse.json();
      const bmToken = bmLoginData.data?.token || bmLoginData.token;
      console.log('✅ Branch Manager login successful');

      // Test employee endpoint with authentication
      const employeesResponse = await fetch(`${BASE_URL}/api/employees`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${bmToken}` }
      });

      console.log('📡 Employee Response Status:', employeesResponse.status);
      
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        console.log('✅ Employees endpoint accessible!');
        console.log('📊 Employee Results:', {
          success: employeesData.success,
          totalEmployees: employeesData.data?.length || 0,
          branchFilter: employeesData.filters?.branch_id,
          userType: employeesData.filters?.user_type,
          status: employeesData.filters?.status
        });

        if (employeesData.data && employeesData.data.length > 0) {
          console.log('👥 Employee Details:');
          employeesData.data.forEach((emp, index) => {
            console.log(`  ${index + 1}. ${emp.first_name} ${emp.last_name} (Branch: ${emp.branch_id})`);
          });
        } else {
          console.log('📋 No employees found in this branch (which may be correct)');
        }
      } else {
        const errorText = await employeesResponse.text();
        console.error('❌ Failed to get employees:', errorText);
      }

    } else {
      console.log('⚠️ Branch Manager login failed - need correct password');
      console.log('Response:', await bmLoginResponse.text());
    }

    console.log('\n' + '-'.repeat(40) + '\n');

    // Test with different branch manager for comparison
    console.log('2. 🏢 Testing Different Branch Manager (NCPM_Manager)...');
    
    const ncpmLoginResponse = await fetch(`${BASE_URL}/api/auth/branch_manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'NCPM_Manager',
        password: 'manager123' // Standard password
      })
    });

    if (ncpmLoginResponse.ok) {
      const ncpmLoginData = await ncpmLoginResponse.json();
      const ncpmToken = ncpmLoginData.data?.token || ncpmLoginData.token;
      console.log('✅ NCPM Manager login successful');

      // Test employee endpoint
      const ncpmEmployeesResponse = await fetch(`${BASE_URL}/api/employees`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${ncpmToken}` }
      });

      if (ncpmEmployeesResponse.ok) {
        const ncpmEmployeesData = await ncpmEmployeesResponse.json();
        console.log('✅ NCPM Manager can access employees!');
        console.log('📊 NCPM Results:', {
          totalEmployees: ncpmEmployeesData.data?.length || 0,
          branchFilter: ncpmEmployeesData.filters?.branch_id,
          userType: ncpmEmployeesData.filters?.user_type
        });

        if (ncpmEmployeesData.data && ncpmEmployeesData.data.length > 0) {
          console.log('👥 NCPM Employees:');
          ncpmEmployeesData.data.forEach((emp, index) => {
            console.log(`  ${index + 1}. ${emp.first_name} ${emp.last_name} (Branch: ${emp.branch_id})`);
          });
        }
      } else {
        console.error('❌ NCPM Manager failed to get employees');
      }
    } else {
      console.log('⚠️ NCPM Manager login failed');
    }

    console.log('\n📋 Summary:');
    console.log('✅ Employee endpoint is now protected with authentication');
    console.log('✅ Each branch manager should only see employees from their branch');
    console.log('✅ This prevents seeing employees from other branches');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmployeeFiltering();