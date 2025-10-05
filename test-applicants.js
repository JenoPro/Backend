// Test script to check what applicants exist in the database
import { createConnection } from './Naga-Stall-Management/config/database.js';

const testApplicants = async () => {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('🔍 Checking applicants in database...');
    
    // Get all applicants
    const [applicants] = await connection.execute(
      'SELECT * FROM applicant ORDER BY applicant_id LIMIT 5'
    );
    
    console.log('📋 Available applicants:');
    if (applicants.length === 0) {
      console.log('❌ No applicants found in database');
    } else {
      applicants.forEach(applicant => {
        console.log(`  ID: ${applicant.applicant_id}, Data:`, applicant);
      });
    }
    
    console.log(`\n📊 Total applicants: ${applicants.length}`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

testApplicants();