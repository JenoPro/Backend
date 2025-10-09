import mysql from 'mysql2/promise'

async function checkSpouseData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'naga_stall'
  })

  try {
    // Check if there's spouse data for applicant ID 12
    const [spouseData] = await connection.execute(
      'SELECT * FROM spouse WHERE applicant_id = 12'
    )
    
    if (spouseData.length > 0) {
      console.log('✅ Spouse data found for applicant 12:')
      console.log(spouseData[0])
    } else {
      console.log('❌ No spouse data found for applicant 12')
      console.log('Creating test spouse data...')
      
      // Create test spouse data
      await connection.execute(
        `INSERT INTO spouse (applicant_id, spouse_full_name, spouse_birthdate, spouse_educational_attainment, spouse_contact_number, spouse_occupation) 
         VALUES (12, 'Maria Laurente', '1990-05-15', 'College Graduate', '09123456789', 'Teacher')`,
      )
      
      console.log('✅ Test spouse data created')
    }
    
    // Also check civil status of applicant
    const [applicantData] = await connection.execute(
      'SELECT applicant_civil_status FROM applicant WHERE applicant_id = 12'
    )
    
    if (applicantData.length > 0) {
      console.log('👤 Applicant civil status:', applicantData[0].applicant_civil_status)
      
      // Update civil status to Married if it's Single
      if (applicantData[0].applicant_civil_status === 'Single') {
        await connection.execute(
          'UPDATE applicant SET applicant_civil_status = ? WHERE applicant_id = 12',
          ['Married']
        )
        console.log('✅ Updated civil status to Married')
      }
    }
    
  } catch (error) {
    console.error('Database error:', error)
  } finally {
    await connection.end()
  }
}

checkSpouseData()