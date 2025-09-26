// Branch Manager CRUD Endpoints Testing Guide
// All endpoints require authentication with admin role
// Base URL: http://localhost:3001/api/branches/managers

// ============================================
// 1. GET ALL BRANCH MANAGERS
// ============================================
/*
GET /api/branches/managers
Headers: { Authorization: "Bearer <admin_token>" }

Query Parameters (all optional):
- status: Filter by status (Active/Inactive)
- branchId: Filter by specific branch ID  
- area: Filter by area name
- search: Search by name or username

Example:
GET /api/branches/managers?status=Active&area=Naga City&search=juan

Response:
{
  "success": true,
  "message": "Branch managers retrieved successfully",
  "data": [
    {
      "managerId": 1,
      "branchId": 1,
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "fullName": "Juan Dela Cruz",
      "username": "NCPM_Manager",
      "email": "manager.naga@nagastall.com",
      "contactNumber": "+63917111111",
      "status": "Active",
      "createdAt": "2025-09-07T05:00:00.000Z",
      "updatedAt": "2025-09-07T05:00:00.000Z",
      "branch": {
        "branchId": 1,
        "branchName": "Naga City Peoples Mall",
        "area": "Naga City",
        "location": "Peoples Mall",
        "address": "Peoples Mall Complex, Naga City, Camarines Sur",
        "contactNumber": "+63917123456",
        "email": "ncpm@nagastall.com",
        "status": "Active"
      },
      "designation": "Naga City - Peoples Mall"
    }
  ],
  "pagination": {
    "total": 4,
    "showing": 4
  },
  "statistics": {
    "total": 4,
    "active": 4,
    "inactive": 0,
    "branchesManaged": 4
  },
  "filters": {
    "status": "Active",
    "branchId": null,
    "area": "Naga City",
    "search": "juan"
  }
}
*/

// ============================================
// 2. GET BRANCH MANAGER BY ID
// ============================================
/*
GET /api/branches/managers/:managerId
Headers: { Authorization: "Bearer <admin_token>" }

Example:
GET /api/branches/managers/1

Response:
{
  "success": true,
  "message": "Branch manager retrieved successfully",
  "data": {
    "managerId": 1,
    "branchId": 1,
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "fullName": "Juan Dela Cruz",
    "username": "NCPM_Manager",
    "email": "manager.naga@nagastall.com",
    "contactNumber": "+63917111111",
    "status": "Active",
    "createdAt": "2025-09-07T05:00:00.000Z",
    "updatedAt": "2025-09-07T05:00:00.000Z",
    "branch": {
      "branchId": 1,
      "branchName": "Naga City Peoples Mall",
      "area": "Naga City",
      "location": "Peoples Mall",
      "address": "Peoples Mall Complex, Naga City, Camarines Sur",
      "contactNumber": "+63917123456",
      "email": "ncpm@nagastall.com"
    }
  }
}
*/

// ============================================
// 3. CREATE BRANCH MANAGER
// ============================================
/*
POST /api/branches/managers
Headers: { 
  Authorization: "Bearer <admin_token>",
  Content-Type: "application/json"
}

Body:
{
  "branch_id": 1,
  "first_name": "New",
  "last_name": "Manager",
  "manager_username": "new_manager",
  "manager_password": "password123",
  "email": "new.manager@nagastall.com",
  "contact_number": "+63917000000",
  "status": "Active"
}

Response:
{
  "success": true,
  "message": "Branch manager created successfully",
  "data": {
    "managerId": 5,
    "branchId": 1,
    "branchName": "Naga City Peoples Mall",
    "managerName": "New Manager",
    "action": "created"
  }
}
*/

// ============================================
// 4. UPDATE BRANCH MANAGER
// ============================================
/*
PUT /api/branches/managers/:managerId
Headers: { 
  Authorization: "Bearer <admin_token>",
  Content-Type: "application/json"
}

Body (all fields optional except firstName, lastName, username):
{
  "first_name": "Updated",
  "last_name": "Manager",
  "manager_username": "updated_manager",
  "manager_password": "newpassword123",  // Optional - only if changing password
  "email": "updated.manager@nagastall.com",
  "contact_number": "+63917111112",
  "status": "Active",
  "branch_id": 2  // Optional - to move manager to different branch
}

Example:
PUT /api/branches/managers/1

Response:
{
  "success": true,
  "message": "Branch manager updated successfully",
  "data": {
    "managerId": 1,
    "branchId": 2,
    "branchName": "SM Legazpi Branch",
    "managerName": "Updated Manager",
    "username": "updated_manager",
    "email": "updated.manager@nagastall.com",
    "contactNumber": "+63917111112",
    "status": "Active",
    "area": "Legazpi",
    "location": "SM Legazpi",
    "updatedAt": "2025-09-24T10:30:00.000Z",
    "action": "updated"
  }
}
*/

// ============================================
// 5. DELETE BRANCH MANAGER
// ============================================
/*
DELETE /api/branches/managers/:managerId
Headers: { Authorization: "Bearer <admin_token>" }

Example:
DELETE /api/branches/managers/1

Response:
{
  "success": true,
  "message": "Branch manager deleted successfully",
  "data": {
    "deletedManager": {
      "managerId": 1,
      "managerName": "Juan Dela Cruz",
      "username": "NCPM_Manager",
      "email": "manager.naga@nagastall.com",
      "contactNumber": "+63917111111",
      "status": "Active",
      "branchId": 1,
      "branchName": "Naga City Peoples Mall",
      "area": "Naga City",
      "location": "Peoples Mall",
      "createdAt": "2025-09-07T05:00:00.000Z",
      "updatedAt": "2025-09-07T05:00:00.000Z"
    },
    "action": "deleted"
  }
}
*/

// ============================================
// ERROR RESPONSES
// ============================================
/*
Common error responses:

400 Bad Request:
{
  "success": false,
  "message": "First name, last name, and username are required"
}

401 Unauthorized:
{
  "success": false,
  "message": "Access denied. Admin role required."
}

404 Not Found:
{
  "success": false,
  "message": "Branch manager not found"
}

409 Conflict:
{
  "success": false,
  "message": "Username already exists"
}

500 Internal Server Error:
{
  "success": false,
  "message": "Failed to update branch manager",
  "error": "Database connection failed"
}
*/

// ============================================
// FRONTEND INTEGRATION EXAMPLE
// ============================================
/*
// Vue.js/JavaScript example
const API_BASE = 'http://localhost:3001/api/branches/managers';

// Get auth token from storage
const token = sessionStorage.getItem('authToken');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// 1. Get all managers
const getAllManagers = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}?${params}`, { headers });
  return await response.json();
};

// 2. Get manager by ID
const getManagerById = async (managerId) => {
  const response = await fetch(`${API_BASE}/${managerId}`, { headers });
  return await response.json();
};

// 3. Create manager
const createManager = async (managerData) => {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(managerData)
  });
  return await response.json();
};

// 4. Update manager
const updateManager = async (managerId, managerData) => {
  const response = await fetch(`${API_BASE}/${managerId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(managerData)
  });
  return await response.json();
};

// 5. Delete manager
const deleteManager = async (managerId) => {
  const response = await fetch(`${API_BASE}/${managerId}`, {
    method: 'DELETE',
    headers
  });
  return await response.json();
};

// Usage examples:
// const managers = await getAllManagers({ status: 'Active', area: 'Naga City' });
// const manager = await getManagerById(1);
// const newManager = await createManager({ first_name: 'John', last_name: 'Doe', ... });
// const updatedManager = await updateManager(1, { first_name: 'Jane' });
// const deletedManager = await deleteManager(1);
*/