// ===== APPLICANTS CONTROLLER =====
// All applicant-related functions consolidated by feature - organized with components

// Import all applicant components
import { getAllApplicants } from './applicantsComponents/getAllApplicants.js'
import { getApplicantById } from './applicantsComponents/getApplicantById.js'
import { createApplicant } from './applicantsComponents/createApplicant.js'
import { updateApplicant } from './applicantsComponents/updateApplicant.js'
import { deleteApplicant } from './applicantsComponents/deleteApplicant.js'
import { searchApplicants } from './applicantsComponents/searchApplicants.js'
import { getApplicantsByBranch } from './applicantsComponents/getApplicantsByBranch.js'
import { getApplicantsByStall } from './applicantsComponents/getApplicantsByStall.js'
import { getApplicantsByBranchManager } from './applicantsComponents/getApplicantsByBranchManager.js'
import { approveApplicant } from './applicantsComponents/approveApplicant.js'
import { declineApplicant } from './applicantsComponents/declineApplicant.js'
import { updateApplicantStatus } from './applicantsComponents/updateApplicantStatus.js'
import { storeCredentials, getAllCredentials } from './applicantsComponents/credentialsController.js'

// Import participant-specific components (approved applicants with stalls)
import { getAllParticipants } from './applicantsComponents/getAllParticipants.js'
import { getParticipantsByBranch } from './applicantsComponents/getParticipantsByBranch.js'
import { getParticipantsByStall } from './applicantsComponents/getParticipantsByStall.js'

// Export all applicant functions (components are called directly)
export {
  getAllApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  searchApplicants,
  getApplicantsByBranch,      // For viewing applicants in a specific branch
  getApplicantsByStall,       // For detailed stall applicant management
  getApplicantsByBranchManager, // For branch managers to see their assigned applicants
  approveApplicant,           // Approve applicant and store credentials
  declineApplicant,           // Decline applicant and delete all data
  updateApplicantStatus,      // Update applicant status (for frontend compatibility)
  storeCredentials,           // Store credentials for mobile app
  getAllCredentials,          // Get all stored credentials
  
  // Participant-specific functions (approved applicants with active stalls)
  getAllParticipants,         // Get all active participants (approved applicants with stalls)
  getParticipantsByBranch,    // Get participants in a specific branch
  getParticipantsByStall      // Get participants for a specific stall
}