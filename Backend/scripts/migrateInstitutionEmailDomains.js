const mongoose = require('mongoose');
const Institution = require('../Models/Institution');

async function migrateInstitutionEmailDomains() {
  try {
  // ...existing code...

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/campverse',
    );
    // ...existing code...

    // Find all institutions
    const institutions = await Institution.find({});
    // ...existing code...

    // Group by email domain to find duplicates
    const domainGroups = {};
    institutions.forEach((inst) => {
      const domain = inst.emailDomain;
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(inst);
    });

    // Process duplicates
    let duplicatesFound = 0;
    for (const [, insts] of Object.entries(domainGroups)) {
      if (insts.length > 1) {
        duplicatesFound++;
        // ...existing code...

        // Keep the first one, mark others for deletion
        const [keep, ...remove] = insts;
        // ...existing code...

        // Update users to reference the kept institution
        const User = require('../Models/User');
        for (const removeInst of remove) {
          // ...existing code...

          // Update users that reference the removed institution
          await User.updateMany(
            { institutionId: removeInst._id },
            { institutionId: keep._id },
          );
          // ...existing code...

          // Delete the duplicate institution
          await Institution.findByIdAndDelete(removeInst._id);
        }
      }
    }

    if (duplicatesFound === 0) {
      // ...existing code...
    } else {
      // ...existing code...
    }

    // Verify no duplicates remain
    const remainingInstitutions = await Institution.find({});
    const remainingDomains = remainingInstitutions.map(
      (inst) => inst.emailDomain,
    );
    const uniqueDomains = new Set(remainingDomains);

    if (remainingDomains.length === uniqueDomains.size) {
      // ...existing code...
    } else {
      // ...existing code...
    }

  // ...existing code...
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  // ...existing code...
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateInstitutionEmailDomains();
}

module.exports = migrateInstitutionEmailDomains;
