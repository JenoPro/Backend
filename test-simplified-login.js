// Test simplified branch manager login endpoint
import http from 'http'

const API_BASE_URL = 'http://localhost:3001'

function makePostRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data)
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: url.replace('http://localhost:3001', ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch (err) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })
    
    req.on('error', (err) => {
      reject(err)
    })
    
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.write(postData)
    req.end()
  })
}

async function testSimplifiedLogin() {
  try {
    console.log('🧪 Testing Simplified Branch Manager Login...')
    console.log('📡 Testing endpoint: /api/auth/branch_manager/login')
    console.log('🎯 Goal: Login with ONLY username and password (no area/location required)')
    
    // Test 1: Valid login - NCPM_Manager
    console.log('\n1️⃣ Test Valid Login (NCPM_Manager):')
    const loginData = {
      username: 'NCPM_Manager',
      password: 'password123'  // Common test password
    }
    
    console.log('📤 Request:', JSON.stringify(loginData, null, 2))
    
    const response = await makePostRequest(`${API_BASE_URL}/api/auth/branch_manager/login`, loginData)
    
    console.log(`📊 Response Status: ${response.status}`)
    console.log('📋 Response:', JSON.stringify(response.data, null, 2))
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ LOGIN SUCCESS!')
      console.log('🎯 User area automatically detected:', response.data.data.user.area)
      console.log('🎯 User location automatically detected:', response.data.data.user.location)
      console.log('🎯 Full name:', response.data.data.user.fullName)
    } else if (response.status === 401) {
      console.log('❌ Login failed - trying other passwords...')
      
      // Try other common passwords
      const testPasswords = ['admin123', 'manager123', '123456', 'password']
      
      for (const testPassword of testPasswords) {
        console.log(`🧪 Trying password: "${testPassword}"`)
        const testResponse = await makePostRequest(`${API_BASE_URL}/api/auth/branch_manager/login`, {
          username: 'NCPM_Manager',
          password: testPassword
        })
        
        if (testResponse.status === 200) {
          console.log(`✅ SUCCESS with password: "${testPassword}"`)
          console.log('🎯 User area:', testResponse.data.data.user.area)
          console.log('🎯 User location:', testResponse.data.data.user.location)
          break
        }
      }
    } else {
      console.log('❌ Unexpected response')
    }
    
    // Test 2: Invalid username
    console.log('\n2️⃣ Test Invalid Username:')
    const invalidUser = {
      username: 'NonExistentUser',
      password: 'password123'
    }
    
    const invalidResponse = await makePostRequest(`${API_BASE_URL}/api/auth/branch_manager/login`, invalidUser)
    console.log(`📊 Status: ${invalidResponse.status}`)
    console.log('💬 Message:', invalidResponse.data.message)
    
    if (invalidResponse.status === 401) {
      console.log('✅ Correctly rejected invalid username')
    }
    
    // Test 3: Missing fields
    console.log('\n3️⃣ Test Missing Password:')
    const missingPassword = {
      username: 'NCPM_Manager'
    }
    
    const missingResponse = await makePostRequest(`${API_BASE_URL}/api/auth/branch_manager/login`, missingPassword)
    console.log(`📊 Status: ${missingResponse.status}`)
    console.log('💬 Message:', missingResponse.data.message)
    
    if (missingResponse.status === 400) {
      console.log('✅ Correctly validated required fields')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure the server is running on http://localhost:3001')
    }
  }
}

// Run the test
testSimplifiedLogin()