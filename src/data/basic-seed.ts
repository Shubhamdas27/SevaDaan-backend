import mongoose from 'mongoose';
import config from '../config/config';

// Simple seeder with minimal data
const seedBasicData = async (): Promise<void> => {
  try {
    console.log('🌱 Starting basic database seeding...\n');

    // Connect to database
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for seeding');

    // Just run user seeder for now since it works
    const { seedUsers } = await import('./seeders/userSeeder');
    console.log('👥 Seeding users...');
    await seedUsers();

    console.log('\n🎉 Basic database seeding completed successfully!');
    console.log('\n📊 Demo Data Summary:');
    console.log('👥 Users: 7 (Super Admin, NGO Admins, Citizens, Donors, Volunteers)');
    
    console.log('\n🔐 Test Login Credentials:');
    console.log('Super Admin: admin@sevadaan.com / admin123');
    console.log('NGO Admin: admin@helpindia.org / password123');
    console.log('NGO Manager: manager@care.org / password123');
    console.log('Citizen: john.doe@gmail.com / password123');
    console.log('Donor: jane.smith@gmail.com / password123');
    console.log('Volunteer: ravi.kumar@gmail.com / password123');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

seedBasicData();
