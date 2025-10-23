import http from 'http';

const data = JSON.stringify({
  firstName: 'Test',
  lastName: 'Employee',
  email: 'test@example.com',
  phoneNumber: '09123456789',
  branchId: 1,
  permissions: ['dashboard', 'stalls']
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/employees',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing POST /api/employees...');
console.log('Data:', data);

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', responseBody);
    try {
      const jsonResponse = JSON.parse(responseBody);
      console.log('Parsed Response:', JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      console.log('Response is not JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();