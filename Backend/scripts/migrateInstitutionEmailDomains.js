const mongoose = require('mongoose');
const Institution = require('../Models/Institution');

async function migrateInstitutionEmailDomains() {
  try {
    console.log('Starting institution email domain migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campverse');
    console.log('Connected to MongoDB');
    
    // Find all institutions
    const institutions = await Institution.find({});
    console.log(`Found ${institutions.length} institutions`);
    
    // Group by email domain to find duplicates
    const domainGroups = {};
    institutions.forEach(inst => {
      const domain = inst.emailDomain;
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(inst);
    });
    
    // Process duplicates
    let duplicatesFound = 0;
    for (const [domain, insts] of Object.entries(domainGroups)) {
      if (insts.length > 1) {
        duplicatesFound++;
        console.log(`Found ${insts.length} institutions with domain: ${domain}`);
        
        // Keep the first one, mark others for deletion
        const [keep, ...remove] = insts;
        console.log(`Keeping: ${keep.name} (${keep._id})`);
        
        // Update users to reference the kept institution
        const User = require('../Models/User');
        for (const removeInst of remove) {
          console.log(`Removing: ${removeInst.name} (${removeInst._id})`);
          
          // Update users that reference the removed institution
          const updatedUsers = await User.updateMany(
            { institutionId: removeInst._id },
            { institutionId: keep._id }
          );
          console.log(`Updated ${updatedUsers.modifiedCount} users to reference kept institution`);
          
          // Delete the duplicate institution
          await Institution.findByIdAndDelete(removeInst._id);
        }
      }
    }
    
    if (duplicatesFound === 0) {
      console.log('No duplicate email domains found');
    } else {
      console.log(`Processed ${duplicatesFound} duplicate domain groups`);
    }
    
    // Verify no duplicates remain
    const remainingInstitutions = await Institution.find({});
    const remainingDomains = remainingInstitutions.map(inst => inst.emailDomain);
    const uniqueDomains = new Set(remainingDomains);
    
    if (remainingDomains.length === uniqueDomains.size) {
      console.log('✅ Migration successful: No duplicate email domains remain');
    } else {
      console.log('❌ Migration failed: Duplicate email domains still exist');
      console.log('Remaining domains:', remainingDomains);
    }
    
    console.log('Migration completed');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateInstitutionEmailDomains();
}

module.exports = migrateInstitutionEmailDomains;
