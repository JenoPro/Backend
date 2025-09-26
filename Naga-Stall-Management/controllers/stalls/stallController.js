// ===== STALL MANAGEMENT CONTROLLER =====
// All stall-related functions consolidated by feature - organized with components

// Import all stall components
import { addStall } from './stallComponents/addStall.js'
import { getAllStalls } from './stallComponents/getAllStalls.js'
import { getAvailableStalls } from './stallComponents/getAvailableStalls.js'
import { getStallById } from './stallComponents/getStallById.js'
import { getStallsByFilter } from './stallComponents/getStallsByFilter.js'
import { updateStall } from './stallComponents/updateStall.js'
import { deleteStall } from './stallComponents/deleteStall.js'

// Export all stall functions (components are called directly)
export {
  addStall,
  getAllStalls,
  getAvailableStalls,
  getStallById,
  getStallsByFilter,
  updateStall,
  deleteStall
}