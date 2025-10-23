# Naga Stall Management System - Database Migration Guide

## 🚀 Quick Setup Instructions

### Prerequisites
- MySQL Server (version 5.7 or higher)
- Node.js with npm
- XAMPP or any MySQL-compatible server

### 1. Install Required Dependencies
```bash
npm install mysql2
```

### 2. Execute Database Setup

**Option A: Run Complete Setup (Recommended)**
```bash
mysql -u root -p < database/naga_stall_complete.sql
```

**Option B: Run Migrations Individually**
```bash
# Execute migrations in order
mysql -u root -p < database/migrations/001_initial_database_setup.sql
mysql -u root -p < database/migrations/002_remaining_tables.sql
mysql -u root -p < database/migrations/003_auction_raffle_system.sql
mysql -u root -p < database/migrations/004_inspector_violation_system.sql
mysql -u root -p < database/migrations/005_stored_procedures.sql
```

### 3. Database Configuration
Update your database connection settings in your Node.js application:

```javascript
const Database = require('./database/database.js');

// Initialize database connection
const db = new Database({
    host: 'localhost',
    user: 'root',
    password: 'your_mysql_password',
    database: 'naga_stall'
});
```

## 📁 Database Structure

### Migration Files
- `001_initial_database_setup.sql` - Core tables (admin, applicant, branch, stall, application)
- `002_remaining_tables.sql` - Supporting tables (business info, spouse, credentials, etc.)
- `003_auction_raffle_system.sql` - Auction and raffle functionality
- `004_inspector_violation_system.sql` - Inspector management and violations
### Key Features
- ✅ **Migration Tracking** - Prevents duplicate execution
- ✅ **Foreign Key Constraints** - Ensures data integrity
- ✅ **Stored Procedures** - 67+ procedures for all operations
- ✅ **Automatic Timestamps** - Created/updated timestamps
- ✅ **Comprehensive Indexing** - Optimized query performance

## 🔧 Usage Examples

### Using Stored Procedures
```javascript
// Get all available stalls
const availableStalls = await db.callProcedure('getAvailableStalls');

// Create new applicant
const newApplicant = await db.callProcedure('createApplicant', [
    'John Doe',
    '09123456789', 
    '123 Main St',
    '1990-01-01',
    'Single',
    'College Graduate'
]);

// Get applicant by ID
const applicant = await db.callProcedure('getApplicantById', [1]);
```

### Direct Database Operations
```javascript
// Query with parameters
const result = await db.query(
    'SELECT * FROM stall WHERE branch_id = ? AND is_available = ?',
    [1, 1]
);

// Transaction example
await db.executeTransaction(async (connection) => {
    await connection.query('INSERT INTO applicant (...) VALUES (...)', []);
    await connection.query('INSERT INTO application (...) VALUES (...)', []);
});
```

## 🏗️ Database Schema Overview

### Core Tables
- **admin** - System administrators
- **applicant** - Stall applicants
- **branch** - Market branches
- **stall** - Market stalls
- **application** - Stall applications

### Management Tables
- **stallholder** - Current stall holders
- **payment** - Payment records
- **inspector** - System inspectors
- **violation_report** - Violation tracking

### Supporting Tables
- **spouse** - Spouse information
- **business_information** - Business details
- **document** - Document management
- **auction/raffle** - Auction and raffle system

## 📊 Migration Status Tracking

The system includes a `migrations` table that tracks executed migrations:

```sql
-- Check migration status
SELECT * FROM migrations ORDER BY executed_at DESC;

-- Verify all migrations are complete
SELECT 
    COUNT(*) as total_migrations,
    GROUP_CONCAT(migration_name) as executed_migrations
FROM migrations;
```

## 🔒 Security Features

- Password hashing for all user types
- Parameterized queries to prevent SQL injection
- Role-based access through stored procedures
- Audit trails for inspector actions

## 📱 Cross-Platform Deployment

This migration system is designed to work on:
- ✅ XAMPP (Windows/Mac/Linux)
- ✅ WAMP (Windows)
- ✅ LAMP (Linux)
- ✅ MAMP (Mac)
- ✅ Cloud MySQL services (AWS RDS, Google Cloud SQL, etc.)

## 🚨 Troubleshooting

### Common Issues

**Error: Database doesn't exist**
```bash
# Create database manually first
mysql -u root -p -e "CREATE DATABASE naga_stall CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
```

**Error: Access denied**
```bash
# Make sure MySQL user has proper privileges
mysql -u root -p -e "GRANT ALL PRIVILEGES ON naga_stall.* TO 'your_user'@'localhost';"
```

**Error: Foreign key constraint fails**
- Ensure migrations are executed in the correct order (001, 002, 003, 004, 005)

### Verify Installation
```javascript
// Test database connection
const db = require('./database/database.js');

async function testConnection() {
    try {
        const result = await db.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = "naga_stall"');
        console.log(`✅ Database connected! Found ${result[0].table_count} tables.`);
        
        // Test stored procedure
        const procedures = await db.callProcedure('getAvailableStalls');
        console.log('✅ Stored procedures working!');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

testConnection();
```

## 📞 Support

If you encounter any issues during setup:
1. Check MySQL error logs
2. Verify all migration files executed successfully
3. Ensure proper MySQL user permissions
4. Check Node.js mysql2 package installation

---

**🎉 Your Naga Stall Management System database is now ready for deployment!**

The migration system ensures your database will automatically set up on any device with MySQL connectivity, meeting your professor's requirements for portable database deployment.

---

**🎉 Your Naga Stall Management System database is now ready for deployment!**

The migration system ensures your database will automatically set up on any device with MySQL connectivity, meeting your professor's requirements for portable database deployment.
- `getAllBranches()`
- `getBranchById(branch_id)`
- `updateBranch(branch_id, ...)`

### Branch Manager Management
- `createBranchManager(branch_id, username, password_hash, first_name, last_name, email, contact_number)`
- `getBranchManagerByUsername(username)`
- `getBranchManagersByBranch(branch_id)`

### Stall Management
- `createStall(section_id, floor_id, stall_no, stall_location, size, rental_price, price_type, description, stall_image, created_by_manager)`
- `getAvailableStalls()`
- `getStallsByBranch(branch_id)`
- `getStallById(stall_id)`
- `updateStall(stall_id, ...)`

### Inspector Management
- `addInspector(first_name, last_name, email, contact_no, password_plain, branch_id, date_hired, branch_manager_id)`
- `terminateInspector(inspector_id, reason, branch_manager_id)`
- `viewInspectors(branch_id)`

### Violation Management
- `reportStallholder(inspector_id, stallholder_id, violation_id, branch_id, stall_id, evidence, remarks)`
- `reportExternalViolator(inspector_id, violator_name, violation_id, branch_id, stall_id, evidence, remarks)`
- `getViolationReports(violation_id, branch_id)`
- `getStallholderViolations(stallholder_id, name_keyword)`
- `getExternalViolations(violation_id, branch_id)`

### Credential Management
- `createCredential(applicant_id, username, password_hash)`
- `getCredentialByUsername(username)`
- `updateLastLogin(username)`

### Business Information Management
- `createBusinessInformation(applicant_id, nature_of_business, capitalization, source_of_capital, previous_business_experience, relative_stall_owner)`
- `getBusinessInformationByApplicant(applicant_id)`

### Family Information Management
- `createSpouse(applicant_id, spouse_full_name, spouse_birthdate, spouse_educational_attainment, spouse_contact_number, spouse_occupation)`
- `getSpouseByApplicant(applicant_id)`
- `createOtherInformation(applicant_id, signature_of_applicant, house_sketch_location, valid_id, email_address)`
- `getOtherInformationByApplicant(applicant_id)`

## Usage Examples

### Creating a new applicant
```sql
CALL createApplicant('John Doe', '09123456789', '123 Main St', '1990-01-01', 'Single', 'College Graduate');
```

### Getting applicant by ID
```sql
CALL getApplicantById(1);
```

### Creating a stall application
```sql
CALL createApplication(1, 1, '2025-10-22');
```

### Reporting a violation
```sql
CALL reportStallholder(1, 1, 1, 1, 1, 'Evidence description', 'Violation remarks');
```

## Views Available

- `active_auctions_view` - Active auction listings
- `active_raffles_view` - Active raffle listings
- `stalls_with_raffle_auction_view` - Comprehensive stall view with auction/raffle data
- `view_compliant_stallholders` - Compliant stallholders only
- `view_inspector_activity_log` - Inspector activity history
- `view_violation_penalty` - Violation penalties with details

## Security Notes

1. All passwords should be hashed before storing
2. Use prepared statements when calling procedures from your application
3. Implement proper authentication and authorization in your backend
4. Regular database backups are recommended

## Database Configuration

Make sure your MySQL server has the following settings:
- Character set: utf8mb4
- Collation: utf8mb4_general_ci
- SQL Mode: NO_AUTO_VALUE_ON_ZERO
- Time zone: +00:00

## Troubleshooting

1. **Permission errors**: Make sure your MySQL user has CREATE, ALTER, and EXECUTE privileges
2. **Foreign key errors**: Tables must be created in the correct order (use the complete setup file)
3. **Charset issues**: Ensure your MySQL connection uses utf8mb4 encoding

For any issues, check the MySQL error log and ensure all prerequisites are met.