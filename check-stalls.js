// Quick check for stalls and their relationships
import { createConnection } from './Naga-Stall-Management/config/database.js'

async function checkStalls() {
  let connection
  try {
    connection = await createConnection()
    
    console.log('🔍 Checking stall data...\n')
    
    // Check stall table structure  
    console.log('📋 stall table structure:')
    const [stallColumns] = await connection.execute('DESCRIBE stall')
    stallColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    
    // Count stalls
    console.log('\n📊 Stall counts:')
    const [stallCount] = await connection.execute('SELECT COUNT(*) as total FROM stall')
    console.log(`   Total stalls: ${stallCount[0].total}`)
    
    // Check section table structure
    console.log('\n📋 section table structure:')
    const [sectionColumns] = await connection.execute('DESCRIBE section')
    sectionColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    
    // Count sections
    const [sectionCount] = await connection.execute('SELECT COUNT(*) as total FROM section')
    console.log(`\n📊 Total sections: ${sectionCount[0].total}`)
    
    // Count floors
    const [floorCount] = await connection.execute('SELECT COUNT(*) as total FROM floor')
    console.log(`📊 Total floors: ${floorCount[0].total}`)
    
    // Count branches 
    const [branchCount] = await connection.execute('SELECT COUNT(*) as total FROM branch')
    console.log(`📊 Total branches: ${branchCount[0].total}`)
    
    // Check if there are any branch managers
    const [bmCount] = await connection.execute('SELECT COUNT(*) as total FROM branch_manager')
    console.log(`📊 Total branch managers: ${bmCount[0].total}`)
    
    if (stallCount[0].total > 0) {
      console.log('\n📋 Sample stall data:')
      const [sampleStalls] = await connection.execute('SELECT * FROM stall LIMIT 3')
      sampleStalls.forEach(stall => {
        console.log(`   Stall ID: ${stall.stall_id}, No: ${stall.stall_no}, Status: ${stall.status}, Available: ${stall.is_available}`)
      })
      
      // Try the exact query from getStallsByFilter
      console.log('\n🔍 Testing filter query with sample branch manager...')
      if (bmCount[0].total > 0) {
        const [bmSample] = await connection.execute('SELECT branch_manager_id FROM branch_manager LIMIT 1')
        const branchManagerId = bmSample[0].branch_manager_id
        console.log(`   Using branch_manager_id: ${branchManagerId}`)
        
        const [testResult] = await connection.execute(
          `SELECT 
            s.stall_id, s.stall_no, s.status, s.is_available,
            sec.section_name, f.floor_name, b.branch_name
          FROM stall s
          INNER JOIN section sec ON s.section_id = sec.section_id
          INNER JOIN floor f ON sec.floor_id = f.floor_id  
          INNER JOIN branch b ON f.branch_id = b.branch_id
          INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
          WHERE bm.branch_manager_id = ?
          LIMIT 5`,
          [branchManagerId]
        )
        
        console.log(`   Query returned ${testResult.length} stalls`)
        testResult.forEach(stall => {
          console.log(`   - Stall ${stall.stall_no} in ${stall.branch_name}/${stall.floor_name}/${stall.section_name}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    if (connection) await connection.end()
  }
}

checkStalls()