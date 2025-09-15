// Test authentication and CRUD operations
const testAuth = async () => {
  try {
    console.log('Testing authentication and CRUD operations...')
    
    // Test 1: Branch Manager Login
    console.log('\n1. Testing Branch Manager Login...')
    const loginResponse = await fetch('http://localhost:3001/api/auth/branch_manager/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'SM_Manager',
        password: 'manager123'
      })
    })
    
    const loginData = await loginResponse.json()
    console.log('Login Response:', loginData)
    
    if (!loginData.success || !loginData.token) {
      console.error('❌ Login failed')
      return
    }
    
    const token = loginData.token
    console.log('✅ Login successful, token received')
    
    // Test 2: Get All Stalls
    console.log('\n2. Testing Get All Stalls...')
    const stallsResponse = await fetch('http://localhost:3001/api/stalls', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const stallsData = await stallsResponse.json()
    console.log('Get Stalls Response:', stallsData)
    
    // Test 3: Add New Stall
    console.log('\n3. Testing Add Stall...')
    const addResponse = await fetch('http://localhost:3001/api/stalls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stallNumber: 'TEST-001',
        price: 1500,
        location: 'Test Location',
        size: '3x3',
        description: 'Test stall',
        isAvailable: true
      })
    })
    
    const addData = await addResponse.json()
    console.log('Add Stall Response:', addData)
    
    if (addData.success && addData.data) {
      const stallId = addData.data.stall_id
      console.log(`✅ Stall added successfully with ID: ${stallId}`)
      
      // Test 4: Update Stall
      console.log('\n4. Testing Update Stall...')
      const updateResponse = await fetch(`http://localhost:3001/api/stalls/${stallId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price: 1800,
          description: 'Updated test stall'
        })
      })
      
      const updateData = await updateResponse.json()
      console.log('Update Stall Response:', updateData)
      
      // Test 5: Delete Stall
      console.log('\n5. Testing Delete Stall...')
      const deleteResponse = await fetch(`http://localhost:3001/api/stalls/${stallId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const deleteData = await deleteResponse.json()
      console.log('Delete Stall Response:', deleteData)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

// Run the test
testAuth()