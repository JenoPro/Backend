// Parent Controller - Management Admin Controller
// This controller only imports and re-exports child functions (minimal code)

// Import all child functions
import { createAdminUser } from './BranchManagerComponents-Controller/createAdminUser/createAdminUser.js'
import { branchManagerLogin } from './BranchManagerComponents-Controller/branchManagerLogin/branchManagerLogin.js'
import { adminLogin } from './BranchManagerComponents-Controller/adminLogin/adminLogin.js'
import { logout } from './BranchManagerComponents-Controller/logout/logout.js'
import { getBranchManagerInfo } from './BranchManagerComponents-Controller/getBranchManagerInfo/getBranchManagerInfo.js'
import { getAreas } from './BranchManagerComponents-Controller/getAreas/getAreas.js'
import { getBranchesByArea } from './BranchManagerComponents-Controller/getBranchesByArea/getBranchesByArea.js'
import { createPasswordHash } from './BranchManagerComponents-Controller/createPasswordHash/createPasswordHash.js'
import { verifyToken } from './BranchManagerComponents-Controller/verifyToken/verifyToken.js'
import { getCurrentUser } from './BranchManagerComponents-Controller/getCurrentUser/getCurrentUser.js'
import { testDb } from './BranchManagerComponents-Controller/testDb/testDb.js'

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
