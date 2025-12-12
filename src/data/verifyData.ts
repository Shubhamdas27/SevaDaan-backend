/**
 * Verify demo data was seeded correctly
 */

import mongoose from 'mongoose';
import config from '../config/config';

// Import models
import User from '../models/User';
import NGO from '../models/NGO';
import Program from '../models/Program';
import Donation from '../models/Donation';
import Volunteer from '../models/Volunteer';
import City from '../models/City';

const verifyData = async (): Promise<void> => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri || 'mongodb://localhost:27017/sevadaan');
    console.log('✅ Connected to MongoDB');

    // Count documents in each collection
    const citiesCount = await City.countDocuments();
    const usersCount = await User.countDocuments();
    const ngosCount = await NGO.countDocuments();
    const programsCount = await Program.countDocuments();
    const donationsCount = await Donation.countDocuments();
    const volunteersCount = await Volunteer.countDocuments();

    console.log('\n📊 Data Verification Results:');
    console.log(`   Cities: ${citiesCount}`);
    console.log(`   Users: ${usersCount}`);
    console.log(`   NGOs: ${ngosCount}`);
    console.log(`   Programs: ${programsCount}`);
    console.log(`   Donations: ${donationsCount}`);
    console.log(`   Volunteers: ${volunteersCount}`);

    // Check for sample data quality
    console.log('\n🔍 Sample Data Quality Check:');
    
    // Check users by role
    const roles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    console.log('   User roles:', roles);

    // Check NGO statuses
    const ngoStatuses = await NGO.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('   NGO statuses:', ngoStatuses);

    // Check volunteer statuses
    const volunteerStatuses = await Volunteer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('   Volunteer statuses:', volunteerStatuses);

    // Check for unique volunteer (user, program) combinations
    const duplicateVolunteers = await Volunteer.aggregate([
      { $group: { _id: { user: '$user', program: '$program' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateVolunteers.length === 0) {
      console.log('   ✅ No duplicate (user, program) combinations in volunteers');
    } else {
      console.log(`   ❌ Found ${duplicateVolunteers.length} duplicate volunteer combinations`);
    }

    console.log('\n✅ Data verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Data verification error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

verifyData().catch(console.error);
