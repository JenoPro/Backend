/**
 * Simple test to check if the employee stall applicants endpoint is now working
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function quickEmployeeTest() {
  console.log('🧪 Quick Employee Stall Applicants Test');
  console.log('=' .repeat(40));

  try {
    // Test with an existing employee credential (simulate frontend request)
    console.log('1. 🔐 Testing employee login...');
    
    // From the logs, we know the employee username is jeno.laurente359
    // But we need the password, so let's first login as admin to reset it
    
    console.log('1a. 🔑 Logging in as admin to manage employee...');
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

    // Get employees to find our test employee
    console.log('1b. 📋 Getting employee information...');
    const employeesResponse = await fetch(`${BASE_URL}/api/employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!employeesResponse.ok) {
      console.error('❌ Failed to get employees:', await employeesResponse.text());
      return;
    }

    const employeesData = await employeesResponse.json();
    const testEmployee = employeesData.data?.find(emp => emp.employee_username === 'jeno.laurente359');
    
    if (!testEmployee) {
      console.log('⚠️ Employee jeno.laurente359 not found');
      return;
    }

    console.log('✅ Found employee:', {
      id: testEmployee.employee_id,
      username: testEmployee.employee_username,
      name: `${testEmployee.first_name} ${testEmployee.last_name}`,
      branchId: testEmployee.branch_id
    });

    // Reset employee password to a known value
    console.log('1c. 🔄 Resetting employee password...');
    const resetPasswordResponse = await fetch(`${BASE_URL}/api/employees/${testEmployee.employee_id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        resetBy: 'admin'
      })
    });

    if (!resetPasswordResponse.ok) {
      console.error('❌ Failed to reset password:', await resetPasswordResponse.text());
      return;
    }

    const resetPasswordData = await resetPasswordResponse.json();
    const newPassword = resetPasswordData.data?.newPassword;
    console.log('✅ Password reset successful, new password:', newPassword);

    // Now login as employee
    console.log('2. 🔐 Logging in as employee...');
    const employeeLoginResponse = await fetch(`${BASE_URL}/api/employees/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testEmployee.employee_username,
        password: newPassword
      })
    });

    if (!employeeLoginResponse.ok) {
      console.error('❌ Employee login failed:', await employeeLoginResponse.text());
      return;
    }

    const employeeLoginData = await employeeLoginResponse.json();
    const employeeToken = employeeLoginData.data?.token || employeeLoginData.token;
    console.log('✅ Employee login successful');

    // Test the stall applicants endpoint
    console.log('3. 🔍 Testing stall applicants endpoint...');
    const applicantsResponse = await fetch(`${BASE_URL}/api/applicants/my-stall-applicants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${employeeToken}`
      }
    });

    console.log('📡 Response status:', applicantsResponse.status);
    
    if (applicantsResponse.ok) {
      const applicantsData = await applicantsResponse.json();
      console.log('✅ SUCCESS! Employee can now access stall applicants!');
      console.log('📊 Results:', {
        success: applicantsData.success,
        totalApplicants: applicantsData.data?.applicants?.length || 0,
        branchInfo: applicantsData.data?.branch_manager,
        message: applicantsData.message
      });
    } else {
      const errorData = await applicantsResponse.text();
      console.error('❌ Still failing to get stall applicants:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
quickEmployeeTest();