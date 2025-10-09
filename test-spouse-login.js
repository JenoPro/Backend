import fetch from 'node-fetch'

async function testMobileLoginWithSpouse() {
  try {
    console.log('🧪 Testing mobile login to check spouse data...')
    
    const response = await fetch('http://localhost:3001/api/mobile/mobile-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: '25-23471',
        password: 'test123'
      })
    })
    
    console.log('📊 Response Status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Login successful!')
      
      // Check if spouse information is present
      if (data.data && data.data.profile && data.data.profile.spouse_info) {
        console.log('✅ Spouse information found:')
        console.log(JSON.stringify(data.data.profile.spouse_info, null, 2))
      } else {
        console.log('❌ No spouse information in response')
        console.log('Profile structure:', JSON.stringify(data.data.profile, null, 2))
      }
      
      // Show user info
      console.log('\n👤 User civil status:', data.data.user.civil_status)
      console.log('👤 User full name:', data.data.user.full_name)
      
    } else {
      const errorData = await response.text()
      console.log('❌ Login failed:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testMobileLoginWithSpouse()