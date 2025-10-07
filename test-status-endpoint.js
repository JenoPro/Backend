// Test the new status update endpoint
const testStatusUpdate = async () => {
  try {
    console.log('🧪 Testing status update endpoint...');
    
    const response = await fetch('http://localhost:3001/api/applicants/12/status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'Declined'
      })
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Status updated successfully');
      console.log('📊 Response:', result);
    } else {
      console.log('❌ FAILED! Status:', response.status);
      console.log('📊 Error Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

// Import fetch
const fetch = require('node-fetch');

testStatusUpdate();