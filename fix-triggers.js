// Database trigger investigation and fix script
import { createConnection } from './Naga-Stall-Landingpage/config/database.js';

const fixDatabaseTriggers = async () => {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('🔍 Investigating database triggers...');
    
    // 1. Check what triggers exist on the application table
    console.log('\n📋 Checking triggers on application table:');
    const [triggers] = await connection.execute(`
      SHOW TRIGGERS FROM naga_stall WHERE \`Table\` = 'application'
    `);
    
    if (triggers.length === 0) {
      console.log('❌ No triggers found on application table');
    } else {
      triggers.forEach(trigger => {
        console.log(`  🔧 Trigger: ${trigger.Trigger}`);
        console.log(`     Event: ${trigger.Event}`);
        console.log(`     Timing: ${trigger.Timing}`);
        console.log(`     Statement: ${trigger.Statement}`);
        console.log('     ---');
      });
    }
    
    // 2. Check what triggers exist on the auction table
    console.log('\n📋 Checking triggers on auction table:');
    const [auctionTriggers] = await connection.execute(`
      SHOW TRIGGERS FROM naga_stall WHERE \`Table\` = 'auction'
    `);
    
    if (auctionTriggers.length === 0) {
      console.log('❌ No triggers found on auction table');
    } else {
      auctionTriggers.forEach(trigger => {
        console.log(`  🔧 Trigger: ${trigger.Trigger}`);
        console.log(`     Event: ${trigger.Event}`);
        console.log(`     Timing: ${trigger.Timing}`);
        console.log(`     Statement: ${trigger.Statement}`);
        console.log('     ---');
      });
    }
    
    // 3. Check all triggers in the database
    console.log('\n📋 All triggers in naga_stall database:');
    const [allTriggers] = await connection.execute(`
      SHOW TRIGGERS FROM naga_stall
    `);
    
    allTriggers.forEach(trigger => {
      console.log(`  🔧 ${trigger.Trigger} on ${trigger.Table} (${trigger.Event} ${trigger.Timing})`);
    });
    
    // 4. Check if auction table exists
    console.log('\n📋 Checking if auction table exists:');
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'auction'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Auction table does not exist');
    } else {
      console.log('✅ Auction table exists');
      
      // Check auction table structure
      const [auctionStructure] = await connection.execute(`
        DESCRIBE auction
      `);
      console.log('📊 Auction table structure:');
      auctionStructure.forEach(column => {
        console.log(`     ${column.Field}: ${column.Type}`);
      });
    }
    
    console.log('\n🛠️  PROPOSED FIXES:');
    console.log('1. Temporarily disable problematic triggers');
    console.log('2. Or modify trigger logic to avoid conflicts');
    console.log('3. Or ensure auction table operations are done safely');
    
    // Option to disable triggers (commented out for safety)
    /*
    console.log('\n⚠️  Would you like to disable the problematic triggers? (Uncomment to execute)');
    for (const trigger of triggers) {
      if (trigger.Statement.includes('auction')) {
        console.log(`   DROP TRIGGER IF EXISTS ${trigger.Trigger};`);
        // await connection.execute(`DROP TRIGGER IF EXISTS ${trigger.Trigger}`);
      }
    }
    */
    
  } catch (error) {
    console.error('❌ Database investigation error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

fixDatabaseTriggers();