// ===== BRANCH MANAGEMENT CONTROLLER =====
// All branch-related functions consolidated by feature - organized with components

// Import all branch components
import { createBranch } from './branchComponents/createBranch.js'
import { getAllBranches } from './branchComponents/getAllBranches.js'
import { deleteBranch } from './branchComponents/deleteBranch.js'
import { createBranchManager } from './branchComponents/createBranchManager.js'
import { assignManager } from './branchComponents/assignManager.js'
import { updateBranchManager } from './branchComponents/updateBranchManager.js'
import { deleteBranchManager } from './branchComponents/deleteBranchManager.js'
import { getBranchManagerById } from './branchComponents/getBranchManagerById.js'
import { getAllBranchManagers } from './branchComponents/getAllBranchManagers.js'
import { getBranchesByArea } from './branchComponents/getBranchesByArea.js'
import { getAreas } from './branchComponents/getAreas.js'
import { getFloors } from './branchComponents/getFloors.js'
import { createFloor } from './branchComponents/createFloor.js'
import { getSections } from './branchComponents/getSections.js'
import { createSection } from './branchComponents/createSection.js'
import { getFloorsWithSections } from './branchComponents/getFloorsWithSections.js'
import { getAreasByCity } from './branchComponents/getAreasByCity.js'
import { getAreaById } from './branchComponents/getAreaById.js'
import { getCities } from './branchComponents/getCities.js'
import { getLocationsByCity } from './branchComponents/getLocationsByCity.js'

// Export all branch functions (components are called directly)
export {
  createBranch,
  getAllBranches,
  deleteBranch,
  createBranchManager,
  assignManager,
  updateBranchManager,
  deleteBranchManager,
  getBranchManagerById,
  getAllBranchManagers,
  getBranchesByArea,
  getAreas,
  getFloors,
  createFloor,
  getSections,
  createSection,
  getFloorsWithSections,
  getAreasByCity,
  getAreaById,
  getCities,
  getLocationsByCity
}