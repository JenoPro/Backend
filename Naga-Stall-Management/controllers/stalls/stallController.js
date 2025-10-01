// ===== STALL MANAGEMENT CONTROLLER =====
// All stall-related functions consolidated by feature - organized with components

// Import core stall components
import { addStall } from './stallComponents/addStall.js'
import { getAllStalls } from './stallComponents/getAllStalls.js'
import { getAvailableStalls } from './stallComponents/getAvailableStalls.js'
import { getStallById } from './stallComponents/getStallById.js'
import { getStallsByFilter } from './stallComponents/getStallsByFilter.js'
import { updateStall } from './stallComponents/updateStall.js'
import { deleteStall } from './stallComponents/deleteStall.js'
import { getLiveStallInfo, startLiveSession } from './stallComponents/getLiveStallInfo.js'

// Import raffle components
import { createRaffle } from './stallComponents/raffleComponents/createRaffle.js'
import { joinRaffle } from './stallComponents/raffleComponents/joinRaffle.js'
import { getActiveRaffles, getRaffleDetails } from './stallComponents/raffleComponents/getRaffles.js'
import { extendRaffleTimer, cancelRaffle } from './stallComponents/raffleComponents/manageRaffle.js'
import { selectRaffleWinner, autoSelectWinnerForExpiredRaffles } from './stallComponents/raffleComponents/selectWinner.js'

// Import auction components
import { createAuction } from './stallComponents/auctionComponents/createAuction.js'
import { placeBid } from './stallComponents/auctionComponents/placeBid.js'
import { getActiveAuctions, getAuctionDetails } from './stallComponents/auctionComponents/getAuctions.js'
import { extendAuctionTimer, cancelAuction } from './stallComponents/auctionComponents/manageAuction.js'
import { selectAuctionWinner, autoSelectWinnerForExpiredAuctions } from './stallComponents/auctionComponents/selectWinner.js'

// Export all stall functions (components are called directly)
export {
  // Core stall management
  addStall,
  getAllStalls,
  getAvailableStalls,
  getStallById,
  getStallsByFilter,
  updateStall,
  deleteStall,
  getLiveStallInfo,
  startLiveSession,
  
  // Raffle management
  createRaffle,
  joinRaffle,
  getActiveRaffles,
  getRaffleDetails,
  extendRaffleTimer,
  cancelRaffle,
  selectRaffleWinner,
  autoSelectWinnerForExpiredRaffles,
  
  // Auction management
  createAuction,
  placeBid,
  getActiveAuctions,
  getAuctionDetails,
  extendAuctionTimer,
  cancelAuction,
  selectAuctionWinner,
  autoSelectWinnerForExpiredAuctions
}