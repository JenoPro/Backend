// Simple test without external dependencies
import { createConnection } from './Naga-Stall-Landingpage/config/database.js';

const testDirectly = async () => {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('🧪 Testing database connection after trigger fix...');
    
    // Try a simple query first
    const [results] = await connection.execute('SELECT COUNT(*) as count FROM applicant');
    console.log('✅ Database connected. Current applicants:', results[0].count);
    
    // Test inserting into applicant table (this should trigger the application table insert)
    const testData = {
      first_name: 'TestDirect',
      last_name: 'User',
      email: 'testdirect@test.com',
      contact_number: '09123456789',
      address: '123 Test Street',
      birthdate: '1990-01-15',
      birthplace: 'Test City',
      age: '34',
      gender: 'Male',
      civil_status: 'Single',
      nationality: 'Filipino'
    };
    
    const [result] = await connection.execute(`
      INSERT INTO applicant (
        first_name, last_name, email, contact_number, address, 
        birthdate, birthplace, age, gender, civil_status, nationality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testData.first_name, testData.last_name, testData.email, testData.contact_number,
      testData.address, testData.birthdate, testData.birthplace, testData.age,
      testData.gender, testData.civil_status, testData.nationality
    ]);
    
    console.log('✅ Successfully inserted test applicant with ID:', result.insertId);
    
    // Now test inserting into application table (this was causing the trigger error)
    const applicationData = {
      applicant_id: result.insertId,
      application_type: 'New',
      stall_area: 'Naga City',
      stall_location: 'Peoples Mall',
      stall_section: 'A1',
      stall_number: '101'
    };
    
    const [appResult] = await connection.execute(`
      INSERT INTO application (
        applicant_id, application_type, stall_area, stall_location, 
        stall_section, stall_number
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      applicationData.applicant_id, applicationData.application_type,
      applicationData.stall_area, applicationData.stall_location,
      applicationData.stall_section, applicationData.stall_number
    ]);
    
    console.log('✅ SUCCESS! Application inserted without trigger error. ID:', appResult.insertId);
    console.log('🎉 The trigger conflict has been resolved!');
    
    // Clean up test data
    await connection.execute('DELETE FROM application WHERE id = ?', [appResult.insertId]);
    await connection.execute('DELETE FROM applicant WHERE id = ?', [result.insertId]);
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('trigger') || error.message.includes('auction')) {
      console.log('⚠️  The trigger issue still exists');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

testDirectly();