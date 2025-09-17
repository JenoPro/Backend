// Parent Controller - Branch Management Controller
// This controller only imports and re-exports child functions (minimal code)

// Import all child functions
import { getAllBranches } from './BranchComponents-BranchController/getAllBranches/getAllBranches.js'
import { createBranch } from './BranchComponents-BranchController/createBranch/createBranch.js'
import { assignManager } from './BranchComponents-BranchController/assignManager/assignManager.js'
import { createBranchManager } from './BranchComponents-BranchController/createBranchManager/createBranchManager.js'
import { deleteBranch } from './BranchComponents-BranchController/deleteBranch/deleteBranch.js'

// Re-export all child functions
export {
  getAllBranches,
  createBranch,
  assignManager,
  createBranchManager,
  deleteBranch
}