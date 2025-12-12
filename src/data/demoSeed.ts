/**
 * Enhanced demo data seeder
 * This file provides comprehensive data for demonstration and testing
 * Creates 500 users, 50 NGOs, 200 programs, 1000 donations, etc.
 */

import mongoose from 'mongoose';
import config from '../config/config';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

// Import models
import User from '../models/User';
import NGO from '../models/NGO';
import Program from '../models/Program';
import Donation from '../models/Donation';
import Volunteer from '../models/Volunteer';
import City from '../models/City';

// Set faker to use consistent locale
faker.seed(12345); // For consistent demo data

const connectToDB = async (): Promise<void> => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', config.mongodbUri?.substring(0, 50) + '...');
    
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(config.mongodbUri || 'mongodb://localhost:27017/sevadaan', options);
    console.log('✅ Connected to MongoDB for demo seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Generate Indian Cities with proper data
const seedCities = async (): Promise<any[]> => {
  console.log('🏙️ Seeding Cities...');
  await City.deleteMany({});
  
  const majorCities = [
    { name: 'Mumbai', state: 'Maharashtra', country: 'India', popularity: 100 },
    { name: 'Delhi', state: 'Delhi', country: 'India', popularity: 98 },
    { name: 'Bangalore', state: 'Karnataka', country: 'India', popularity: 96 },
    { name: 'Hyderabad', state: 'Telangana', country: 'India', popularity: 94 },
    { name: 'Chennai', state: 'Tamil Nadu', country: 'India', popularity: 92 },
    { name: 'Kolkata', state: 'West Bengal', country: 'India', popularity: 90 },
    { name: 'Ahmedabad', state: 'Gujarat', country: 'India', popularity: 88 },
    { name: 'Pune', state: 'Maharashtra', country: 'India', popularity: 86 },
    { name: 'Surat', state: 'Gujarat', country: 'India', popularity: 84 },
    { name: 'Jaipur', state: 'Rajasthan', country: 'India', popularity: 82 },
  ];

  const savedCities = await City.insertMany(majorCities);
  console.log(`✅ Created ${savedCities.length} cities`);
  return savedCities;
};

// Generate Users with realistic data matching User schema
const seedUsers = async (cities: any[]): Promise<any[]> => {
  console.log('👥 Seeding Users...');
  await User.deleteMany({});
  
  const users = [];
  const roles = ['citizen', 'donor', 'volunteer', 'ngo_admin', 'ngo_manager'];
  
  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('password123', 10);
  
  // Create admin user
  const adminUser = {
    name: 'Rajesh Kumar',
    email: 'admin@sevadaan.org',
    password: adminPasswordHash,
    phone: '9876543210',
    role: 'ngo_admin',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    avatar: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=0f172a&color=ffffff'
  };
  users.push(adminUser);

  // Generate 499 more users (500 total for full scale seeding)
  for (let i = 0; i < 499; i++) {
    const gender = faker.person.sex() as 'male' | 'female';
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName();
    const role = faker.helpers.arrayElement(roles);
    
    // Generate valid Indian phone number (starts with 6-9 and has 10 digits)
    const firstDigit = faker.helpers.arrayElement(['6', '7', '8', '9']);
    const restDigits = faker.string.numeric(9);
    const phoneNumber = firstDigit + restDigits;
    
    const user = {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: userPasswordHash,
      phone: phoneNumber,
      role: role,
      isEmailVerified: faker.datatype.boolean(0.8),
      isPhoneVerified: faker.datatype.boolean(0.6),
      isActive: faker.datatype.boolean(0.95),
      avatar: faker.image.avatar()
    };
    
    users.push(user);
  }

  const savedUsers = await User.insertMany(users);
  console.log(`✅ Created ${savedUsers.length} users`);
  return savedUsers;
};

// Generate NGOs with realistic data matching NGO schema
const seedNGOs = async (users: any[], cities: any[]): Promise<any[]> => {
  console.log('🏢 Seeding NGOs...');
  await NGO.deleteMany({});
  
  const ngoAdmins = users.filter(user => user.role === 'ngo_admin');
  const ngos = [];

  // Generate 10 NGOs for faster seeding
  for (let i = 0; i < Math.min(50, ngoAdmins.length); i++) {
    const admin = ngoAdmins[i];
    const city = faker.helpers.arrayElement(cities);
    
    // Generate valid Indian phone number for NGO representative
    const firstDigit = faker.helpers.arrayElement(['6', '7', '8', '9']);
    const restDigits = faker.string.numeric(9);
    const phoneNumber = firstDigit + restDigits;
    
    const repFirstDigit = faker.helpers.arrayElement(['6', '7', '8', '9']);
    const repRestDigits = faker.string.numeric(9);
    const repPhoneNumber = repFirstDigit + repRestDigits;
    
    const ngo = {
      name: `${faker.company.name()} Foundation`,
      description: faker.lorem.paragraphs(2),
      mission: faker.lorem.paragraph(),
      vision: faker.lorem.paragraph(),
      address: faker.location.streetAddress(),
      city: city.name,
      state: city.state,
      pincode: faker.string.numeric(6),
      contactEmail: faker.internet.email(),
      contactPhone: phoneNumber,
      website: faker.internet.url(),
      registrationNumber: `REG${faker.string.numeric(8)}`,
      registrationDate: faker.date.past({ years: 5 }),
      type: faker.helpers.arrayElement(['trust', 'society', 'section8']),
      legalStatus: 'Registered Charitable Trust',
      operationalAreas: faker.helpers.arrayElements([
        'Education', 'Healthcare', 'Environment', 'Poverty Alleviation'
      ], { min: 2, max: 3 }),
      targetBeneficiaries: 'Children, women, elderly, and marginalized communities',
      impactMetrics: `${faker.number.int({ min: 100, max: 1000 })} people impacted`,
      
      // Bank Details (required)
      bankDetails: {
        accountName: `${faker.company.name()} Foundation`,
        bankName: `${faker.helpers.arrayElement(['State Bank', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'])}`,
        accountNumber: faker.string.numeric(12),
        ifscCode: `${faker.helpers.arrayElement(['SBIN', 'HDFC', 'ICIC', 'UTIB'])}0${faker.string.alphanumeric(6).toUpperCase()}`,
        cancelledChequeUrl: faker.internet.url()
      },
      
      // Representative Details (required)
      representative: {
        name: faker.person.fullName(),
        designation: faker.helpers.arrayElement(['Director', 'Secretary', 'President', 'Treasurer']),
        phone: repPhoneNumber,
        email: faker.internet.email(),
        idType: faker.helpers.arrayElement(['aadhaar', 'pan', 'passport']),
        idNumber: faker.string.alphanumeric(12).toUpperCase()
      },
      
      // Documents (required)
      documents: {
        registrationCertificateUrl: faker.internet.url(),
        panCardUrl: faker.internet.url(),
        taxExemptionCertUrl: faker.internet.url(),
        annualReportUrl: faker.internet.url()
      },
      
      logo: faker.image.avatar(),
      isVerified: faker.datatype.boolean(0.7),
      status: faker.helpers.arrayElement(['verified', 'pending', 'under_review']),
      adminId: admin._id // Use adminId instead of admin
    };
    
    ngos.push(ngo);
  }

  const savedNGOs = await NGO.insertMany(ngos);
  
  // Update users with NGO references
  for (let i = 0; i < savedNGOs.length; i++) {
    await User.findByIdAndUpdate(ngoAdmins[i]._id, { 
      ngoId: savedNGOs[i]._id 
    });
  }
  
  console.log(`✅ Created ${savedNGOs.length} NGOs`);
  return savedNGOs;
};

// Generate Programs matching Program schema
const seedPrograms = async (ngos: any[], cities: any[], users: any[]): Promise<any[]> => {
  console.log('📋 Seeding Programs...');
  await Program.deleteMany({});
  
  const programs = [];
  const programCategories = [
    'education', 'healthcare', 'environment', 'poverty-alleviation'
  ];

  // Generate 200 programs for full scale seeding
  for (let i = 0; i < 200; i++) {
    const ngo = faker.helpers.arrayElement(ngos);
    const city = faker.helpers.arrayElement(cities);
    const category = faker.helpers.arrayElement(programCategories);
    const startDate = faker.date.future({ years: 1 });
    const endDate = faker.date.future({ years: 2, refDate: startDate });
    
    // Find the admin of this NGO to use as createdBy
    const ngoAdmin = users.find(user => user._id.equals(ngo.adminId));
    
    const program = {
      title: `${faker.company.catchPhrase()} - ${category} Initiative`,
      description: faker.lorem.paragraphs(2),
      shortDescription: faker.lorem.paragraph(),
      ngo: ngo._id,
      category: category,
      programType: faker.helpers.arrayElement(['regular', 'event', 'training']),
      targetAmount: faker.number.int({ min: 50000, max: 500000 }),
      raisedAmount: faker.number.int({ min: 0, max: 100000 }),
      startDate: startDate,
      endDate: endDate,
      location: {
        address: faker.location.streetAddress(),
        city: city.name,
        state: city.state,
        pincode: faker.string.numeric(6),
        coordinates: {
          latitude: faker.location.latitude({ min: 8, max: 37 }),
          longitude: faker.location.longitude({ min: 68, max: 97 })
        }
      },
      status: faker.helpers.arrayElement(['active', 'completed']),
      featured: faker.datatype.boolean(0.2),
      beneficiariesCount: faker.number.int({ min: 10, max: 500 }),
      volunteersNeeded: faker.number.int({ min: 5, max: 25 }),
      volunteersRegistered: faker.number.int({ min: 0, max: 15 }),
      createdBy: ngoAdmin._id // Add the required createdBy field
    };
    
    programs.push(program);
  }

  const savedPrograms = await Program.insertMany(programs);
  console.log(`✅ Created ${savedPrograms.length} programs`);
  return savedPrograms;
};

// Generate smaller sample of donations and volunteers
const seedDonations = async (users: any[], ngos: any[], programs: any[]): Promise<void> => {
  console.log('💰 Seeding Donations...');
  await Donation.deleteMany({});
  
  const donations = [];
  const donors = users.filter(user => ['donor', 'citizen'].includes(user.role));

  // Generate 1000 donations for full scale seeding
  for (let i = 0; i < 1000; i++) {
    const donor = faker.helpers.arrayElement(donors);
    const program = faker.helpers.arrayElement(programs);
    const ngo = ngos.find(n => n._id.equals(program.ngo));
    
    const donation = {
      donor: donor._id,
      user: donor._id,
      program: program._id,
      ngo: ngo._id,
      amount: faker.number.int({ min: 100, max: 10000 }),
      currency: 'INR',
      donorName: donor.name,
      donorEmail: donor.email,
      donorPhone: donor.phone,
      isAnonymous: faker.datatype.boolean(0.2),
      paymentMethod: faker.helpers.arrayElement(['razorpay', 'stripe']),
      paymentStatus: faker.helpers.arrayElement(['completed', 'pending']),
      status: faker.helpers.arrayElement(['completed', 'pending']),
      receiptNumber: `RCP${faker.string.numeric(8)}`,
      taxBenefit: {
        eligible: true,
        section: '80G',
        percentage: 50,
        certificateGenerated: faker.datatype.boolean(0.6)
      }
    };
    
    donations.push(donation);
  }

  await Donation.insertMany(donations);
  console.log(`✅ Created ${donations.length} donations`);
};

const seedVolunteers = async (users: any[], ngos: any[], programs: any[]): Promise<void> => {
  console.log('🤝 Seeding Volunteers...');
  await Volunteer.deleteMany({});
  
  const volunteers = [];
  const volunteerUsers = users.filter(user => ['volunteer', 'citizen'].includes(user.role));
  const usedCombinations = new Set(); // Track (user, program) pairs to avoid duplicates

  // Generate 300 volunteer applications for full scale seeding
  let attempts = 0;
  const maxAttempts = 300 * 3; // Allow some retries for unique combinations
  
  while (volunteers.length < 300 && attempts < maxAttempts) {
    attempts++;
    
    const user = faker.helpers.arrayElement(volunteerUsers);
    const program = faker.helpers.arrayElement(programs);
    const combinationKey = `${user._id.toString()}-${program._id.toString()}`;
    
    // Skip if this (user, program) combination already exists
    if (usedCombinations.has(combinationKey)) {
      continue;
    }
    
    usedCombinations.add(combinationKey);
    const ngo = ngos.find(n => n._id.equals(program.ngo));
    
    const volunteer = {
      user: user._id, // Changed from userId to user
      program: program._id, // Changed from programId to program
      ngo: ngo._id, // Changed from ngoId to ngo
      skills: faker.helpers.arrayElements([
        'teaching', 'healthcare', 'administration', 'fundraising', 'social_work', 
        'community_outreach', 'counseling', 'event_management', 'marketing', 'technology'
      ], { min: 1, max: 3 }),
      experience: faker.lorem.paragraph(),
      motivation: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['approved', 'pending', 'rejected']),
      
      // Required availability fields
      availability: {
        daysPerWeek: faker.number.int({ min: 1, max: 7 }),
        hoursPerDay: faker.number.int({ min: 2, max: 8 }),
        preferredTime: faker.helpers.arrayElement(['morning', 'afternoon', 'evening', 'flexible']),
        startDate: faker.date.recent(),
        endDate: faker.date.future()
      },
      
      // Required background fields
      background: {
        education: faker.helpers.arrayElement(['High School', 'Graduate', 'Post Graduate', 'PhD', 'Diploma']),
        occupation: faker.person.jobTitle(),
        previousVolunteerExperience: faker.lorem.paragraph()
      },
      
      // Preferences
      preferences: {
        workLocation: faker.helpers.arrayElement(['onsite', 'remote', 'hybrid']),
        travelWillingness: faker.datatype.boolean(),
        languagesSpoken: faker.helpers.arrayElements(['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'], { min: 1, max: 3 })
      }
    };
    
    volunteers.push(volunteer);
  }

  if (volunteers.length < 300) {
    console.log(`⚠️ Generated ${volunteers.length} unique volunteer combinations (attempted ${attempts} times)`);
  }

  await Volunteer.insertMany(volunteers);
  console.log(`✅ Created ${volunteers.length} volunteer applications`);
};

// Main seeding function
const runDemoSeed = async (): Promise<void> => {
  try {
    console.log('🌱 Starting demo data seeding...\n');
    
    await connectToDB();
    
    const cities = await seedCities();
    const users = await seedUsers(cities);
    const ngos = await seedNGOs(users, cities);
    const programs = await seedPrograms(ngos, cities, users);
    await seedDonations(users, ngos, programs);
    await seedVolunteers(users, ngos, programs);
    
    console.log('\n🎉 Demo data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${cities.length} cities`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${ngos.length} NGOs`);
    console.log(`   - ${programs.length} programs`);
    console.log('   - 1000 donations');
    console.log('   - 300 volunteer applications');
    
    console.log('\n🔑 Demo Login Credentials:');
    console.log('   Admin: admin@sevadaan.org / admin123');
    console.log('   All other users: password123');
    
  } catch (error) {
    console.error('❌ Demo seeding failed:', error);
    console.error('Stack trace:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeder if this file is executed directly
if (require.main === module) {
  runDemoSeed();
}

export default runDemoSeed;
