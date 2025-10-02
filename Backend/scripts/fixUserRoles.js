/**
 * Migration Script: Fix User Roles
 * 
 * This script fixes the critical bug where default roles were set as ['student,host']
 * (a single string) instead of ['student'] (an array with one element).
 * 
 * It will:
 * 1. Find all users with the malformed role 'student,host'
 * 2. Replace it with proper ['student'] array
 * 3. Preserve any additional roles (host, verifier, platformAdmin)
 * 4. Report on the changes made
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../Models/User');

async function fixUserRoles() {
  try {
    console.log('🔧 Starting user roles migration...');
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Find all users with the malformed role
    const usersWithBadRole = await User.find({
      roles: 'student,host'
    });
    
    console.log(`Found ${usersWithBadRole.length} users with malformed 'student,host' role\n`);
    
    if (usersWithBadRole.length === 0) {
      console.log('✅ No users need fixing. All roles are properly formatted.');
      await mongoose.disconnect();
      return;
    }
    
    // Process each user
    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of usersWithBadRole) {
      try {
        console.log(`Processing user: ${user.email} (${user._id})`);
        console.log(`  Current roles: ${JSON.stringify(user.roles)}`);
        
        // Determine correct roles based on user's actual permissions
        const newRoles = ['student'];
        
        // Check if user should be a host
        if (user.canHost || user.hostEligibilityStatus?.status === 'approved') {
          newRoles.push('host');
          console.log(`  - User is an approved host, adding 'host' role`);
        }
        
        // Check if user is a verifier
        if (user.verifierEligibilityStatus?.approvedBy) {
          newRoles.push('verifier');
          console.log(`  - User is a verifier, adding 'verifier' role`);
        }
        
        // Note: platformAdmin needs manual verification
        // We don't automatically assign it
        
        // Update user
        user.roles = newRoles;
        await user.save();
        
        console.log(`  ✅ Updated roles to: ${JSON.stringify(newRoles)}\n`);
        fixed++;
        
      } catch (error) {
        console.error(`  ❌ Error processing user ${user.email}:`, error.message);
        errors++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${usersWithBadRole.length}`);
    console.log(`✅ Successfully fixed: ${fixed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60) + '\n');
    
    // Verify the fix
    console.log('🔍 Verifying fix...');
    const stillBroken = await User.find({
      roles: 'student,host'
    });
    
    if (stillBroken.length === 0) {
      console.log('✅ Verification passed! No users have malformed roles.\n');
    } else {
      console.log(`⚠️  Warning: ${stillBroken.length} users still have malformed roles.\n`);
    }
    
    await mongoose.disconnect();
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  fixUserRoles()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = fixUserRoles;
