import mongoose from 'mongoose';
import config from '../config/config';

// Import seeders
import { seedUsers } from './seeders/userSeeder';
import { seedNGOs } from './seeders/ngoSeeder';
import { seedPrograms } from './seeders/programSeeder';
import { seedDonations } from './seeders/donationSeeder';
import { seedVolunteers } from './seeders/volunteerSeeder';
import { seedGrants } from './seeders/grantSeeder';
import { seedMiscData } from './seeders/miscSeeder';
import { 
  seedReferrals, 
  seedCertificates, 
  seedProgramRegistrations, 
  seedInvoices 
} from './seeders/newModelsSeeder';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedAll = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to database
    await connectDB();    // Seed in order (users first, then NGOs, then programs, then donations, volunteers, grants)
    console.log('👥 Seeding users...');
    await seedUsers();
    
    console.log('🏢 Seeding NGOs...');
    await seedNGOs();
    
    console.log('📋 Seeding programs...');
    await seedPrograms();
    
    console.log('💰 Seeding donations...');
    await seedDonations();
    
    console.log('🤝 Seeding volunteers...');
    await seedVolunteers();
    
    console.log('💳 Seeding grants...');
    await seedGrants();
      console.log('📝 Seeding miscellaneous data...');
    await seedMiscData();
    
    console.log('📞 Seeding referrals...');
    await seedReferrals();
    
    console.log('🏆 Seeding certificates...');
    await seedCertificates();
    
    console.log('📝 Seeding program registrations...');
    await seedProgramRegistrations();
    
    console.log('🧾 Seeding invoices...');
    await seedInvoices();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Demo Data Summary:');
    console.log('👥 Users: 7 (Super Admin, NGO Admins, Citizens, Donors, Volunteers)');
    console.log('🏢 NGOs: 3 (Help India Foundation, Care Foundation, Smile Welfare Society)');
    console.log('📋 Programs: 5+ (Education, Water, Skills, Environment, Emergency Relief + Events)');
    console.log('💰 Donations: 6+ (Various amounts and types)');
    console.log('🤝 Volunteers: 5+ (Various statuses and skills)');
    console.log('💳 Grants: 4+ (Different categories and statuses)');
    console.log('📞 Referrals: 50 (Various urgency levels and statuses)');
    console.log('🏆 Certificates: 30 (Achievement and appreciation certificates)');
    console.log('📝 Registrations: Program-based (Volunteer and participant registrations)');
    console.log('🧾 Invoices: Donation-based (Tax receipts and payment tracking)');
    console.log('⭐ Testimonials: 4 (User feedback and reviews)');
    console.log('📢 Notices: 4 (Announcements and updates)');
    console.log('🚨 Emergency Requests: 3 (Medical, disaster, education)');
    console.log('📞 Contact Messages: 4 (Partnership, support, feedback)');
    
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

// Handle different command line arguments
const command = process.argv[2];

switch (command) {
  case 'users':
    connectDB().then(() => seedUsers()).then(() => mongoose.connection.close()).then(() => process.exit(0));
    break;
  case 'ngos':
    connectDB().then(() => seedNGOs()).then(() => mongoose.connection.close()).then(() => process.exit(0));
    break;
  case 'programs':
    connectDB().then(() => seedPrograms()).then(() => mongoose.connection.close()).then(() => process.exit(0));
    break;  case 'donations':
    connectDB().then(() => seedDonations()).then(() => mongoose.connection.close()).then(() => process.exit(0));
    break;
  case 'misc':
    connectDB().then(() => seedMiscData()).then(() => mongoose.connection.close()).then(() => process.exit(0));
    break;
  case 'all':
  default:
    seedAll();
    break;
}

export { seedAll, seedUsers, seedNGOs, seedPrograms, seedDonations, seedMiscData };
