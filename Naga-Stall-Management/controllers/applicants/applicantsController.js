// ===== APPLICANTS CONTROLLER =====
// All applicant-related functions consolidated by feature - organized with components

// Import all applicant components
import { getAllApplicants } from './applicantsComponents/getAllApplicants.js'
import { getApplicantById } from './applicantsComponents/getApplicantById.js'
import { createApplicant } from './applicantsComponents/createApplicant.js'
import { updateApplicant } from './applicantsComponents/updateApplicant.js'
import { deleteApplicant } from './applicantsComponents/deleteApplicant.js'
import { searchApplicants } from './applicantsComponents/searchApplicants.js'

// Export all applicant functions (components are called directly)
export {
  getAllApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  searchApplicants
}