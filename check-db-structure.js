// Test database structure to see actual columns
import { createConnection } from './Naga-Stall-Management/config/database.js'

async function checkDatabaseStructure() {
  let connection
  try {
    connection = await createConnection()
    
    console.log('🔍 Checking database table structures...')
    
    // Check branch_manager table structure
    console.log('\n📋 branch_manager table structure:')
    const [bmColumns] = await connection.execute('DESCRIBE branch_manager')
    bmColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    
    // Check if branch table exists (you mentioned it in your description)
    console.log('\n📋 Checking if branch table exists:')
    try {
      const [branches] = await connection.execute('DESCRIBE branch')
      console.log('✅ Branch table exists:')
      branches.forEach(col => {
        console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`)
      })
    } catch (error) {
      console.log('❌ Branch table does not exist:', error.message)
    }
    
    // Check floor table structure  
    console.log('\n📋 floor table structure:')
    const [floorColumns] = await connection.execute('DESCRIBE floor')
    floorColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    
    // Sample data from branch_manager
    console.log('\n📊 Sample branch_manager data:')
    const [sampleManagers] = await connection.execute('SELECT * FROM branch_manager LIMIT 1')
    if (sampleManagers.length > 0) {
      console.log('Sample record fields:', Object.keys(sampleManagers[0]))
    }
    
  } catch (error) {
    console.error('❌ Database structure check failed:', error)
  } finally {
    if (connection) await connection.end()
  }
}

checkDatabaseStructure()