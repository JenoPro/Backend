/**
 * Test script to verify employee access to stall applicants
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testEmployeeStallApplicants() {
  console.log('🧪 Testing Employee Stall Applicants Access');
  console.log('='.repeat(50));

  try {
    // First, let's check if there are any employees in the database
    console.log('1. 📋 Checking for existing employees...');
    
    // Try to login with a test employee (we'll need to create one first if none exist)
    // For now, let's try to create a test employee
    console.log('2. 👤 Creating test employee...');
    
    // First login as admin to create employee
    console.log('2a. 🔐 Logging in as admin...');
    const adminLoginResponse = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!adminLoginResponse.ok) {
      console.error('❌ Admin login failed:', await adminLoginResponse.text());
      return;
    }

    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.data?.token || adminLoginData.token;
    console.log('✅ Admin login successful');

    // Create a test employee
    console.log('2b. 📝 Creating test employee...');
    const createEmployeeResponse = await fetch(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@nagastall.com',
        phoneNumber: '09123456789',
        branchId: 1, // Assign to branch 1
        permissions: [
          { resource: 'applicants', actions: ['view'] },
          { resource: 'stalls', actions: ['view'] }
        ],
        createdByManager: 1
      })
    });

    if (!createEmployeeResponse.ok) {
      const errorText = await createEmployeeResponse.text();
      console.log('⚠️ Employee creation response:', errorText);
      // Continue anyway, employee might already exist
    } else {
      const createEmployeeData = await createEmployeeResponse.json();
      console.log('✅ Employee created:', createEmployeeData.data);
    }

    // Now try to login as employee
    console.log('3. 🔐 Testing employee login...');
    const employeeLoginResponse = await fetch(`${BASE_URL}/api/employees/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test.employee', // Usually generated from email
        password: 'generated_password' // Would be auto-generated
      })
    });

    if (!employeeLoginResponse.ok) {
      console.log('⚠️ Employee login failed, trying to find existing employee credentials...');
      
      // Get all employees to see what's available
      const employeesResponse = await fetch(`${BASE_URL}/api/employees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        console.log('📋 Available employees:', employeesData.data?.map(emp => ({
          id: emp.employee_id,
          username: emp.employee_username,
          name: `${emp.first_name} ${emp.last_name}`,
          branch: emp.branch_id
        })));
        
        if (employeesData.data && employeesData.data.length > 0) {
          const testEmployee = employeesData.data[0];
          console.log('🎯 Using first employee for testing:', testEmployee.employee_username);
          
          // Test with first employee (note: we don't know their password)
          console.log('⚠️ Cannot test employee login without knowing password.');
          console.log('💡 Recommendation: Reset password for employee ID:', testEmployee.employee_id);
          
          // Let's try to access the endpoint with admin token to simulate employee access
          console.log('4. 🔍 Testing stall applicants endpoint (simulated employee access)...');
          
          const applicantsResponse = await fetch(`${BASE_URL}/api/applicants/my-stall-applicants`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${adminToken}`
            }
          });

          console.log('📡 Response status:', applicantsResponse.status);
          const applicantsData = await applicantsResponse.text();
          console.log('📡 Response:', applicantsData);
        }
      }
      
      return;
    }

    const employeeLoginData = await employeeLoginResponse.json();
    const employeeToken = employeeLoginData.data?.token || employeeLoginData.token;
    console.log('✅ Employee login successful');

    // Test accessing stall applicants
    console.log('4. 🔍 Testing stall applicants access...');
    const applicantsResponse = await fetch(`${BASE_URL}/api/applicants/my-stall-applicants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${employeeToken}`
      }
    });

    console.log('📡 Response status:', applicantsResponse.status);
    
    if (applicantsResponse.ok) {
      const applicantsData = await applicantsResponse.json();
      console.log('✅ Stall applicants retrieved successfully!');
      console.log('📊 Results:', {
        success: applicantsData.success,
        totalApplicants: applicantsData.data?.applicants?.length || 0,
        branchInfo: applicantsData.data?.branch_manager
      });
    } else {
      const errorData = await applicantsResponse.text();
      console.error('❌ Failed to get stall applicants:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmployeeStallApplicants();