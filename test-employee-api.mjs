import fetch from 'node-fetch'

async function testEmployeeAPI() {
  try {
    console.log('Testing Employee API...')
    
    // Test GET /api/employees
    console.log('\n1. Testing GET /api/employees')
    const getResponse = await fetch('http://localhost:3001/api/employees')
    const getData = await getResponse.json()
    console.log('GET Status:', getResponse.status)
    console.log('GET Response:', JSON.stringify(getData, null, 2))
    
    // Test POST /api/employees
    console.log('\n2. Testing POST /api/employees')
    const postResponse = await fetch('http://localhost:3001/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@example.com',
        phoneNumber: '09123456789',
        branchId: 1,
        permissions: ['dashboard', 'stalls']
      })
    })
    
    const postData = await postResponse.json()
    console.log('POST Status:', postResponse.status)
    console.log('POST Response:', JSON.stringify(postData, null, 2))
    
  } catch (error) {
    console.error('Test Error:', error)
  }
}

testEmployeeAPI()