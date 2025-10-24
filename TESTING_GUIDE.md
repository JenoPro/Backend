# 🧪 Employee Authentication Testing Guide

## Quick Test Steps

### 1️⃣ **Test Employee Login**

**Endpoint:** `POST http://localhost:3001/api/employees/login`

**Request Body:**
```json
{
  "username": "employee_username",
  "password": "employee_password",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Employee login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "employee_username",
    "role": "employee",
    "type": "employee",
    "userType": "employee",
    "permissions": {
      "stalls": true
    }
  }
}
```

**✅ Success Indicators:**
- Response has `token` field (JWT token)
- Response has `user.type = "employee"`
- Response has `user.permissions` object

---

### 2️⃣ **Test Stalls API Access**

**Endpoint:** `GET http://localhost:3001/api/stalls`

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response (with stalls permission):**
```json
{
  "success": true,
  "message": "Stalls retrieved successfully",
  "data": [...],
  "count": 5
}
```

**Expected Response (without stalls permission):**
```json
{
  "success": false,
  "message": "Access denied. Employee does not have stalls permission."
}
```

---

## 🔍 Debugging Checklist

### Backend Logs to Look For:

#### ✅ **Login Success:**
```
🔐 Employee login attempt for username: employee_username
🔍 Found employees: 1
✅ Employee login successful for: employee_username
🎯 Token payload: { userId: 1, role: 'employee', type: 'employee', userType: 'employee', permissions: {...} }
```

#### ✅ **API Authentication Success:**
```
🔍 Authenticated user details: {
  username: 'employee_username',
  userType: 'employee',
  role: 'employee',
  userId: 1
}
🔍 getAllStalls - User details: {
  userType: 'employee',
  userId: 1,
  branchId: 1,
  permissions: { stalls: true }
}
✅ Found 5 stalls for employee (ID: 1)
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Invalid token" error

**Cause:** Frontend is still using old session token

**Solution:**
```javascript
// Frontend fix - use data.token instead of data.session.token
sessionStorage.setItem('authToken', data.token); // ✅ Correct
// NOT: sessionStorage.setItem('authToken', data.session.token); // ❌ Wrong
```

---

### Issue 2: "Access denied. Employee does not have stalls permission"

**Cause:** Employee's permissions JSON doesn't include `stalls: true`

**Solution:** Update database
```sql
UPDATE employee 
SET permissions = '{"stalls": true}' 
WHERE employee_id = 1;
```

---

### Issue 3: "Branch ID not found for employee"

**Cause:** Employee record doesn't have a branch_id

**Solution:** Update database
```sql
UPDATE employee 
SET branch_id = 1 
WHERE employee_id = 1;
```

---

## 📱 Frontend Integration Example

```javascript
// Login function
async function employeeLogin(username, password) {
  try {
    const response = await fetch('http://localhost:3001/api/employees/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // ✅ Store JWT token
      sessionStorage.setItem('authToken', data.token);
      sessionStorage.setItem('userType', data.user.type);
      sessionStorage.setItem('permissions', JSON.stringify(data.user.permissions));
      console.log('✅ Login successful');
    }
  } catch (error) {
    console.error('❌ Login failed:', error);
  }
}

// API call function
async function fetchStalls() {
  const token = sessionStorage.getItem('authToken');
  
  try {
    const response = await fetch('http://localhost:3001/api/stalls', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Stalls loaded:', data.count);
      return data.data;
    } else {
      console.error('❌ Failed to load stalls:', data.message);
    }
  } catch (error) {
    console.error('❌ API error:', error);
  }
}
```

---

## 🎯 Verification Steps

### Step 1: Check Employee Login Response
- [ ] Response contains `token` field
- [ ] Response contains `user.type = "employee"`
- [ ] Response contains `user.permissions` object
- [ ] Token is a JWT (starts with "eyJ...")

### Step 2: Check Frontend Token Storage
- [ ] `sessionStorage.getItem('authToken')` returns JWT token
- [ ] Token is included in API requests as `Authorization: Bearer <token>`

### Step 3: Check Backend Logs
- [ ] See "✅ Employee login successful"
- [ ] See "🔍 Authenticated user details" with userType: 'employee'
- [ ] See "✅ Found X stalls for employee"

### Step 4: Check API Response
- [ ] GET /api/stalls returns 200 status (not 401)
- [ ] Response contains stalls data
- [ ] No "Unauthorized" errors in console

---

## 📊 Status Codes

| Code | Meaning | Likely Cause |
|------|---------|-------------|
| 200 | ✅ Success | Everything working correctly |
| 401 | ❌ Unauthorized | Invalid/expired token, or using session token instead of JWT |
| 403 | ❌ Forbidden | Employee doesn't have stalls permission |
| 400 | ❌ Bad Request | Missing branchId or other required field |
| 500 | ❌ Server Error | Database error or internal issue |

---

## 🔧 Database Verification

### Check Employee Permissions:
```sql
SELECT 
  employee_id,
  employee_username,
  permissions,
  branch_id,
  status
FROM employee
WHERE employee_username = 'your_employee_username';
```

**Expected Result:**
```
employee_id: 1
employee_username: employee_username
permissions: {"stalls": true}
branch_id: 1
status: Active
```

### Update Employee Permissions:
```sql
-- Grant stalls permission
UPDATE employee 
SET permissions = JSON_SET(
  COALESCE(permissions, '{}'),
  '$.stalls', true
)
WHERE employee_id = 1;

-- Verify update
SELECT employee_username, permissions 
FROM employee 
WHERE employee_id = 1;
```

---

## ✅ Success Criteria

**All tests pass when:**
1. Employee login returns JWT token ✅
2. Frontend stores JWT token in sessionStorage ✅
3. API requests include `Authorization: Bearer <jwt>` header ✅
4. Backend logs show employee authentication success ✅
5. GET /api/stalls returns 200 with stalls data ✅
6. No 401 Unauthorized errors in console ✅

---

**Happy Testing! 🎉**
