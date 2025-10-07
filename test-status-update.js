// Test the status update endpoint that was causing the 404 error
import fetch from 'node-fetch';

const testStatusUpdate = async () => {
  try {
    console.log('🧪 Testing applicant status update endpoint...');
    
    // Test data that matches what the frontend is sending
    const statusUpdate = {
      status: 'Rejected',
      decline_reason: 'Application incomplete',
      declined_at: new Date().toISOString()
    };

    console.log('📤 Testing with data:', statusUpdate);
    console.log('🎯 URL: PUT http://localhost:3001/api/applicants/12/status');
    
    // Use fetch to test the endpoint
    const response = await fetch('http://localhost:3001/api/applicants/12/status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test won't include auth token, so it should return 401
        // In real frontend, this would include: Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(statusUpdate)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists! (Got expected 401 - Unauthorized without token)');
      console.log('🎯 The 404 error should now be fixed in the frontend');
    } else if (response.status === 404) {
      console.log('❌ Still getting 404 - endpoint might not be registered properly');
    } else {
      const result = await response.text();
      console.log('📦 Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

testStatusUpdate();