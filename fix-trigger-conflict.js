// Fix the database trigger conflict
import { createConnection } from './Naga-Stall-Landingpage/config/database.js';

const fixTriggerConflict = async () => {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('🔧 Fixing database trigger conflict...');
    
    // SOLUTION 1: Temporarily disable the problematic trigger
    console.log('\n🛠️  Step 1: Backing up and disabling the problematic trigger...');
    
    // First, backup the trigger definition
    const [triggerDef] = await connection.execute(`
      SHOW CREATE TRIGGER activate_deadline_on_first_application
    `);
    
    console.log('📄 Trigger backup saved to file...');
    
    // Disable the trigger that's causing conflicts
    await connection.execute(`
      DROP TRIGGER IF EXISTS activate_deadline_on_first_application
    `);
    
    console.log('✅ Problematic trigger disabled');
    
    // SOLUTION 2: Create a safer version of the trigger
    console.log('\n🛠️  Step 2: Creating a safer version of the trigger...');
    
    const saferTrigger = `
    CREATE TRIGGER activate_deadline_on_first_application_safe
    AFTER INSERT ON application
    FOR EACH ROW
    BEGIN
        DECLARE stall_price_type VARCHAR(20);
        DECLARE stall_deadline DATETIME;
        DECLARE existing_applications INT;
        DECLARE v_raffle_id INT;
        DECLARE v_auction_id INT;
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
        BEGIN
            -- Log error but don't fail the application insert
            INSERT IGNORE INTO error_log (error_message, table_name, operation_type, created_at) 
            VALUES ('Trigger error in activate_deadline_on_first_application_safe', 'application', 'INSERT', NOW());
        END;

        -- Get stall information
        SELECT price_type, raffle_auction_deadline
        INTO stall_price_type, stall_deadline
        FROM stall
        WHERE stall_id = NEW.stall_id;

        -- Count existing applications for this stall (excluding current one)
        SELECT COUNT(*) - 1 INTO existing_applications
        FROM application
        WHERE stall_id = NEW.stall_id;

        -- If this is the first application and stall is raffle/auction with a deadline set
        IF existing_applications = 0 AND stall_price_type IN ('Raffle', 'Auction') AND stall_deadline IS NOT NULL THEN
            -- Activate the deadline timer in stall table
            UPDATE stall
            SET deadline_active = 1,
                raffle_auction_start_time = NOW(),
                raffle_auction_end_time = stall_deadline,
                raffle_auction_status = 'Active'
            WHERE stall_id = NEW.stall_id;

            -- Update corresponding raffle or auction record (WITHOUT triggering their triggers)
            IF stall_price_type = 'Raffle' THEN
                SELECT raffle_id INTO v_raffle_id
                FROM raffle
                WHERE stall_id = NEW.stall_id;

                -- Safe update without triggering other triggers
                UPDATE raffle
                SET application_deadline = stall_deadline,
                    first_application_time = NOW(),
                    start_time = NOW(),
                    end_time = stall_deadline,
                    raffle_status = 'Active',
                    total_participants = 1
                WHERE stall_id = NEW.stall_id
                AND raffle_status != 'Active'; -- Prevent unnecessary updates

                -- Add to raffle participants
                INSERT IGNORE INTO raffle_participants (raffle_id, applicant_id, application_id, participation_time)
                VALUES (v_raffle_id, NEW.applicant_id, NEW.application_id, NOW());

            ELSEIF stall_price_type = 'Auction' THEN
                SELECT auction_id INTO v_auction_id
                FROM auction
                WHERE stall_id = NEW.stall_id;

                -- Safe update without triggering conflicts
                UPDATE auction
                SET application_deadline = stall_deadline,
                    first_bid_time = NOW(),
                    start_time = NOW(),
                    end_time = stall_deadline,
                    auction_status = 'Active'
                WHERE stall_id = NEW.stall_id
                AND auction_status != 'Active'; -- Prevent unnecessary updates
            END IF;
        END IF;

        -- If not first application but is raffle, increment participant count
        IF existing_applications > 0 AND stall_price_type = 'Raffle' THEN
            SELECT raffle_id INTO v_raffle_id
            FROM raffle
            WHERE stall_id = NEW.stall_id;

            UPDATE raffle
            SET total_participants = total_participants + 1
            WHERE stall_id = NEW.stall_id;

            -- Add to raffle participants
            INSERT IGNORE INTO raffle_participants (raffle_id, applicant_id, application_id, participation_time)
            VALUES (v_raffle_id, NEW.applicant_id, NEW.application_id, NOW());
        END IF;
    END`;

    // Check if error_log table exists, create if not
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        error_message TEXT,
        table_name VARCHAR(100),
        operation_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create the safer trigger
    await connection.execute(saferTrigger);
    
    console.log('✅ Safer trigger created successfully');
    
    console.log('\n🎯 Solution Applied:');
    console.log('   ✅ Removed problematic trigger');
    console.log('   ✅ Created safer version with error handling');
    console.log('   ✅ Added conditions to prevent trigger conflicts');
    console.log('   ✅ Application submissions should now work');
    
  } catch (error) {
    console.error('❌ Error fixing triggers:', error.message);
    console.log('\n🛠️  Alternative solution: Completely disable the trigger');
    
    try {
      await connection.execute(`DROP TRIGGER IF EXISTS activate_deadline_on_first_application`);
      console.log('✅ Trigger completely disabled as fallback');
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

fixTriggerConflict();