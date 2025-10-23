// Test Employee API Endpoints
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testEmployeeEndpoints() {
    console.log('🧪 Testing Employee API Endpoints...\n');
    
    try {
        // Test 1: Get all employees (should return empty array initially)
        console.log('1️⃣ Testing GET /api/employees...');
        const getResponse = await fetch(`${API_BASE}/employees`);
        const getData = await getResponse.json();
        console.log('✅ GET Response:', JSON.stringify(getData, null, 2));
        console.log('Status:', getResponse.status, '\n');
        
        // Test 2: Create a new employee
        console.log('2️⃣ Testing POST /api/employees...');
        const createData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phoneNumber: '+1234567890',
            branchId: 1,
            permissions: ['dashboard', 'stalls', 'payments'],
            createdByManager: 1
        };
        
        const createResponse = await fetch(`${API_BASE}/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(createData)
        });
        
        const createResult = await createResponse.json();
        console.log('✅ CREATE Response:', JSON.stringify(createResult, null, 2));
        console.log('Status:', createResponse.status, '\n');
        
        // Test 3: Get all employees again (should show the created employee)
        if (createResponse.ok) {
            console.log('3️⃣ Testing GET /api/employees after creation...');
            const getResponse2 = await fetch(`${API_BASE}/employees`);
            const getData2 = await getResponse2.json();
            console.log('✅ GET Response (with data):', JSON.stringify(getData2, null, 2));
            console.log('Status:', getResponse2.status, '\n');
        }
        
        console.log('🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testEmployeeEndpoints();