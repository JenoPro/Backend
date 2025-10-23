/**
 * Test the employee creation endpoint with a real HTTP request
 */

import fetch from 'node-fetch';

async function testEmployeeCreation() {
    try {
        console.log('🧪 Testing employee creation endpoint...');
        
        const response = await fetch('http://localhost:3001/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: 'Test',
                lastName: 'Employee',
                email: 'test.employee@example.com',
                phoneNumber: '1234567890',
                branchId: 1,
                permissions: ['read', 'write'],
                createdByManager: 1
            })
        });

        console.log(`📤 Response status: ${response.status}`);
        
        const data = await response.json();
        console.log('📤 Response data:', JSON.stringify(data, null, 2));
        
        if (response.status === 201) {
            console.log('✅ Employee creation successful!');
            console.log(`👤 Created employee with ID: ${data.data.employeeId}`);
            console.log(`🔐 Username: ${data.data.credentials.username}`);
            console.log(`🔑 Password: ${data.data.credentials.password}`);
        } else {
            console.log('❌ Employee creation failed');
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testEmployeeCreation();