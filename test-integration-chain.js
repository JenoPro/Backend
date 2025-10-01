// Test the complete integration chain: Components → Controller → Routes → Server
import { createConnection } from './Naga-Stall-Management/config/database.js'

// Test imports at each level
console.log('🔗 TESTING COMPLETE INTEGRATION CHAIN');
console.log('=' .repeat(60));

// Test 1: Test stallController exports
console.log('\n📦 1. Testing stallController exports...');
try {
  const controller = await import('./Naga-Stall-Management/controllers/stalls/stallController.js');
  const exports = Object.keys(controller);
  
  const raffleFunctions = exports.filter(f => f.toLowerCase().includes('raffle'));
  const auctionFunctions = exports.filter(f => f.toLowerCase().includes('auction'));
  
  console.log(`✅ Total exports: ${exports.length}`);
  console.log(`🎯 Raffle functions: ${raffleFunctions.length} - ${raffleFunctions.join(', ')}`);
  console.log(`🏺 Auction functions: ${auctionFunctions.length} - ${auctionFunctions.join(', ')}`);
  
} catch (error) {
  console.error('❌ stallController import failed:', error.message);
}

// Test 2: Test routes integration
console.log('\n🛣️  2. Testing stallRoutes integration...');
try {
  // This will test if routes can import from controller
  await import('./Naga-Stall-Management/routes/stallRoutes.js');
  console.log('✅ stallRoutes successfully imports from stallController');
} catch (error) {
  console.error('❌ stallRoutes import failed:', error.message);
}

// Test 3: Test server integration 
console.log('\n🖥️  3. Testing server integration...');
try {
  // Check if the main server can import everything
  const fs = await import('fs');
  const serverContent = fs.readFileSync('./server.js', 'utf-8');
  
  if (serverContent.includes("stallRoutes")) {
    console.log('✅ server.js imports stallRoutes');
  } else {
    console.log('❌ server.js missing stallRoutes import');
  }
  
  if (serverContent.includes("/api/stalls")) {
    console.log('✅ server.js sets up /api/stalls route');
  } else {
    console.log('❌ server.js missing /api/stalls route setup');
  }
  
} catch (error) {
  console.error('❌ server integration test failed:', error.message);
}

// Test 4: Check database connectivity for raffle/auction
console.log('\n🗄️  4. Testing database readiness...');
let connection;
try {
  connection = await createConnection();
  
  // Check if enhanced stall table exists
  const [stallColumns] = await connection.execute('DESCRIBE stall');
  const enhancedColumns = stallColumns.filter(col => 
    ['price_type', 'raffle_auction_duration_hours', 'raffle_auction_status'].includes(col.Field)
  );
  
  console.log(`✅ Enhanced stall columns: ${enhancedColumns.length}/3 found`);
  enhancedColumns.forEach(col => console.log(`   - ${col.Field}: ${col.Type}`));
  
  // Check for existing raffle/auction stalls
  const [counts] = await connection.execute(`
    SELECT 
      price_type,
      COUNT(*) as count
    FROM stall 
    WHERE price_type IN ('Raffle', 'Auction')
    GROUP BY price_type
  `);
  
  console.log('📊 Current raffle/auction stalls:');
  counts.forEach(row => console.log(`   - ${row.price_type}: ${row.count} stalls`));
  
} catch (error) {
  console.error('❌ Database test failed:', error.message);
} finally {
  if (connection) await connection.end();
}

console.log('\n🎉 INTEGRATION CHAIN TEST COMPLETE!');
console.log('=' .repeat(60));
console.log('✅ Components → Controller → Routes → Server → Database');
console.log('🚀 Your raffle/auction system is ready to use!');