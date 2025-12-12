/**
 * Demo NGO Setup - Helping Hands Foundation
 * Creates a complete NGO with programs, grants, and users for testing
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/config';

// Import models
import User from '../models/User';
import NGO from '../models/NGO';
import Program from '../models/Program';
import Grant from '../models/Grant';
import Donation from '../models/Donation';
import Volunteer from '../models/Volunteer';
import Notification from '../models/Notification';
import City from '../models/City';

const connectToDB = async (): Promise<void> => {
  try {
    console.log('🔌 Connecting to MongoDB for demo NGO setup...');
    await mongoose.connect(config.mongodbUri || 'mongodb://localhost:27017/sevadaan');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createDemoNGO = async () => {
  console.log('🏢 Creating Helping Hands Foundation...');

  // Create Mumbai city if not exists
  let mumbai = await City.findOne({ name: 'Mumbai', state: 'Maharashtra' });
  if (!mumbai) {
    mumbai = await City.create({
      name: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      popularity: 100
    });
  }

  // Create NGO Admin User
  const adminPassword = await bcrypt.hash('admin123', 12);
  const ngoAdmin = await User.create({
    name: 'Rajesh Kumar',
    email: 'admin@helpinghandsfoundation.org',
    password: adminPassword,
    phone: '9876543210',
    role: 'ngo_admin',
    isEmailVerified: true
  });

  // Create NGO Manager User
  const managerPassword = await bcrypt.hash('manager123', 12);
  const ngoManager = await User.create({
    name: 'Priya Sharma',
    email: 'manager@helpinghandsfoundation.org',
    password: managerPassword,
    phone: '9876543211',
    role: 'ngo_manager',
    isEmailVerified: true
  });

  // Create the NGO
  const helpingHandsNGO = await NGO.create({
    name: 'Helping Hands Foundation',
    description: 'Helping Hands Foundation is a Mumbai-based NGO dedicated to environmental conservation, education, and community development. Since 2010, we have been working tirelessly to create positive change in urban communities through sustainable initiatives and grassroots programs.',
    mission: 'To create sustainable environmental solutions while empowering communities through education and active participation in conservation efforts.',
    vision: 'A cleaner, greener Mumbai where every citizen actively contributes to environmental conservation and community welfare.',
    address: '789 Worli Sea Face',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400018',
    contactEmail: 'contact@helpinghandsfoundation.org',
    contactPhone: '9876543200',
    website: 'https://helpinghandsfoundation.org',
    logo: '/uploads/helping-hands-logo.png',
    coverImage: '/uploads/helping-hands-cover.jpg',
    registrationNumber: 'MH/2010/NGO/12345',
    registrationDate: new Date('2010-03-15'),
    type: 'trust',
    legalStatus: 'Registered Trust under Indian Trust Act 1882',
    operationalAreas: ['Mumbai', 'Maharashtra', 'Western India'],
    targetBeneficiaries: 'Urban communities in Mumbai, particularly focusing on families, students, and working professionals who are interested in environmental conservation and sustainable living.',
    impactMetrics: 'We measure our impact through: trees planted (target: 2000+ annually), waste collected (target: 5000+ kg monthly), people educated (target: 1000+ annually), and community gardens established (target: 10+ locations).',
    socialLinks: {
      facebook: 'https://facebook.com/helpinghandsfoundation',
      twitter: 'https://twitter.com/helpinghands_ngo',
      instagram: 'https://instagram.com/helpinghandsfoundation',
      linkedin: 'https://linkedin.com/company/helping-hands-foundation'
    },
    mediaLinks: [
      'https://youtube.com/helpinghandsfoundation',
      'https://helpinghandsfoundation.org/gallery'
    ],
    bankDetails: {
      accountName: 'Helping Hands Foundation',
      bankName: 'HDFC Bank',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      cancelledChequeUrl: '/uploads/cancelled-cheque.pdf'
    },
    representative: {
      name: 'Rajesh Kumar',
      designation: 'Founder & Chairman',
      phone: '9876543210',
      email: 'admin@helpinghandsfoundation.org',
      idType: 'aadhaar',
      idNumber: '123456789012'
    },
    documents: {
      registrationCertificateUrl: '/uploads/registration-certificate.pdf',
      panCardUrl: '/uploads/pan-card.pdf',
      taxExemptionCertUrl: '/uploads/tax-exemption-cert.pdf',
      fcraCertificateUrl: '/uploads/fcra-certificate.pdf'
    },
    status: 'verified',
    isVerified: true,
    verificationDate: new Date(),
    adminId: ngoAdmin._id,
    lastUpdatedBy: ngoAdmin._id
  });

  console.log('✅ Created Helping Hands Foundation NGO');
  return { ngoAdmin, ngoManager, helpingHandsNGO, mumbai };
};

const createGreenMumbaiCampaign = async (ngo: any, admin: any) => {
  console.log('🌱 Creating Green Mumbai Campaign...');

  const greenCampaign = await Program.create({
    title: 'Green Mumbai Campaign',
    description: `Join us in transforming Mumbai into a greener, more sustainable city! The Green Mumbai Campaign is our flagship environmental initiative aimed at increasing green cover, reducing pollution, and promoting sustainable living practices across the city.

Our comprehensive approach includes:
• Tree plantation drives in urban areas
• Waste management and recycling programs  
• Awareness campaigns on climate change
• Community gardens and rooftop farming
• Clean-up drives at beaches and public spaces
• Educational workshops for schools and communities

Together, we can make Mumbai a model eco-city for India!`,
    shortDescription: 'Transform Mumbai into a greener, more sustainable city through tree plantation, waste management, and community awareness programs.',
    ngo: ngo._id,
    category: 'environment',
    programType: 'regular',
    targetAmount: 500000,
    raisedAmount: 275000,
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-12-31'),
    location: {
      address: 'Multiple locations across Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777
      }
    },
    images: [
      '/uploads/green-mumbai-1.jpg',
      '/uploads/green-mumbai-2.jpg',
      '/uploads/tree-plantation.jpg'
    ],
    documents: [
      '/uploads/green-mumbai-proposal.pdf',
      '/uploads/environmental-impact.pdf'
    ],
    status: 'active',
    featured: true,
    beneficiariesCount: 2000,
    volunteersNeeded: 50,
    volunteersRegistered: 32,
    participantsRegistered: 150,
    maxParticipants: 200,
    registrationDeadline: new Date('2024-02-25'),
    sdgGoals: [11, 13, 15],
    tags: ['environment', 'trees', 'sustainability', 'mumbai', 'climate'],
    requirements: [
      'Minimum age 16 years',
      'Physical fitness for outdoor activities',
      'Commitment for at least 2 events per month',
      'Basic knowledge of environmental issues'
    ],
    impact: {
      description: 'Creating lasting environmental impact in Mumbai',
      metrics: [
        { name: 'Trees Planted', value: 1250, unit: 'trees' },
        { name: 'Waste Collected', value: 5500, unit: 'kg' },
        { name: 'People Educated', value: 850, unit: 'people' },
        { name: 'Green Spaces Created', value: 8, unit: 'locations' }
      ]
    },
    updates: [
      {
        title: 'Beach Clean-up Success!',
        description: 'Our volunteers collected over 2 tons of waste from Juhu Beach last weekend.',
        date: new Date('2024-06-15'),
        images: ['/uploads/beach-cleanup.jpg']
      },
      {
        title: 'New Community Garden Inaugurated',
        description: 'Successfully established a community garden in Bandra East with 50+ participants.',
        date: new Date('2024-05-20'),
        images: ['/uploads/community-garden.jpg']
      }
    ],
    createdBy: admin._id
  });

  console.log('✅ Created Green Mumbai Campaign');
  return greenCampaign;
};

const createGrantApplication = async (ngo: any, program: any, admin: any) => {
  console.log('💰 Creating grant application...');

  const grant = await Grant.create({
    title: 'Environmental Conservation Grant 2024',
    description: 'Grant application for funding the Green Mumbai Campaign and expanding our environmental conservation efforts across Mumbai.',
    requestedAmount: 500000,
    currency: 'INR',
    duration: 10, // 10 months
    ngo: ngo._id,
    requestedBy: admin._id,
    category: 'environment',
    status: 'approved',
    priority: 'high',
    // Enhanced grant creation questions
    grantGoal: 'To transform Mumbai into a greener, more sustainable city through comprehensive environmental conservation initiatives.',
    purpose: 'To fund tree plantation drives, waste management programs, and environmental education initiatives in Mumbai urban areas.',
    fundUsage: 'The funds will be utilized for purchasing saplings, gardening tools, educational materials, transportation, and volunteer coordination activities.',
    impactMeasurement: 'We will measure impact through the number of trees planted, waste collected, people educated, and reduction in local pollution levels.',
    sustainabilityPlan: 'We will establish community partnerships, train local volunteers, and create monitoring systems to ensure long-term project sustainability.',
    communityEngagement: 'We will conduct awareness workshops, involve local schools and colleges, and create volunteer networks to maximize community participation.',
    objectives: [
      'Plant 2000+ trees across Mumbai urban areas',
      'Educate 1000+ citizens about environmental conservation',
      'Organize monthly waste management drives',
      'Create 5 community gardens in residential areas',
      'Establish a network of 100+ trained volunteers'
    ],
    expectedOutcomes: [
      'Improved air quality in targeted areas',
      'Increased environmental awareness in communities',
      'Reduced waste in public spaces',
      'Enhanced green cover in urban areas',
      'Stronger community participation in environmental activities'
    ],
    beneficiaries: {
      directCount: 2000,
      indirectCount: 10000,
      demographics: 'Urban residents of Mumbai including families, students, office workers, and elderly citizens from diverse socio-economic backgrounds'
    },
    budget: {
      breakdown: [
        { category: 'Tree Saplings', amount: 150000, description: 'Purchase of native tree saplings suitable for Mumbai climate' },
        { category: 'Tools & Equipment', amount: 100000, description: 'Gardening tools, watering equipment, and maintenance supplies' },
        { category: 'Educational Materials', amount: 75000, description: 'Brochures, posters, and digital content for awareness campaigns' },
        { category: 'Transportation', amount: 75000, description: 'Vehicle costs for site visits and material transportation' },
        { category: 'Staff & Volunteer Support', amount: 100000, description: 'Training costs and volunteer coordination expenses' }
      ],
      justification: 'The budget allocation ensures comprehensive project execution with emphasis on quality materials, proper training, and effective community outreach.'
    },
    timeline: {
      milestones: [
        {
          title: 'Phase 1: Planning & Preparation',
          description: 'Site surveys, team training, material procurement, and volunteer recruitment',
          targetDate: new Date('2024-04-01'),
          budget: 100000,
          completed: true,
          completedDate: new Date('2024-03-28')
        },
        {
          title: 'Phase 2: Community Engagement',
          description: 'Awareness campaigns, educational workshops, and community partnership building',
          targetDate: new Date('2024-05-01'),
          budget: 125000,
          completed: true,
          completedDate: new Date('2024-04-30')
        },
        {
          title: 'Phase 3: Implementation',
          description: 'Tree plantation drives, waste management activities, and garden establishment',
          targetDate: new Date('2024-10-01'),
          budget: 200000,
          completed: false
        },
        {
          title: 'Phase 4: Monitoring & Evaluation',
          description: 'Progress tracking, impact assessment, and sustainability planning',
          targetDate: new Date('2024-12-31'),
          budget: 75000,
          completed: false
        }
      ]
    },
    reporting: {
      reportingFrequency: 'monthly'
    },
    compliance: {
      taxExemptionRequired: true,
      auditRequired: true
    },
    createdBy: admin._id
  });

  console.log('✅ Created grant application');
  return grant;
};

const createDonations = async (ngo: any, program: any) => {
  console.log('💳 Creating sample donations...');

  // Create donor users first
  const donor1Password = await bcrypt.hash('donor123', 12);
  const donor1 = await User.create({
    name: 'Amit Patel',
    email: 'amit.patel@email.com',
    password: donor1Password,
    phone: '9876543212',
    role: 'donor',
    isEmailVerified: true
  });

  const donor2Password = await bcrypt.hash('donor123', 12);
  const donor2 = await User.create({
    name: 'Sunita Rao',
    email: 'sunita.rao@email.com',
    password: donor2Password,
    phone: '9876543213',
    role: 'donor',
    isEmailVerified: true
  });

  const donor3Password = await bcrypt.hash('donor123', 12);
  const donor3 = await User.create({
    name: 'Anonymous Donor',
    email: 'anonymous@email.com',
    password: donor3Password,
    phone: '9876543299',
    role: 'donor',
    isEmailVerified: true
  });

  const donations = await Donation.insertMany([
    {
      donor: donor1._id,
      program: program._id,
      ngo: ngo._id,
      user: donor1._id,
      amount: 25000,
      currency: 'INR',
      donorName: 'Amit Patel',
      donorEmail: 'amit.patel@email.com',
      donorPhone: '9876543212',
      isAnonymous: false,
      message: 'Happy to support tree plantation drive in Mumbai!',
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      status: 'completed',
      paymentId: 'pay_demo_001',
      razorpayOrderId: 'order_demo_001',
      razorpayPaymentId: 'pay_demo_001',
      razorpaySignature: 'signature_demo_001',
      transactionId: 'txn_demo_001',
      receiptNumber: 'HHF/2024/001',
      receiptUrl: '/uploads/receipts/HHF-2024-001.pdf',
      taxBenefit: {
        eligible: true,
        section: '80G',
        percentage: 50,
        certificateGenerated: true
      },
      metadata: {
        source: 'web',
        campaign: 'Green Mumbai Campaign'
      },
      paidAt: new Date('2024-06-20')
    },
    {
      donor: donor2._id,
      program: program._id,
      ngo: ngo._id,
      user: donor2._id,
      amount: 50000,
      currency: 'INR',
      donorName: 'Sunita Rao',
      donorEmail: 'sunita.rao@email.com',
      donorPhone: '9876543213',
      isAnonymous: false,
      message: 'Supporting community garden development initiative.',
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      status: 'completed',
      paymentId: 'pay_demo_002',
      razorpayOrderId: 'order_demo_002',
      razorpayPaymentId: 'pay_demo_002',
      razorpaySignature: 'signature_demo_002',
      transactionId: 'txn_demo_002',
      receiptNumber: 'HHF/2024/002',
      receiptUrl: '/uploads/receipts/HHF-2024-002.pdf',
      taxBenefit: {
        eligible: true,
        section: '80G',
        percentage: 50,
        certificateGenerated: true
      },
      metadata: {
        source: 'web',
        campaign: 'Green Mumbai Campaign'
      },
      paidAt: new Date('2024-06-18')
    },
    {
      donor: donor3._id,
      program: program._id,
      ngo: ngo._id,
      user: donor3._id,
      amount: 10000,
      currency: 'INR',
      donorName: 'Anonymous Donor',
      donorEmail: 'anonymous@email.com',
      isAnonymous: true,
      message: 'Keep up the great work!',
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      status: 'completed',
      paymentId: 'pay_demo_003',
      razorpayOrderId: 'order_demo_003',
      razorpayPaymentId: 'pay_demo_003',
      razorpaySignature: 'signature_demo_003',
      transactionId: 'txn_demo_003',
      receiptNumber: 'HHF/2024/003',
      receiptUrl: '/uploads/receipts/HHF-2024-003.pdf',
      taxBenefit: {
        eligible: false,
        section: '80G',
        percentage: 0,
        certificateGenerated: false
      },
      metadata: {
        source: 'web',
        campaign: 'Green Mumbai Campaign'
      },
      paidAt: new Date('2024-06-15')
    }
  ]);

  console.log('✅ Created sample donations');
  return { donations, donors: [donor1, donor2, donor3] };
};

const createVolunteerApplications = async (ngo: any, program: any) => {
  console.log('🤝 Creating volunteer applications...');

  // Create volunteer users first
  const volunteer1Password = await bcrypt.hash('volunteer123', 12);
  const volunteer1 = await User.create({
    name: 'Arjun Mehta',
    email: 'arjun.mehta@email.com',
    password: volunteer1Password,
    phone: '9876543214',
    role: 'volunteer',
    isEmailVerified: true
  });

  const volunteer2Password = await bcrypt.hash('volunteer123', 12);
  const volunteer2 = await User.create({
    name: 'Kavya Singh',
    email: 'kavya.singh@email.com',
    password: volunteer2Password,
    phone: '9876543215',
    role: 'volunteer',
    isEmailVerified: true
  });

  const volunteerApplications = await Volunteer.insertMany([
    {
      user: volunteer1._id,
      ngo: ngo._id,
      program: program._id,
      status: 'approved',
      skills: ['Technology', 'Project Management', 'Photography'],
      experience: 'Previously volunteered with Greenpeace Mumbai for 2 years',
      motivation: 'I believe technology can play a crucial role in environmental conservation. I want to use my skills to help create digital solutions for the Green Mumbai Campaign.',
      availability: {
        daysPerWeek: 2,
        hoursPerDay: 4,
        preferredDays: ['saturday', 'sunday'],
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-12-31')
      },
      preferences: {
        workType: ['field_work', 'digital_marketing'],
        location: 'mumbai',
        transportation: 'public_transport'
      },
      background: {
        education: 'B.Tech Computer Science',
        occupation: 'Software Engineer',
        previousVolunteering: true
      },
      applicationDate: new Date('2024-03-01'),
      reviewDate: new Date('2024-03-05'),
      approvalDate: new Date('2024-03-05'),
      startDate: new Date('2024-03-15'),
      hoursCompleted: 48,
      activitiesParticipated: [
        'Tree plantation at Sanjay Gandhi National Park',
        'Beach cleanup at Juhu Beach',
        'Digital campaign for plastic reduction'
      ],
      feedback: {
        rating: 5,
        comments: 'Excellent volunteer! Very dedicated and brings innovative ideas.',
        reviewedBy: 'Priya Sharma',
        reviewDate: new Date('2024-06-01')
      }
    },
    {
      user: volunteer2._id,
      ngo: ngo._id,
      program: program._id,
      status: 'pending',
      skills: ['Healthcare', 'Education', 'Research'],
      experience: 'Active member of college environmental club, organized health awareness camps',
      motivation: 'As a medical student, I understand the direct impact of environmental issues on public health. I want to contribute to creating a healthier Mumbai.',
      availability: {
        daysPerWeek: 1,
        hoursPerDay: 6,
        preferredDays: ['sunday'],
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31')
      },
      preferences: {
        workType: ['community_outreach', 'education'],
        location: 'mumbai',
        transportation: 'public_transport'
      },
      background: {
        education: 'MBBS 3rd Year',
        occupation: 'Medical Student',
        previousVolunteering: true
      },
      applicationDate: new Date('2024-06-20'),
      documents: ['/uploads/medical-student-id.pdf']
    }
  ]);

  console.log('✅ Created volunteer applications');
  return { volunteer1, volunteer2, volunteerApplications };
};

const createNotifications = async (ngo: any, admin: any, manager: any, program: any, grant: any) => {
  console.log('🔔 Creating demo notifications...');

  const notifications = await Notification.insertMany([
    {
      userId: admin._id,
      type: 'grant',
      title: 'Grant Application Approved',
      message: 'Your Environmental Conservation Grant 2024 has been approved for ₹5,00,000',
      read: false,
      actionUrl: `/dashboard/grants/${grant._id}`,
      metadata: {
        grantId: grant._id,
        ngoId: ngo._id
      }
    },
    {
      userId: manager._id,
      type: 'volunteer',
      title: 'New Volunteer Application',
      message: 'Kavya Singh has applied to volunteer for Green Mumbai Campaign',
      read: false,
      actionUrl: `/dashboard/volunteers`,
      metadata: {
        ngoId: ngo._id
      }
    },
    {
      userId: admin._id,
      type: 'donation',
      title: 'New Donation Received',
      message: 'Received ₹50,000 donation from Sunita Rao for Green Mumbai Campaign',
      read: true,
      actionUrl: `/dashboard/donations`,
      metadata: {
        ngoId: ngo._id
      }
    },
    {
      userId: admin._id,
      type: 'general',
      title: 'Milestone Completed',
      message: 'Phase 2: Community Engagement milestone completed for Green Mumbai Campaign',
      read: true,
      actionUrl: `/dashboard/programs/${program._id}`,
      metadata: {
        ngoId: ngo._id
      }
    },
    {
      userId: manager._id,
      type: 'volunteer',
      title: 'Volunteer Application Approved',
      message: 'Arjun Mehta has been approved as a volunteer for Green Mumbai Campaign',
      read: true,
      actionUrl: `/dashboard/volunteers`,
      metadata: {
        ngoId: ngo._id
      }
    }
  ]);

  console.log('✅ Created demo notifications');
  return notifications;
};

const main = async () => {
  try {
    await connectToDB();

    console.log('🌟 Starting Demo NGO Setup - Helping Hands Foundation');

    // Clear existing demo data
    console.log('🧹 Cleaning up existing demo data...');
    await NGO.deleteOne({ registrationNumber: 'MH/2010/NGO/12345' });
    await Program.deleteMany({ title: 'Green Mumbai Campaign' });
    await Grant.deleteMany({ title: 'Environmental Conservation Grant 2024' });
    await Donation.deleteMany({ receiptNumber: { $regex: '^HHF/2024/' } });
    await Volunteer.deleteMany({});
    await Notification.deleteMany({});
    await User.deleteMany({ 
      email: { 
        $in: [
          'admin@helpinghandsfoundation.org',
          'manager@helpinghandsfoundation.org',
          'arjun.mehta@email.com',
          'kavya.singh@email.com',
          'amit.patel@email.com',
          'sunita.rao@email.com',
          'anonymous@email.com'
        ] 
      } 
    });

    // Create demo NGO and users
    const { ngoAdmin, ngoManager, helpingHandsNGO, mumbai } = await createDemoNGO();

    // Create Green Mumbai Campaign
    const greenCampaign = await createGreenMumbaiCampaign(helpingHandsNGO, ngoAdmin);

    // Create grant application
    const grant = await createGrantApplication(helpingHandsNGO, greenCampaign, ngoAdmin);

    // Create donations
    const { donations, donors } = await createDonations(helpingHandsNGO, greenCampaign);

    // Create volunteer applications
    const { volunteer1, volunteer2, volunteerApplications } = await createVolunteerApplications(helpingHandsNGO, greenCampaign);

    // Create notifications
    const notifications = await createNotifications(helpingHandsNGO, ngoAdmin, ngoManager, greenCampaign, grant);

    console.log('🎉 Demo NGO Setup Completed Successfully!');
    console.log('📊 Summary:');
    console.log(`   - NGO: ${helpingHandsNGO.name}`);
    console.log(`   - Admin: ${ngoAdmin.email} / admin123`);
    console.log(`   - Manager: ${ngoManager.email} / manager123`);
    console.log(`   - Program: ${greenCampaign.title}`);
    console.log(`   - Grant: ${grant.title} (₹${grant.requestedAmount.toLocaleString()})`);
    console.log(`   - Donations: ${donations.length} donations (₹${donations.reduce((sum: number, d: any) => sum + d.amount, 0).toLocaleString()})`);
    console.log(`   - Donors: ${donors.length} donor accounts`);
    console.log(`   - Volunteers: ${volunteerApplications.length} applications`);
    console.log(`   - Notifications: ${notifications.length} notifications`);
    console.log('');
    console.log('🔗 Access URLs:');
    console.log('   - NGO Public Page: http://localhost:5173/ngo/helping-hands-foundation');
    console.log('   - Admin Dashboard: http://localhost:5173/dashboard (admin@helpinghandsfoundation.org / admin123)');
    console.log('   - Manager Dashboard: http://localhost:5173/dashboard (manager@helpinghandsfoundation.org / manager123)');

  } catch (error) {
    console.error('❌ Error setting up demo NGO:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

if (require.main === module) {
  main();
}

export { main as setupDemoNGO };
