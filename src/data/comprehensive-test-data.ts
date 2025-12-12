import { faker } from '@faker-js/faker';

// Type definitions for test data
interface TestUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  isEmailVerified: boolean;
  isActive: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestNGO {
  _id: string;
  name: string;
  description: string;
  mission: string;
  vision: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  registrationNumber: string;
  panNumber: string;
  fcraNumber?: string;
  establishedYear: number;
  operationalAreas: string[];
  targetBeneficiaries: string;
  impactMetrics: string;
  logo: string;
  bannerImage: string;
  images: string[];
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  representative: {
    name: string;
    designation: string;
    phone: string;
    email: string;
    idType: string;
    idNumber: string;
  };
  documents: {
    registrationCertificateUrl: string;
    panCardUrl: string;
    taxExemptionCertUrl?: string;
    fcraCertificateUrl?: string;
  };
  status: string;
  isVerified: boolean;
  verificationDate?: Date;
  totalDonations: number;
  donorCount: number;
  volunteerCount: number;
  programCount: number;
  beneficiariesServed: number;
  adminId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestProgram {
  _id: string;
  title: string;
  description: string;
  ngoId: string;
  category: string;
  startDate: Date;
  endDate: Date;
  location: string;
  targetBeneficiaries: number;
  currentBeneficiaries: number;
  goalAmount: number;
  collectedAmount: number;
  status: string;
  eligibilityCriteria: string;
  requirements: string[];
  imageUrl: string;
  mediaUrls: string[];
  volunteers: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestEvent {
  _id: string;
  title: string;
  description: string;
  ngo: string;
  createdBy: string;
  eventType: string;
  category: string;
  startDate: Date;
  endDate: Date;
  location: any;
  venue: string;
  maxAttendees: number;
  currentAttendees: number;
  registrationDeadline: Date;
  registrationFee: number;
  requirements: string[];
  agenda: any[];
  speakers: any[];
  images: string[];
  status: string;
  featured: boolean;
  tags: string[];
  targetAudience: string[];
  objectives: string[];
  expectedOutcome: string;
  budget: any;
  promotion: any;
  feedback: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface TestDonation {
  _id: string;
  ngoId: string;
  programId?: string;
  userId?: string;
  amount: number;
  currency: string;
  isAnonymous: boolean;
  message?: string;
  paymentMethod: string;
  paymentId: string;
  orderId: string;
  status: string;
  transactionFee: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TestVolunteerOpportunity {
  _id: string;
  title: string;
  description: string;
  ngoId: string;
  category: string;
  skillsRequired: string[];
  timeCommitment: string;
  duration: string;
  location: string;
  isRemote: boolean;
  maxVolunteers: number;
  currentVolunteers: number;
  requirements: string[];
  benefits: string[];
  applicationDeadline: Date;
  startDate: Date;
  isActive: boolean;
  createdBy: string;
  applicants: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Generate comprehensive test data for SevaDaan NGO Platform
export const generateComprehensiveTestData = () => {
  
  // Test User Profiles (20 users with different roles)
  const testUsers = [
    {
      _id: "507f1f77bcf86cd799439011",
      name: "Admin User",
      email: "admin@sevadaan.com",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "system_admin",
      phone: "9876543210",
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      _id: "507f1f77bcf86cd799439012",
      name: "Rajesh Kumar",
      email: "rajesh.ngo@sevadaan.com",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "ngo_admin",
      phone: "9876543211",
      isEmailVerified: true,
      isActive: true,
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      _id: "507f1f77bcf86cd799439013",
      name: "Priya Sharma",
      email: "priya.volunteer@sevadaan.com",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "volunteer",
      phone: "9876543212",
      isEmailVerified: true,
      isActive: true,
      avatar: "https://randomuser.me/api/portraits/women/1.jpg",
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03')
    },
    {
      _id: "507f1f77bcf86cd799439014",
      name: "Amit Patel",
      email: "amit.donor@sevadaan.com",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "donor",
      phone: "9876543213",
      isEmailVerified: true,
      isActive: true,
      avatar: "https://randomuser.me/api/portraits/men/2.jpg",
      createdAt: new Date('2024-01-04'),
      updatedAt: new Date('2024-01-04')
    },
    {
      _id: "507f1f77bcf86cd799439015",
      name: "Sunita Singh",
      email: "sunita.citizen@sevadaan.com",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "citizen",
      phone: "9876543214",
      isEmailVerified: true,
      isActive: true,
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05')
    }
  ];

  // Add 15 more test users with random data
  for (let i = 16; i <= 30; i++) {
    const roles = ['volunteer', 'donor', 'citizen', 'ngo_manager'];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const gender = Math.random() > 0.5 ? 'men' : 'women';
    const genderNum = Math.floor(Math.random() * 99) + 1;
    
    testUsers.push({
      _id: `507f1f77bcf86cd7994390${i.toString().padStart(2, '0')}`,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: role as any,
      phone: `987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      isEmailVerified: true,
      isActive: true,
      avatar: `https://randomuser.me/api/portraits/${gender}/${genderNum}.jpg`,
      createdAt: faker.date.between({ from: '2024-01-01', to: '2024-12-01' }),
      updatedAt: faker.date.recent()
    });
  }

  // 20 Comprehensive NGOs with complete profiles
  const testNGOs = [
    {
      _id: "507f1f77bcf86cd799439101",
      name: "Helping Hands Foundation",
      description: "Dedicated to providing education and healthcare to underprivileged children in rural areas. We believe every child deserves access to quality education and basic healthcare facilities.",
      mission: "To empower underprivileged children through education and healthcare, creating a foundation for a better future.",
      vision: "A world where every child has access to quality education and healthcare regardless of their socio-economic background.",
      address: "123 Gandhi Road, Sector 15",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      contactEmail: "contact@helpinghands.org",
      contactPhone: "9876543301",
      website: "https://helpinghands.org",
      registrationNumber: "NGO/2020/001",
      panNumber: "AABCH1234F",
      fcraNumber: "FCRA/2020/001",
      establishedYear: 2015,
      operationalAreas: ["Education", "Healthcare", "Child Welfare"],
      targetBeneficiaries: "Underprivileged children aged 5-18",
      impactMetrics: "Educated 5000+ children, Provided healthcare to 10000+ families",
      logo: "https://via.placeholder.com/200x200/4CAF50/white?text=HH",
      bannerImage: "https://via.placeholder.com/800x300/4CAF50/white?text=Helping+Hands",
      images: [
        "https://via.placeholder.com/400x300/4CAF50/white?text=School+1",
        "https://via.placeholder.com/400x300/2196F3/white?text=Hospital+1",
        "https://via.placeholder.com/400x300/FF9800/white?text=Event+1"
      ],
      socialLinks: {
        facebook: "https://facebook.com/helpinghands",
        twitter: "https://twitter.com/helpinghands",
        instagram: "https://instagram.com/helpinghands",
        linkedin: "https://linkedin.com/company/helpinghands"
      },
      bankDetails: {
        accountName: "Helping Hands Foundation",
        bankName: "State Bank of India",
        accountNumber: "12345678901",
        ifscCode: "SBIN0001234"
      },
      representative: {
        name: "Dr. Rajesh Kumar",
        designation: "Founder & Director",
        phone: "9876543301",
        email: "rajesh@helpinghands.org",
        idType: "aadhaar",
        idNumber: "1234-5678-9012"
      },
      documents: {
        registrationCertificateUrl: "https://via.placeholder.com/600x800/FF5722/white?text=Registration+Certificate",
        panCardUrl: "https://via.placeholder.com/600x400/673AB7/white?text=PAN+Card",
        taxExemptionCertUrl: "https://via.placeholder.com/600x800/009688/white?text=Tax+Exemption",
        fcraCertificateUrl: "https://via.placeholder.com/600x800/795548/white?text=FCRA+Certificate"
      },
      status: "verified",
      isVerified: true,
      verificationDate: new Date('2024-02-01'),
      totalDonations: 2500000,
      donorCount: 850,
      volunteerCount: 120,
      programCount: 15,
      beneficiariesServed: 5000,
      adminId: "507f1f77bcf86cd799439012",
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-12-01')
    },
    {
      _id: "507f1f77bcf86cd799439102",
      name: "Green Earth Initiative",
      description: "Environmental conservation organization focused on climate change mitigation, renewable energy promotion, and sustainable development practices.",
      mission: "To create a sustainable environment through conservation efforts, renewable energy adoption, and community awareness programs.",
      vision: "A green planet where humans and nature coexist in perfect harmony for future generations.",
      address: "456 Tree Lane, Eco Park",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      contactEmail: "info@greenearth.org",
      contactPhone: "9876543302",
      website: "https://greenearth.org",
      registrationNumber: "NGO/2020/002",
      panNumber: "AABCG5678E",
      fcraNumber: "FCRA/2020/002",
      establishedYear: 2018,
      operationalAreas: ["Environment", "Climate Change", "Renewable Energy"],
      targetBeneficiaries: "Communities affected by climate change",
      impactMetrics: "Planted 50000+ trees, Installed 200+ solar panels, Trained 2000+ farmers",
      logo: "https://via.placeholder.com/200x200/4CAF50/white?text=GE",
      bannerImage: "https://via.placeholder.com/800x300/4CAF50/white?text=Green+Earth",
      images: [
        "https://via.placeholder.com/400x300/4CAF50/white?text=Tree+Plantation",
        "https://via.placeholder.com/400x300/2196F3/white?text=Solar+Installation",
        "https://via.placeholder.com/400x300/FF9800/white?text=Awareness+Camp"
      ],
      socialLinks: {
        facebook: "https://facebook.com/greenearth",
        twitter: "https://twitter.com/greenearth",
        instagram: "https://instagram.com/greenearth"
      },
      bankDetails: {
        accountName: "Green Earth Initiative",
        bankName: "HDFC Bank",
        accountNumber: "23456789012",
        ifscCode: "HDFC0001234"
      },
      representative: {
        name: "Dr. Priya Sharma",
        designation: "Environmental Scientist & Director",
        phone: "9876543302",
        email: "priya@greenearth.org",
        idType: "pan",
        idNumber: "AABCG5678E"
      },
      documents: {
        registrationCertificateUrl: "https://via.placeholder.com/600x800/4CAF50/white?text=Registration+Certificate",
        panCardUrl: "https://via.placeholder.com/600x400/4CAF50/white?text=PAN+Card"
      },
      status: "verified",
      isVerified: true,
      verificationDate: new Date('2024-02-15'),
      totalDonations: 1800000,
      donorCount: 650,
      volunteerCount: 95,
      programCount: 12,
      beneficiariesServed: 3500,
      adminId: "507f1f77bcf86cd799439013",
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-12-01')
    },
    {
      _id: "507f1f77bcf86cd799439103",
      name: "Women Empowerment Trust",
      description: "Dedicated to empowering women through skill development, entrepreneurship training, and creating livelihood opportunities in rural and urban areas.",
      mission: "To empower women economically and socially through skill development and entrepreneurship opportunities.",
      vision: "A society where every woman is financially independent and socially empowered.",
      address: "789 Empowerment Street, Women's Colony",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      contactEmail: "contact@womenempowerment.org",
      contactPhone: "9876543303",
      website: "https://womenempowerment.org",
      registrationNumber: "NGO/2020/003",
      panNumber: "AABCW9012D",
      establishedYear: 2016,
      operationalAreas: ["Women Empowerment", "Skill Development", "Entrepreneurship"],
      targetBeneficiaries: "Women aged 18-50 from economically weaker sections",
      impactMetrics: "Trained 3000+ women, Started 500+ micro-enterprises, Created 1500+ jobs",
      logo: "https://via.placeholder.com/200x200/E91E63/white?text=WE",
      bannerImage: "https://via.placeholder.com/800x300/E91E63/white?text=Women+Empowerment",
      images: [
        "https://via.placeholder.com/400x300/E91E63/white?text=Skill+Training",
        "https://via.placeholder.com/400x300/9C27B0/white?text=Entrepreneurship",
        "https://via.placeholder.com/400x300/673AB7/white?text=Success+Stories"
      ],
      socialLinks: {
        facebook: "https://facebook.com/womenempowerment",
        instagram: "https://instagram.com/womenempowerment",
        linkedin: "https://linkedin.com/company/womenempowerment"
      },
      bankDetails: {
        accountName: "Women Empowerment Trust",
        bankName: "ICICI Bank",
        accountNumber: "34567890123",
        ifscCode: "ICIC0001234"
      },
      representative: {
        name: "Ms. Sunita Singh",
        designation: "Program Director",
        phone: "9876543303",
        email: "sunita@womenempowerment.org",
        idType: "aadhaar",
        idNumber: "2345-6789-0123"
      },
      documents: {
        registrationCertificateUrl: "https://via.placeholder.com/600x800/E91E63/white?text=Registration+Certificate",
        panCardUrl: "https://via.placeholder.com/600x400/E91E63/white?text=PAN+Card"
      },
      status: "verified",
      isVerified: true,
      verificationDate: new Date('2024-03-01'),
      totalDonations: 1200000,
      donorCount: 450,
      volunteerCount: 80,
      programCount: 10,
      beneficiariesServed: 3000,
      adminId: "507f1f77bcf86cd799439014",
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-12-01')
    }
  ];

  // Generate 17 more NGOs with varied data
  const ngoCategories = [
    "Healthcare", "Education", "Environment", "Women Empowerment", "Child Welfare",
    "Elder Care", "Animal Welfare", "Disaster Relief", "Skill Development",
    "Rural Development", "Urban Development", "Mental Health", "Technology",
    "Arts & Culture", "Sports", "Food Security", "Water Conservation"
  ];

  const cities = [
    { city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
    { city: "Kolkata", state: "West Bengal", pincode: "700001" },
    { city: "Hyderabad", state: "Telangana", pincode: "500001" },
    { city: "Pune", state: "Maharashtra", pincode: "411001" },
    { city: "Ahmedabad", state: "Gujarat", pincode: "380001" },
    { city: "Jaipur", state: "Rajasthan", pincode: "302001" },
    { city: "Lucknow", state: "Uttar Pradesh", pincode: "226001" },
    { city: "Bhopal", state: "Madhya Pradesh", pincode: "462001" },
    { city: "Patna", state: "Bihar", pincode: "800001" },
    { city: "Thiruvananthapuram", state: "Kerala", pincode: "695001" },
    { city: "Guwahati", state: "Assam", pincode: "781001" },
    { city: "Chandigarh", state: "Punjab", pincode: "160001" },
    { city: "Raipur", state: "Chhattisgarh", pincode: "492001" },
    { city: "Gandhinagar", state: "Gujarat", pincode: "382001" },
    { city: "Panaji", state: "Goa", pincode: "403001" },
    { city: "Shimla", state: "Himachal Pradesh", pincode: "171001" },
    { city: "Ranchi", state: "Jharkhand", pincode: "834001" }
  ];

  for (let i = 4; i <= 20; i++) {
    const category = ngoCategories[i - 4];
    const location = cities[i - 4];
    const orgId = (103 + i).toString();
    const adminId = (15 + i).toString().padStart(2, '0');
    
    testNGOs.push({
      _id: `507f1f77bcf86cd7994391${orgId}`,
      name: `${category} ${faker.company.name()}`,
      description: `Leading organization in ${category.toLowerCase()} working towards ${faker.lorem.sentence(15)}`,
      mission: `To ${faker.lorem.sentence(12)}`,
      vision: `${faker.lorem.sentence(10)}`,
      address: faker.location.streetAddress(),
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      contactEmail: faker.internet.email(),
      contactPhone: `987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      website: faker.internet.url(),
      registrationNumber: `NGO/2020/${i.toString().padStart(3, '0')}`,
      panNumber: `AABC${faker.string.alphanumeric(5).toUpperCase()}`,
      fcraNumber: Math.random() > 0.3 ? `FCRA/2020/${i.toString().padStart(3, '0')}` : undefined,
      establishedYear: faker.date.between({ from: '2010-01-01', to: '2020-12-31' }).getFullYear(),
      operationalAreas: [category, faker.lorem.word(), faker.lorem.word()],
      targetBeneficiaries: faker.lorem.sentence(8),
      impactMetrics: `Served ${Math.floor(Math.random() * 10000) + 1000}+ beneficiaries, Completed ${Math.floor(Math.random() * 50) + 10}+ projects`,
      logo: `https://via.placeholder.com/200x200/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=${category.substring(0, 2)}`,
      bannerImage: `https://via.placeholder.com/800x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=${category}`,
      images: [
        `https://via.placeholder.com/400x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Project+1`,
        `https://via.placeholder.com/400x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Project+2`,
        `https://via.placeholder.com/400x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Event+1`
      ],
      socialLinks: (() => {
        const links: any = {};
        if (Math.random() > 0.3) links.facebook = faker.internet.url();
        if (Math.random() > 0.5) links.twitter = faker.internet.url();
        if (Math.random() > 0.4) links.instagram = faker.internet.url();
        if (Math.random() > 0.6) links.linkedin = faker.internet.url();
        return links;
      })(),
      bankDetails: {
        accountName: `${category} ${faker.company.name()}`,
        bankName: faker.helpers.arrayElement(["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank"]),
        accountNumber: faker.finance.accountNumber(11),
        ifscCode: `${faker.string.alpha(4).toUpperCase()}0001234`
      },
      representative: {
        name: faker.person.fullName(),
        designation: faker.person.jobTitle(),
        phone: `987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        email: faker.internet.email(),
        idType: faker.helpers.arrayElement(["aadhaar", "pan", "passport"]),
        idNumber: faker.string.alphanumeric(12)
      },
      documents: (() => {
        const docs: any = {
          registrationCertificateUrl: `https://via.placeholder.com/600x800/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Registration`,
          panCardUrl: `https://via.placeholder.com/600x400/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=PAN+Card`
        };
        if (Math.random() > 0.3) docs.taxExemptionCertUrl = `https://via.placeholder.com/600x800/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Tax+Exemption`;
        if (Math.random() > 0.5) docs.fcraCertificateUrl = `https://via.placeholder.com/600x800/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=FCRA`;
        return docs;
      })(),
      status: faker.helpers.arrayElement(["verified", "under_review", "pending"]),
      isVerified: Math.random() > 0.2,
      verificationDate: Math.random() > 0.2 ? faker.date.between({ from: '2024-02-01', to: '2024-11-01' }) : new Date(),
      totalDonations: Math.floor(Math.random() * 5000000) + 100000,
      donorCount: Math.floor(Math.random() * 1000) + 50,
      volunteerCount: Math.floor(Math.random() * 200) + 20,
      programCount: Math.floor(Math.random() * 30) + 5,
      beneficiariesServed: Math.floor(Math.random() * 8000) + 500,
      adminId: `507f1f77bcf86cd7994390${adminId}`,
      createdAt: faker.date.between({ from: '2024-01-01', to: '2024-06-01' }),
      updatedAt: faker.date.recent()
    });
  }

  // Programs for each NGO
  const testPrograms: TestProgram[] = [];
  testNGOs.forEach((ngo, ngoIndex) => {
    const programCount = Math.floor(Math.random() * 5) + 3; // 3-7 programs per NGO
    
    for (let i = 0; i < programCount; i++) {
      const programId = `607f1f77bcf86cd${(799440000 + (ngoIndex * 10) + i).toString()}`;
      const startDate = faker.date.between({ from: '2024-01-01', to: '2024-12-31' });
      const endDate = faker.date.future({ years: 1, refDate: startDate });
      
      testPrograms.push({
        _id: programId,
        title: `${faker.lorem.words(3)} Program`,
        description: faker.lorem.paragraph(3),
        ngoId: ngo._id,
        category: faker.helpers.arrayElement(ngo.operationalAreas),
        startDate: startDate,
        endDate: endDate,
        location: `${ngo.city}, ${ngo.state}`,
        targetBeneficiaries: Math.floor(Math.random() * 500) + 50,
        currentBeneficiaries: Math.floor(Math.random() * 300) + 20,
        goalAmount: Math.floor(Math.random() * 1000000) + 100000,
        collectedAmount: Math.floor(Math.random() * 800000) + 50000,
        status: faker.helpers.arrayElement(["active", "completed", "draft"]),
        eligibilityCriteria: faker.lorem.sentence(),
        requirements: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
        imageUrl: `https://via.placeholder.com/600x400/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Program+${i + 1}`,
        mediaUrls: [
          `https://via.placeholder.com/400x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Media+1`,
          `https://via.placeholder.com/400x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Media+2`
        ],
        volunteers: [
          testUsers[Math.floor(Math.random() * testUsers.length)]._id,
          testUsers[Math.floor(Math.random() * testUsers.length)]._id
        ],
        isActive: true,
        createdBy: ngo.adminId,
        createdAt: faker.date.between({ from: '2024-02-01', to: '2024-10-01' }),
        updatedAt: faker.date.recent()
      });
    }
  });

  // Events for NGOs
  const testEvents: TestEvent[] = [];
  testNGOs.forEach((ngo, ngoIndex) => {
    const eventCount = Math.floor(Math.random() * 4) + 2; // 2-5 events per NGO
    
    for (let i = 0; i < eventCount; i++) {
      const eventId = `608f1f77bcf86cd${(799450000 + (ngoIndex * 10) + i).toString()}`;
      const startDate = faker.date.future({ years: 1 });
      const endDate = new Date(startDate.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)); // Up to 7 days duration
      
      testEvents.push({
        _id: eventId,
        title: `${faker.lorem.words(4)} Event`,
        description: faker.lorem.paragraph(2),
        ngo: ngo._id,
        createdBy: ngo.adminId,
        eventType: faker.helpers.arrayElement(["fundraising", "awareness", "volunteer", "community", "workshop", "campaign"]),
        category: faker.helpers.arrayElement(ngo.operationalAreas),
        startDate: startDate,
        endDate: endDate,
        location: {
          address: faker.location.streetAddress(),
          city: ngo.city,
          state: ngo.state,
          pincode: ngo.pincode,
          coordinates: {
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude()
          }
        },
        venue: faker.company.name() + " Hall",
        maxAttendees: Math.floor(Math.random() * 200) + 50,
        currentAttendees: Math.floor(Math.random() * 150) + 10,
        registrationDeadline: new Date(startDate.getTime() - (24 * 60 * 60 * 1000)), // 1 day before
        registrationFee: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) + 100 : 0,
        requirements: [faker.lorem.word(), faker.lorem.word()],
        agenda: [
          { time: "09:00 AM", activity: "Registration", speaker: "" },
          { time: "10:00 AM", activity: faker.lorem.words(3), speaker: faker.person.fullName() },
          { time: "11:30 AM", activity: faker.lorem.words(3), speaker: faker.person.fullName() },
          { time: "01:00 PM", activity: "Lunch Break", speaker: "" },
          { time: "02:00 PM", activity: faker.lorem.words(3), speaker: faker.person.fullName() }
        ],
        speakers: [
          {
            name: faker.person.fullName(),
            bio: faker.lorem.paragraph(1),
            photo: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99) + 1}.jpg`
          }
        ],
        images: [
          `https://via.placeholder.com/600x400/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Event+${i + 1}`,
          `https://via.placeholder.com/400x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Venue`
        ],
        status: faker.helpers.arrayElement(["draft", "published", "ongoing", "completed"]),
        featured: Math.random() > 0.7,
        tags: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
        targetAudience: [faker.lorem.word(), faker.lorem.word()],
        objectives: [faker.lorem.sentence(), faker.lorem.sentence()],
        expectedOutcome: faker.lorem.sentence(),
        budget: {
          total: Math.floor(Math.random() * 100000) + 10000,
          spent: Math.floor(Math.random() * 50000) + 5000,
          breakdown: [
            { category: "Venue", amount: Math.floor(Math.random() * 20000) + 5000, description: "Hall rental" },
            { category: "Catering", amount: Math.floor(Math.random() * 15000) + 3000, description: "Food and beverages" },
            { category: "Marketing", amount: Math.floor(Math.random() * 10000) + 2000, description: "Promotional materials" }
          ]
        },
        promotion: {
          socialMedia: true,
          emailCampaign: Math.random() > 0.3,
          pressRelease: Math.random() > 0.5,
          partnerNotification: Math.random() > 0.4
        },
        feedback: [],
        createdAt: faker.date.between({ from: '2024-03-01', to: '2024-11-01' }),
        updatedAt: faker.date.recent()
      });
    }
  });

  // Donations
  const testDonations: TestDonation[] = [];
  for (let i = 0; i < 200; i++) { // 200 donations
    const donationId = `609f1f77bcf86cd${(799460000 + i).toString()}`;
    const ngo = testNGOs[Math.floor(Math.random() * testNGOs.length)];
    const donor = testUsers[Math.floor(Math.random() * testUsers.length)];
    const program = testPrograms.filter(p => p.ngoId === ngo._id)[0]; // Get a program from the same NGO
    
    testDonations.push({
      _id: donationId,
      ngoId: ngo._id,
      programId: Math.random() > 0.5 ? program?._id : undefined,
      userId: Math.random() > 0.2 ? donor._id : undefined, // Some anonymous donations
      amount: Math.floor(Math.random() * 50000) + 500,
      currency: "INR",
      isAnonymous: Math.random() > 0.8,
      message: Math.random() > 0.5 ? faker.lorem.sentence() : undefined,
      paymentMethod: faker.helpers.arrayElement(["credit_card", "debit_card", "upi", "net_banking", "wallet"]),
      paymentId: `pay_${faker.string.alphanumeric(14)}`,
      orderId: `order_${faker.string.alphanumeric(14)}`,
      status: faker.helpers.arrayElement(["completed", "pending", "failed"]),
      transactionFee: Math.floor(Math.random() * 100) + 10,
      createdAt: faker.date.between({ from: '2024-01-01', to: '2024-12-01' }),
      updatedAt: faker.date.recent()
    });
  }

  // Volunteer opportunities
  const testVolunteerOpportunities: TestVolunteerOpportunity[] = [];
  testNGOs.forEach((ngo, ngoIndex) => {
    const opportunityCount = Math.floor(Math.random() * 3) + 2; // 2-4 opportunities per NGO
    
    for (let i = 0; i < opportunityCount; i++) {
      const oppId = `610f1f77bcf86cd${(799470000 + (ngoIndex * 10) + i).toString()}`;
      
      testVolunteerOpportunities.push({
        _id: oppId,
        title: `${faker.lorem.words(3)} Volunteer`,
        description: faker.lorem.paragraph(2),
        ngoId: ngo._id,
        category: faker.helpers.arrayElement(ngo.operationalAreas),
        skillsRequired: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
        timeCommitment: faker.helpers.arrayElement(["2-4 hours/week", "5-10 hours/week", "Full-time", "Weekend only"]),
        duration: faker.helpers.arrayElement(["1 month", "3 months", "6 months", "1 year", "Ongoing"]),
        location: `${ngo.city}, ${ngo.state}`,
        isRemote: Math.random() > 0.7,
        maxVolunteers: Math.floor(Math.random() * 20) + 5,
        currentVolunteers: Math.floor(Math.random() * 15) + 1,
        requirements: [faker.lorem.sentence(), faker.lorem.sentence()],
        benefits: [faker.lorem.sentence(), faker.lorem.sentence()],
        applicationDeadline: faker.date.future(),
        startDate: faker.date.future(),
        isActive: true,
        createdBy: ngo.adminId,
        applicants: [
          testUsers[Math.floor(Math.random() * testUsers.length)]._id,
          testUsers[Math.floor(Math.random() * testUsers.length)]._id
        ],
        createdAt: faker.date.between({ from: '2024-02-01', to: '2024-11-01' }),
        updatedAt: faker.date.recent()
      });
    }
  });

  return {
    users: testUsers,
    ngos: testNGOs,
    programs: testPrograms,
    events: testEvents,
    donations: testDonations,
    volunteerOpportunities: testVolunteerOpportunities,
    summary: {
      totalUsers: testUsers.length,
      totalNGOs: testNGOs.length,
      totalPrograms: testPrograms.length,
      totalEvents: testEvents.length,
      totalDonations: testDonations.length,
      totalVolunteerOpportunities: testVolunteerOpportunities.length,
      totalDonationAmount: testDonations.reduce((sum, d) => sum + d.amount, 0),
      verifiedNGOs: testNGOs.filter(n => n.isVerified).length
    }
  };
};

// Sample API responses for testing
export const sampleAPIResponses = {
  // NGO List API Response
  ngos: {
    success: true,
    data: generateComprehensiveTestData().ngos.slice(0, 10), // First 10 NGOs
    pagination: {
      page: 1,
      limit: 10,
      total: 20,
      totalPages: 2
    }
  },
  
  // User Dashboard Data
  dashboard: {
    success: true,
    data: {
      totalNGOs: 20,
      verifiedNGOs: 18,
      totalPrograms: 85,
      activePrograms: 62,
      totalDonations: 15750000,
      totalVolunteers: 2100,
      totalBeneficiaries: 45000,
      recentDonations: generateComprehensiveTestData().donations.slice(0, 5),
      topNGOs: generateComprehensiveTestData().ngos.slice(0, 5),
      upcomingEvents: generateComprehensiveTestData().events.slice(0, 3)
    }
  },
  
  // Analytics Data
  analytics: {
    success: true,
    data: {
      donationTrends: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
        amount: Math.floor(Math.random() * 500000) + 100000,
        count: Math.floor(Math.random() * 200) + 50
      })),
      categoryDistribution: [
        { category: "Education", count: 5, percentage: 25 },
        { category: "Healthcare", count: 4, percentage: 20 },
        { category: "Environment", count: 3, percentage: 15 },
        { category: "Women Empowerment", count: 3, percentage: 15 },
        { category: "Others", count: 5, percentage: 25 }
      ],
      impactMetrics: {
        livesImpacted: 45000,
        programsCompleted: 156,
        volunteersEngaged: 2100,
        partnershipsFormed: 45
      }
    }
  }
};

// Test credentials for quick login
export const testCredentials = {
  admin: {
    email: "admin@sevadaan.com",
    password: "password",
    role: "system_admin"
  },
  ngoAdmin: {
    email: "rajesh.ngo@sevadaan.com",
    password: "password",
    role: "ngo_admin"
  },
  volunteer: {
    email: "priya.volunteer@sevadaan.com",
    password: "password",
    role: "volunteer"
  },
  donor: {
    email: "amit.donor@sevadaan.com",
    password: "password",
    role: "donor"
  },
  citizen: {
    email: "sunita.citizen@sevadaan.com",
    password: "password",
    role: "citizen"
  }
};

export default {
  generateComprehensiveTestData,
  sampleAPIResponses,
  testCredentials
};
