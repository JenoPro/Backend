// Simple test to check if approve endpoint is accessible
import fetch from 'node-fetch';

const testApproveEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/applicants/4/approve', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiTkNQTV9NYW5hZ2VyIiwidXNlclR5cGUiOiJicmFuY2hfbWFuYWdlciIsInJvbGUiOiJicmFuY2hfbWFuYWdlciIsImlhdCI6MTczNjE4NTE0MywiZXhwIjoxNzM2MjcxNTQzfQ.QeXI_54qUcMZjZfBJrE4qe7qbfhAJh1wuH5c6WQtbPQ'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, response.headers.raw());
    
    if (response.status === 404) {
      console.log('❌ 404 Error - Endpoint not found');
    } else {
      const data = await response.json();
      console.log('📋 Response Data:', data);
    }
    
  } catch (error) {
    console.error('❌ Request Error:', error.message);
  }
};

// Wait a moment for server to start
setTimeout(testApproveEndpoint, 3000);