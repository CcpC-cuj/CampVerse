/**
 * Migration Script: Add hostEligibilityStatus to existing users
 * Run this script once to add the hostEligibilityStatus field to all users who don't have it
 */

const mongoose = require('mongoose');
const User = require('../Models/User');
require('dotenv').config();

async function migrateHostEligibilityStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campverse', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all users without hostEligibilityStatus or with null/undefined hostEligibilityStatus
    const usersToUpdate = await User.find({
      $or: [
        { hostEligibilityStatus: { $exists: false } },
        { hostEligibilityStatus: null },
        { 'hostEligibilityStatus.status': { $exists: false } }
      ]
    });

    console.log(`Found ${usersToUpdate.length} users to update`);

    // Update each user with default hostEligibilityStatus
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          hostEligibilityStatus: { status: 'none' }
        }
      });
      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} users...`);
      }
    }

    console.log(`Migration completed! Updated ${updatedCount} users.`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateHostEligibilityStatus();
