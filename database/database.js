const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'naga_stall',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database helper class
class Database {
    constructor() {
        this.pool = pool;
    }

    // Execute a query
    async query(sql, params = []) {
        try {
            const [rows, fields] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Call a stored procedure
    async callProcedure(procedureName, params = []) {
        try {
            const placeholders = params.map(() => '?').join(', ');
            const sql = `CALL ${procedureName}(${placeholders})`;
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database procedure error:', error);
            throw error;
        }
    }

    // Transaction support
    async beginTransaction() {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    async commit(connection) {
        await connection.commit();
        connection.release();
    }

    async rollback(connection) {
        await connection.rollback();
        connection.release();
    }

    // Test database connection
    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            console.log('Database connected successfully');
            connection.release();
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            return false;
        }
    }

    // Get pool status
    getPoolStatus() {
        return {
            totalConnections: this.pool.pool._allConnections.length,
            freeConnections: this.pool.pool._freeConnections.length,
            usedConnections: this.pool.pool._allConnections.length - this.pool.pool._freeConnections.length
        };
    }

    // Close all connections
    async close() {
        await this.pool.end();
    }
}

// Create database instance
const db = new Database();

// Specific methods for common operations

// Admin operations
const adminOps = {
    async create(username, passwordHash, firstName, lastName, contactNumber, email) {
        return await db.callProcedure('createAdmin', [username, passwordHash, firstName, lastName, contactNumber, email]);
    },
    
    async getById(adminId) {
        return await db.callProcedure('getAdminById', [adminId]);
    },
    
    async getByUsername(username) {
        return await db.callProcedure('getAdminByUsername', [username]);
    },
    
    async update(adminId, firstName, lastName, contactNumber, email, status) {
        return await db.callProcedure('updateAdmin', [adminId, firstName, lastName, contactNumber, email, status]);
    }
};

// Applicant operations
const applicantOps = {
    async create(fullName, contactNumber, address, birthdate, civilStatus, educationalAttainment) {
        return await db.callProcedure('createApplicant', [fullName, contactNumber, address, birthdate, civilStatus, educationalAttainment]);
    },
    
    async getById(applicantId) {
        return await db.callProcedure('getApplicantById', [applicantId]);
    },
    
    async getAll() {
        return await db.callProcedure('getAllApplicants', []);
    },
    
    async update(applicantId, fullName, contactNumber, address, birthdate, civilStatus, educationalAttainment) {
        return await db.callProcedure('updateApplicant', [applicantId, fullName, contactNumber, address, birthdate, civilStatus, educationalAttainment]);
    },
    
    async delete(applicantId) {
        return await db.callProcedure('deleteApplicant', [applicantId]);
    }
};

// Application operations
const applicationOps = {
    async create(stallId, applicantId, applicationDate) {
        return await db.callProcedure('createApplication', [stallId, applicantId, applicationDate]);
    },
    
    async getById(applicationId) {
        return await db.callProcedure('getApplicationById', [applicationId]);
    },
    
    async getByStatus(status) {
        return await db.callProcedure('getApplicationsByStatus', [status]);
    },
    
    async updateStatus(applicationId, status) {
        return await db.callProcedure('updateApplicationStatus', [applicationId, status]);
    }
};

// Branch operations
const branchOps = {
    async create(adminId, branchName, area, location, address, contactNumber, email) {
        return await db.callProcedure('createBranch', [adminId, branchName, area, location, address, contactNumber, email]);
    },
    
    async getAll() {
        return await db.callProcedure('getAllBranches', []);
    },
    
    async getById(branchId) {
        return await db.callProcedure('getBranchById', [branchId]);
    },
    
    async update(branchId, branchName, area, location, address, contactNumber, email, status) {
        return await db.callProcedure('updateBranch', [branchId, branchName, area, location, address, contactNumber, email, status]);
    }
};

// Stall operations
const stallOps = {
    async create(sectionId, floorId, stallNo, stallLocation, size, rentalPrice, priceType, description, stallImage, createdByManager) {
        return await db.callProcedure('createStall', [sectionId, floorId, stallNo, stallLocation, size, rentalPrice, priceType, description, stallImage, createdByManager]);
    },
    
    async getAvailable() {
        return await db.callProcedure('getAvailableStalls', []);
    },
    
    async getByBranch(branchId) {
        return await db.callProcedure('getStallsByBranch', [branchId]);
    },
    
    async getById(stallId) {
        return await db.callProcedure('getStallById', [stallId]);
    }
};

// Inspector operations
const inspectorOps = {
    async add(firstName, lastName, email, contactNo, passwordPlain, branchId, dateHired, branchManagerId) {
        return await db.callProcedure('addInspector', [firstName, lastName, email, contactNo, passwordPlain, branchId, dateHired, branchManagerId]);
    },
    
    async terminate(inspectorId, reason, branchManagerId) {
        return await db.callProcedure('terminateInspector', [inspectorId, reason, branchManagerId]);
    },
    
    async view(branchId) {
        return await db.callProcedure('viewInspectors', [branchId]);
    }
};

// Violation operations
const violationOps = {
    async reportStallholder(inspectorId, stallholderId, violationId, branchId, stallId, evidence, remarks) {
        return await db.callProcedure('reportStallholder', [inspectorId, stallholderId, violationId, branchId, stallId, evidence, remarks]);
    },
    
    async reportExternal(inspectorId, violatorName, violationId, branchId, stallId, evidence, remarks) {
        return await db.callProcedure('reportExternalViolator', [inspectorId, violatorName, violationId, branchId, stallId, evidence, remarks]);
    },
    
    async getReports(violationId, branchId) {
        return await db.callProcedure('getViolationReports', [violationId, branchId]);
    },
    
    async getStallholderViolations(stallholderId, nameKeyword) {
        return await db.callProcedure('getStallholderViolations', [stallholderId, nameKeyword]);
    }
};

// Credential operations
const credentialOps = {
    async create(applicantId, username, passwordHash) {
        return await db.callProcedure('createCredential', [applicantId, username, passwordHash]);
    },
    
    async getByUsername(username) {
        return await db.callProcedure('getCredentialByUsername', [username]);
    },
    
    async updateLastLogin(username) {
        return await db.callProcedure('updateLastLogin', [username]);
    }
};

// Export everything
module.exports = {
    db,
    pool,
    adminOps,
    applicantOps,
    applicationOps,
    branchOps,
    stallOps,
    inspectorOps,
    violationOps,
    credentialOps
};