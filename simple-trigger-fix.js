// Simple trigger fix using direct SQL
import { createConnection } from './Naga-Stall-Landingpage/config/database.js';

const fixTriggerSimple = async () => {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('🔧 Disabling problematic trigger...');
    
    // Use direct query instead of prepared statement
    await connection.query(`DROP TRIGGER IF EXISTS activate_deadline_on_first_application`);
    console.log('✅ Problematic trigger disabled successfully');
    
    console.log('\n🎯 Solution Applied:');
    console.log('   ✅ Removed the trigger causing the conflict');
    console.log('   ✅ Application submissions should now work without errors');
    console.log('   ⚠️  Note: Raffle/Auction deadline activation will need to be handled manually');
    console.log('   📝 You can re-enable the trigger later with a safer implementation');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

fixTriggerSimple();