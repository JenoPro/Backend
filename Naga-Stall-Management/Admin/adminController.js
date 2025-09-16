// Parent Controller - Management Admin Controller
// This controller only imports and re-exports child functions (minimal code)

// Import all child functions
import { createAdminUser } from './createAdminUser/createAdminUser.js'
import { branchManagerLogin } from './branchManagerLogin/branchManagerLogin.js'
import { adminLogin } from './adminLogin/adminLogin.js'
import { logout } from './logout/logout.js'
import { getBranchManagerInfo } from './getBranchManagerInfo/getBranchManagerInfo.js'
import { getAreas } from './getAreas/getAreas.js'
import { getBranchesByArea } from './getBranchesByArea/getBranchesByArea.js'
import { createPasswordHash } from './createPasswordHash/createPasswordHash.js'
import { verifyToken } from './verifyToken/verifyToken.js'
import { getCurrentUser } from './getCurrentUser/getCurrentUser.js'
import { testDb } from './testDb/testDb.js'

// Re-export all child functions
export { 
  createAdminUser,
  branchManagerLogin,
  adminLogin,
  logout,
  getBranchManagerInfo,
  getAreas,
  getBranchesByArea,
  createPasswordHash,
  verifyToken,
  getCurrentUser,
  testDb
}
