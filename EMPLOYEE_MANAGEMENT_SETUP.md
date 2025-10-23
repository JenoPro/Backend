# Employee Management System - Complete Setup Guide

## 🎉 System Overview

The Employee Management System has been successfully integrated into your Naga Stall Management backend with the following features:

### ✅ **Core Features**
- **Auto-Generated Credentials**: EMP + 4 digits username, secure 8-character passwords
- **Email Notifications**: Welcome emails and password reset notifications  
- **Permission Management**: Granular access control system
- **Activity Tracking**: Complete audit trail of all employee actions
- **Session Management**: Secure login/logout with session tracking
- **Database Integration**: Proper foreign keys and relationships

## 📁 **File Structure Created**

```
Naga-Stall-Management/
├── controllers/
│   └── employees/
│       ├── employeeController.js              # Main controller
│       └── employeeComponents/
│           ├── createEmployee.js              # Auto-generate credentials
│           ├── getAllEmployees.js             # List with filtering
│           ├── getEmployeeById.js             # Detailed employee info
│           ├── getEmployeesByBranch.js        # Branch-specific employees
│           ├── updateEmployee.js              # Update employee data
│           ├── deleteEmployee.js              # Deactivate employee
│           ├── resetEmployeePassword.js       # Password reset with email
│           ├── loginEmployee.js               # Employee authentication
│           ├── logoutEmployee.js              # Session termination
│           ├── updateEmployeePermissions.js   # Permission management
│           ├── getEmployeeActivity.js         # Activity logs
│           └── searchEmployees.js             # Advanced search
├── routes/
│   └── employeeRoutes.js                      # All employee API endpoints
└── services/
    └── emailService.js                        # Email notification system

database/
└── migrations/
    └── 006_employee_management_system.sql     # Employee tables & templates
```

## 🔧 **Database Structure**

### **New Tables Added:**
- `employee` - Main employee records with auto-generated credentials
- `employee_session` - Login session tracking
- `employee_password_reset` - Password reset tokens
- `employee_activity_log` - Complete audit trail
- `employee_email_template` - HTML email templates
- `employee_credential_log` - Credential change history

### **Stored Procedures Added:**
- `createEmployee()` - Create with auto credentials
- `getEmployeeById()` - Get detailed employee info
- `getAllEmployees()` - List with filtering
- `updateEmployee()` - Update employee data
- `deleteEmployee()` - Deactivate employee
- `resetEmployeePassword()` - Reset with new password
- `loginEmployee()` - Authenticate and create session
- `logoutEmployee()` - Terminate session
- `getEmployeesByBranch()` - Branch-specific lists

## 🚀 **Setup Instructions**

### 1. **Database Migration**
```bash
# Run the complete database setup (includes employee system)
mysql -u root -p < database/naga_stall_complete.sql
```

### 2. **Install Dependencies**
```bash
# Add required packages for email functionality
npm install nodemailer bcryptjs
```

### 3. **Environment Configuration**
Add to your `.env` file:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@nagastallmanagement.com
FROM_NAME=Naga Stall Management System
APP_BASE_URL=http://localhost:3000

# Development mode (emails will log to console)
NODE_ENV=development
```

### 4. **Server Integration**
The employee routes are already integrated into `Server-Admin.js`:
```javascript
app.use('/api/employees', employeeRoutes)
```

## 📡 **API Endpoints**

### **Employee CRUD**
```http
POST   /api/employees                     # Create employee (auto-credentials)
GET    /api/employees                     # List all employees
GET    /api/employees/:id                 # Get employee details
PUT    /api/employees/:id                 # Update employee
DELETE /api/employees/:id                 # Deactivate employee
```

### **Authentication**
```http
POST   /api/employees/login               # Employee login
POST   /api/employees/logout              # Employee logout
```

### **Management**
```http
POST   /api/employees/:id/reset-password  # Reset password
PUT    /api/employees/:id/permissions     # Update permissions
GET    /api/employees/:id/activity        # Get activity log
GET    /api/employees/branch/:branchId    # Get by branch
GET    /api/employees/search              # Search employees
```

## 💻 **Usage Examples**

### **1. Create New Employee**
```javascript
const response = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe', 
        email: 'john.doe@example.com',
        phoneNumber: '09123456789',
        branchId: 1,
        createdByManager: 1,
        permissions: {
            dashboard: true,
            stalls: true,
            payments: false
        }
    })
});

// Response includes auto-generated credentials
const result = await response.json();
console.log('Username:', result.data.credentials.username); // EMP1234
console.log('Password:', result.data.credentials.password); // AbcDef12
```

### **2. Employee Login**
```javascript
const loginResponse = await fetch('/api/employees/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'EMP1234',
        password: 'AbcDef12',
        ipAddress: '192.168.1.100',
        userAgent: navigator.userAgent
    })
});

const loginResult = await loginResponse.json();
// Store session token for authenticated requests
const sessionToken = loginResult.data.session.token;
```

### **3. Reset Employee Password**
```javascript
const resetResponse = await fetch('/api/employees/123/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        resetBy: 1 // Manager ID
    })
});

// New password is auto-generated and emailed to employee
const resetResult = await resetResponse.json();
console.log('New Password:', resetResult.data.new_password);
```

## 📧 **Email System**

### **Development Mode**
- Emails are logged to console for testing
- No actual emails sent

### **Production Mode**
- Configure SMTP settings in environment variables
- Supports Gmail, SendGrid, AWS SES, etc.
- HTML email templates with responsive design

### **Email Templates**
- **Welcome Email**: Sent when employee is created
- **Password Reset**: Sent when password is reset
- **Custom Notifications**: For general communications

## 🔒 **Security Features**

- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Secure token-based sessions
- **Auto-Logout**: Sessions terminated on password reset
- **Activity Logging**: Complete audit trail
- **Permission System**: Granular access control

## 🧪 **Testing**

### **1. Test Database Setup**
```sql
-- Verify employee tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'naga_stall' AND table_name LIKE 'employee%';

-- Test stored procedure
CALL createEmployee('EMP9999', 'hashedpass', 'Test', 'User', 'test@example.com', '09123456789', 1, 1, '{}');
```

### **2. Test API Endpoints**
```bash
# Test employee creation
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Employee","email":"test@example.com","branchId":1,"createdByManager":1}'

# Test employee login
curl -X POST http://localhost:3001/api/employees/login \
  -H "Content-Type: application/json" \
  -d '{"username":"EMP1234","password":"generated-password"}'
```

### **3. Test Email Service**
```javascript
// Test email configuration
const emailService = require('./Naga-Stall-Management/services/emailService');
await emailService.testEmailConfiguration();
```

## 🚨 **Common Issues & Solutions**

### **Error: Routes not found**
- Ensure `employeeRoutes.js` is properly imported in `Server-Admin.js`
- Check file extensions (.js vs .mjs)

### **Error: Database tables not found**
- Run migration 006: `mysql -u root -p < database/migrations/006_employee_management_system.sql`
- Check if migration was recorded: `SELECT * FROM migrations WHERE migration_name LIKE '%employee%'`

### **Error: Email sending failed**
- Check SMTP configuration in environment variables
- In development, emails are logged to console
- Verify `nodemailer` is installed

### **Error: Permission denied**
- Check database user permissions
- Ensure foreign key constraints are satisfied
- Verify branch_manager exists for `createdByManager`

## 🎯 **Next Steps**

1. **Frontend Integration**: Connect your Vue.js employee component to these APIs
2. **Authentication Middleware**: Add session validation middleware
3. **Production Email**: Configure production SMTP service
4. **Monitoring**: Add logging and monitoring for employee activities
5. **Backup**: Set up regular database backups for employee data

---

## 🎉 **Success!**

Your Employee Management System is now fully integrated and ready to use! The system provides:

- ✅ **Complete CRUD operations** for employee management
- ✅ **Auto-generated secure credentials** with email notifications
- ✅ **Comprehensive permission system** for access control
- ✅ **Activity tracking and audit trails** for compliance
- ✅ **Session management** for security
- ✅ **Database integrity** with proper relationships
- ✅ **Email notification system** with beautiful templates

The system follows your existing code patterns and integrates seamlessly with your ServerChild/Server-Management architecture!