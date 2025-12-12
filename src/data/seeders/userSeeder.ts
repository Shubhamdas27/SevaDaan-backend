import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import User from '../../models/User';

export const seedUsers = async (): Promise<void> => {
  try {
    // Clear existing users
    await User.deleteMany({});

    const hashedPassword = await bcrypt.hash('password123', 12);

    // Core demo users for testing
    const coreUsers = [      {
        name: 'Super Admin',
        email: 'admin@sevadaan.com',
        password: hashedPassword,
        role: 'ngo',
        phone: '9876543210',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=1'
      },
      {
        name: 'Help India NGO',
        email: 'ngo@helpindia.org',
        password: hashedPassword,
        role: 'ngo',
        phone: '9876543211',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=2'
      },
      {
        name: 'Raj Sharma - NGO Admin',
        email: 'ngoadmin@helpindia.org',
        password: hashedPassword,
        role: 'ngo_admin',
        phone: '9876543212',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=3'
      },
      {
        name: 'Priya Singh - NGO Manager',
        email: 'ngomanager@helpindia.org',
        password: hashedPassword,
        role: 'ngo_manager',
        phone: '9876543213',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=4'
      },
      {
        name: 'Rahul Volunteer',
        email: 'volunteer@helpindia.org',
        password: hashedPassword,
        role: 'volunteer',
        phone: '9876543214',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=5'
      },
      {
        name: 'Amit Donor',
        email: 'donor@example.com',
        password: hashedPassword,
        role: 'donor',
        phone: '9876543215',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=6'
      },
      {
        name: 'Sunita Citizen',
        email: 'citizen@example.com',
        password: hashedPassword,
        role: 'citizen',
        phone: '9876543216',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: 'https://picsum.photos/200/200?random=7'
      }
    ];    // Generate additional demo users for each role
    const additionalUsers: any[] = [];
    let emailCounter = 100;

    // Helper function to generate valid Indian phone number
    const generatePhone = () => {
      const prefix = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const remaining = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
      return prefix + remaining;
    };

    // Generate 10 NGOs
    for (let i = 0; i < 10; i++) {
      additionalUsers.push({
        name: faker.company.name() + ' NGO',
        email: `ngo${emailCounter++}@example.com`,
        password: hashedPassword,
        role: 'ngo',
        phone: generatePhone(),
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: `https://picsum.photos/200/200?random=${emailCounter}`
      });
    }

    // Generate 20 NGO Admins
    for (let i = 0; i < 20; i++) {
      additionalUsers.push({
        name: faker.person.fullName() + ' (NGO Admin)',
        email: `ngoadmin${emailCounter++}@example.com`,
        password: hashedPassword,
        role: 'ngo_admin',
        phone: generatePhone(),
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: `https://picsum.photos/200/200?random=${emailCounter}`
      });
    }

    // Generate 30 NGO Managers
    for (let i = 0; i < 30; i++) {
      additionalUsers.push({
        name: faker.person.fullName() + ' (NGO Manager)',
        email: `ngomanager${emailCounter++}@example.com`,
        password: hashedPassword,
        role: 'ngo_manager',
        phone: generatePhone(),
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        avatar: `https://picsum.photos/200/200?random=${emailCounter}`
      });
    }

    // Generate 50 Volunteers
    for (let i = 0; i < 50; i++) {
      additionalUsers.push({
        name: faker.person.fullName() + ' (Volunteer)',
        email: `volunteer${emailCounter++}@example.com`,
        password: hashedPassword,
        role: 'volunteer',
        phone: generatePhone(),
        isActive: faker.datatype.boolean(),
        isEmailVerified: true,
        isPhoneVerified: faker.datatype.boolean(),
        avatar: `https://picsum.photos/200/200?random=${emailCounter}`
      });
    }

    // Generate 40 Donors
    for (let i = 0; i < 40; i++) {
      additionalUsers.push({
        name: faker.person.fullName() + ' (Donor)',
        email: `donor${emailCounter++}@example.com`,
        password: hashedPassword,
        role: 'donor',
        phone: generatePhone(),
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: faker.datatype.boolean(),
        avatar: `https://picsum.photos/200/200?random=${emailCounter}`
      });
    }

    // Generate 60 Citizens
    for (let i = 0; i < 60; i++) {
      additionalUsers.push({
        name: faker.person.fullName() + ' (Citizen)',
        email: `citizen${emailCounter++}@example.com`,
        password: hashedPassword,
        role: 'citizen',
        phone: generatePhone(),
        isActive: faker.datatype.boolean(),
        isEmailVerified: faker.datatype.boolean(),
        isPhoneVerified: faker.datatype.boolean(),
        avatar: `https://picsum.photos/200/200?random=${emailCounter}`
      });
    }

    // Combine all users
    const allUsers = [...coreUsers, ...additionalUsers];

    const createdUsers = await User.insertMany(allUsers);
    console.log(`✅ ${createdUsers.length} users seeded successfully`);
    console.log('📋 Demo login credentials:');
    console.log('🔹 Admin: admin@sevadaan.com / password123');
    console.log('🔹 NGO: ngo@helpindia.org / password123');
    console.log('🔹 NGO Admin: ngoadmin@helpindia.org / password123');
    console.log('🔹 NGO Manager: ngomanager@helpindia.org / password123');
    console.log('🔹 Volunteer: volunteer@helpindia.org / password123');
    console.log('🔹 Donor: donor@example.com / password123');
    console.log('🔹 Citizen: citizen@example.com / password123');
    
    return;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};
