// Parent Controller - Landing Page Stall Controller
// This controller only imports and re-exports child functions (minimal code)

// Import all child functions
import { getAllStalls } from "./LandingPageComponents-StallController/getAllStalls/getAllStalls.js";
import { getStallById } from "./LandingPageComponents-StallController/getStallById/getStallById.js";
import { getAvailableAreas } from "./LandingPageComponents-StallController/getAvailableAreas/getAvailableAreas.js";
import { getBranches } from "./LandingPageComponents-StallController/getBranches/getBranches.js";
import { getStallsByArea } from "./LandingPageComponents-StallController/getStallsByArea/getStallsByArea.js";
import { getLocationsByArea } from "./LandingPageComponents-StallController/getLocationsByArea/getLocationsByArea.js";
import { getFilteredStalls } from "./LandingPageComponents-StallController/getFilteredStalls/getFilteredStalls.js";
import { getStallsByLocation } from "./LandingPageComponents-StallController/getStallsByLocation/getStallsByLocation.js";
import { getAvailableMarkets } from "./LandingPageComponents-StallController/getAvailableMarkets/getAvailableMarkets.js";

// Re-export all child functions
export {
  getAllStalls,
  getStallById,
  getAvailableAreas,
  getBranches,
  getStallsByArea,
  getLocationsByArea,
  getFilteredStalls,
  getStallsByLocation,
  getAvailableMarkets,
};
