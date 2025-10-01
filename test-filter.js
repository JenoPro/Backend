// Test filter endpoint directly
import { createConnection } from './Naga-Stall-Management/config/database.js'

async function testFilterEndpoint() {
  let connection
  try {
    connection = await createConnection()
    
    console.log('🧪 Testing filter logic...\n')
    
    // Test with different scenarios
    const testCases = [
      { branchManagerId: 1, filters: {}, description: 'No filters' },
      { branchManagerId: 1, filters: { status: 'Active' }, description: 'Status filter only' },
      { branchManagerId: 1, filters: { available: 'true' }, description: 'Available filter only' },
      { branchManagerId: 999, filters: {}, description: 'Invalid branch manager ID' }
    ]
    
    for (const testCase of testCases) {
      console.log(`📋 Test: ${testCase.description}`)
      console.log(`   Branch Manager ID: ${testCase.branchManagerId}`)
      console.log(`   Filters: ${JSON.stringify(testCase.filters)}`)
      
      let whereClause = 'WHERE bm.branch_manager_id = ?'
      let queryParams = [testCase.branchManagerId]
      
      const { status, size, available, priceMin, priceMax } = testCase.filters
      
      if (status) {
        whereClause += ' AND s.status = ?'
        queryParams.push(status)
      }
      
      if (size) {
        whereClause += ' AND s.size = ?'
        queryParams.push(size)
      }
      
      if (available !== undefined) {
        whereClause += ' AND s.is_available = ?'
        queryParams.push(available === 'true' ? 1 : 0)
      }
      
      if (priceMin) {
        whereClause += ' AND s.rental_price >= ?'
        queryParams.push(parseFloat(priceMin))
      }
      
      if (priceMax) {
        whereClause += ' AND s.rental_price <= ?'
        queryParams.push(parseFloat(priceMax))
      }
      
      console.log(`   WHERE clause: ${whereClause}`)
      console.log(`   Parameters: [${queryParams.join(', ')}]`)
      
      const query = `SELECT 
        s.*,
        s.stall_id as id,
        s.stall_no as stallNumber,
        s.stall_location as location,
        sec.section_name,
        f.floor_name,
        b.branch_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      ${whereClause}
      ORDER BY s.created_at DESC`
      
      const [result] = await connection.execute(query, queryParams)
      console.log(`   ✅ Results: ${result.length} stalls found`)
      
      if (result.length > 0) {
        console.log(`   Sample: ${result[0].stallNumber} in ${result[0].branch_name}`)
      }
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    if (connection) await connection.end()
  }
}

testFilterEndpoint()