// Check what emails exist in the other_information table
import { createConnection } from './Naga-Stall-Landingpage/config/database.js';

const checkEmails = async () => {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('🔍 Checking emails in other_information table...');
    
    const [emails] = await connection.execute(
      'SELECT applicant_id, email_address FROM other_information ORDER BY applicant_id'
    );
    
    console.log('📧 Existing emails:');
    if (emails.length === 0) {
      console.log('❌ No emails found in other_information table');
    } else {
      emails.forEach(email => {
        console.log(`  Applicant ID: ${email.applicant_id}, Email: ${email.email_address}`);
      });
    }
    
    console.log(`\n📊 Total emails: ${emails.length}`);
    
    // Also check applicant table to see the connection
    console.log('\n🔍 Checking corresponding applicants...');
    const [applicants] = await connection.execute(
      `SELECT a.applicant_id, a.applicant_full_name, o.email_address 
       FROM applicant a 
       LEFT JOIN other_information o ON a.applicant_id = o.applicant_id
       ORDER BY a.applicant_id`
    );
    
    console.log('👥 Applicant-Email mapping:');
    applicants.forEach(applicant => {
      console.log(`  ID: ${applicant.applicant_id}, Name: ${applicant.applicant_full_name}, Email: ${applicant.email_address || 'NO EMAIL'}`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

checkEmails();