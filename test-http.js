// Simple HTTP test using Node.js built-in modules
import http from 'http';

const testEndpoint = () => {
  const data = JSON.stringify({
    username: 'testuser',
    password: 'testpass123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/applicants/4/approve',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiTkNQTV9NYW5hZ2VyIiwidXNlclR5cGUiOiJicmFuY2hfbWFuYWdlciIsInJvbGUiOiJicmFuY2hfbWFuYWdlciIsImlhdCI6MTczNjE4NTE0MywiZXhwIjoxNzM2MjcxNTQzfQ.QeXI_54qUcMZjZfBJrE4qe7qbfhAJh1wuH5c6WQtbPQ',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📊 Headers:`, res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('📋 Response Body:', responseData);
      if (res.statusCode === 404) {
        console.log('❌ 404 Error - Endpoint not found or not accessible');
      } else if (res.statusCode === 200) {
        console.log('✅ Success - Endpoint is working!');
      } else {
        console.log(`⚠️  Unexpected status: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
  });

  req.write(data);
  req.end();
};

console.log('🚀 Testing approve endpoint...');
setTimeout(testEndpoint, 1000);