// Test if our approve function can be imported without errors
import { approveApplicant } from './Naga-Stall-Management/controllers/applicants/applicantsComponents/approveApplicant.js';

console.log('✅ approveApplicant imported successfully:', typeof approveApplicant);

// Test if the controller exports work
import * as applicantsController from './Naga-Stall-Management/controllers/applicants/applicantsController.js';

console.log('📋 Available controller functions:');
Object.keys(applicantsController).forEach(key => {
  console.log(`  - ${key}: ${typeof applicantsController[key]}`);
});