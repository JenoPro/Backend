// Parent Controller - Management Stall Controller
// Imports all child functions and re-exports them

// Import all child functions
import { getAllStalls } from './AdminComponents-StallController/getAllStalls/getAllStalls.js'
import { getStallById } from './AdminComponents-StallController/getStallById/getStallById.js'
import { addStall } from './AdminComponents-StallController/addStall/addStall.js'
import { updateStall } from './AdminComponents-StallController/updateStall/updateStall.js'
import { deleteStall } from './AdminComponents-StallController/deleteStall/deleteStall.js'
import { getAvailableStalls } from './AdminComponents-StallController/getAvailableStalls/getAvailableStalls.js'
import { getStallsByFilter } from './AdminComponents-StallController/getStallsByFilter/getStallsByFilter.js'

// Re-export all functions so routes can still import from this file
export { 
  getAllStalls,
  getStallById,
  addStall,
  updateStall,
  deleteStall,
  getAvailableStalls,
  getStallsByFilter
}


