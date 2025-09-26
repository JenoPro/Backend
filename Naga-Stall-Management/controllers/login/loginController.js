// ===== LOGIN/AUTHENTICATION CONTROLLER =====
// All login and authentication functions consolidated by feature - organized with components

// Import all login components
import { adminLogin } from './loginComponents/adminLogin.js'
import { branchManagerLogin } from './loginComponents/branchManagerLogin.js'
import { verifyToken } from './loginComponents/verifyToken.js'
import { logout } from './loginComponents/logout.js'
import { getCurrentUser } from './loginComponents/getCurrentUser.js'
import { createAdminUser } from './loginComponents/createAdminUser.js'
import { createPasswordHash } from './loginComponents/createPasswordHash.js'
import { testDb } from './loginComponents/testDb.js'

// Export all login functions (components are called directly)
export {
  adminLogin,
  branchManagerLogin,
  verifyToken,
  logout,
  getCurrentUser,
  createAdminUser,
  createPasswordHash,
  testDb
}