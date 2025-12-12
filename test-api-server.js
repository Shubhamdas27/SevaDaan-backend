// Simple test data server endpoints for SevaDaan platform
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Import test data (simplified version for simple server)
const generateTestData = () => {
  const testUsers = [
    {
      id: "1",
      name: "Admin User",
      email: "admin@sevadaan.com",
      role: "system_admin",
      phone: "9876543210",
      avatar: "https://randomuser.me/api/portraits/men/1.jpg"
    },
    {
      id: "2", 
      name: "Rajesh Kumar",
      email: "rajesh.ngo@sevadaan.com",
      role: "ngo_admin",
      phone: "9876543211",
      avatar: "https://randomuser.me/api/portraits/men/2.jpg"
    },
    {
      id: "3",
      name: "Priya Sharma", 
      email: "priya.volunteer@sevadaan.com",
      role: "volunteer",
      phone: "9876543212",
      avatar: "https://randomuser.me/api/portraits/women/1.jpg"
    },
    {
      id: "4",
      name: "Amit Patel",
      email: "amit.donor@sevadaan.com", 
      role: "donor",
      phone: "9876543213",
      avatar: "https://randomuser.me/api/portraits/men/3.jpg"
    },
    {
      id: "5",
      name: "Sunita Singh",
      email: "sunita.citizen@sevadaan.com",
      role: "citizen", 
      phone: "9876543214",
      avatar: "https://randomuser.me/api/portraits/women/2.jpg"
    }
  ];

  const testNGOs = [
    {
      id: "101",
      name: "Helping Hands Foundation",
      description: "Dedicated to providing education and healthcare to underprivileged children in rural areas.",
      mission: "To empower underprivileged children through education and healthcare.",
      address: "123 Gandhi Road, Sector 15",
      city: "Mumbai",
      state: "Maharashtra",
      contactEmail: "contact@helpinghands.org",
      contactPhone: "9876543301",
      website: "https://helpinghands.org",
      category: "Education & Healthcare",
      logo: "https://via.placeholder.com/200x200/4CAF50/white?text=HH",
      bannerImage: "https://via.placeholder.com/800x300/4CAF50/white?text=Helping+Hands",
      status: "verified",
      totalDonations: 2500000,
      donorCount: 850,
      volunteerCount: 120,
      programCount: 15,
      beneficiariesServed: 5000,
      rating: 4.8
    },
    {
      id: "102", 
      name: "Green Earth Initiative",
      description: "Environmental conservation focused on climate change mitigation and renewable energy.",
      mission: "Creating sustainable environment through conservation and renewable energy.",
      address: "456 Tree Lane, Eco Park",
      city: "Bangalore",
      state: "Karnataka", 
      contactEmail: "info@greenearth.org",
      contactPhone: "9876543302",
      website: "https://greenearth.org",
      category: "Environment",
      logo: "https://via.placeholder.com/200x200/4CAF50/white?text=GE",
      bannerImage: "https://via.placeholder.com/800x300/4CAF50/white?text=Green+Earth",
      status: "verified",
      totalDonations: 1800000,
      donorCount: 650,
      volunteerCount: 95,
      programCount: 12,
      beneficiariesServed: 3500,
      rating: 4.6
    },
    {
      id: "103",
      name: "Women Empowerment Trust", 
      description: "Empowering women through skill development and entrepreneurship training.",
      mission: "Economic and social empowerment of women through skill development.",
      address: "789 Empowerment Street",
      city: "Delhi",
      state: "Delhi",
      contactEmail: "contact@womenempowerment.org", 
      contactPhone: "9876543303",
      website: "https://womenempowerment.org",
      category: "Women Empowerment",
      logo: "https://via.placeholder.com/200x200/E91E63/white?text=WE",
      bannerImage: "https://via.placeholder.com/800x300/E91E63/white?text=Women+Empowerment",
      status: "verified",
      totalDonations: 1200000,
      donorCount: 450,
      volunteerCount: 80,
      programCount: 10,
      beneficiariesServed: 3000,
      rating: 4.7
    }
  ];

  // Generate 17 more NGOs
  const categories = [
    "Healthcare", "Education", "Child Welfare", "Elder Care", "Animal Welfare",
    "Disaster Relief", "Skill Development", "Rural Development", "Mental Health",
    "Technology", "Arts & Culture", "Sports", "Food Security", "Water Conservation",
    "Urban Development", "Community Development", "Human Rights"
  ];

  const cities = [
    { city: "Chennai", state: "Tamil Nadu" },
    { city: "Kolkata", state: "West Bengal" },
    { city: "Hyderabad", state: "Telangana" },
    { city: "Pune", state: "Maharashtra" },
    { city: "Ahmedabad", state: "Gujarat" },
    { city: "Jaipur", state: "Rajasthan" },
    { city: "Lucknow", state: "Uttar Pradesh" },
    { city: "Bhopal", state: "Madhya Pradesh" },
    { city: "Patna", state: "Bihar" },
    { city: "Thiruvananthapuram", state: "Kerala" },
    { city: "Guwahati", state: "Assam" },
    { city: "Chandigarh", state: "Punjab" },
    { city: "Raipur", state: "Chhattisgarh" },
    { city: "Gandhinagar", state: "Gujarat" },
    { city: "Panaji", state: "Goa" },
    { city: "Shimla", state: "Himachal Pradesh" },
    { city: "Ranchi", state: "Jharkhand" }
  ];

  for (let i = 4; i <= 20; i++) {
    const category = categories[i - 4];
    const location = cities[i - 4];
    const orgNames = [
      "Foundation", "Trust", "Society", "Organization", "Initiative", 
      "Center", "Association", "Group", "Alliance", "Collective"
    ];
    const orgType = orgNames[Math.floor(Math.random() * orgNames.length)];
    
    testNGOs.push({
      id: (100 + i).toString(),
      name: `${category} ${orgType}`,
      description: `Leading organization working in ${category.toLowerCase()} to create positive social impact.`,
      mission: `Transforming communities through innovative ${category.toLowerCase()} programs.`,
      address: `${Math.floor(Math.random() * 999) + 100} ${category} Street`,
      city: location.city,
      state: location.state,
      contactEmail: `contact@${category.toLowerCase().replace(/\s+/g, '')}${orgType.toLowerCase()}.org`,
      contactPhone: `987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      website: `https://${category.toLowerCase().replace(/\s+/g, '')}${orgType.toLowerCase()}.org`,
      category: category,
      logo: `https://via.placeholder.com/200x200/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=${category.substring(0, 2)}`,
      bannerImage: `https://via.placeholder.com/800x300/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=${category}`,
      status: Math.random() > 0.1 ? "verified" : "under_review",
      totalDonations: Math.floor(Math.random() * 3000000) + 200000,
      donorCount: Math.floor(Math.random() * 800) + 100,
      volunteerCount: Math.floor(Math.random() * 150) + 30,
      programCount: Math.floor(Math.random() * 20) + 5,
      beneficiariesServed: Math.floor(Math.random() * 8000) + 1000,
      rating: (Math.random() * 2 + 3).toFixed(1) // 3.0 to 5.0
    });
  }

  const testPrograms = [];
  testNGOs.forEach((ngo, index) => {
    const programCount = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < programCount; i++) {
      testPrograms.push({
        id: `${index + 1}_${i + 1}`,
        title: `${ngo.category} Program ${i + 1}`,
        description: `Comprehensive ${ngo.category.toLowerCase()} program addressing community needs.`,
        ngoId: ngo.id,
        ngoName: ngo.name,
        category: ngo.category,
        startDate: "2024-01-15",
        endDate: "2024-12-31",
        location: `${ngo.city}, ${ngo.state}`,
        targetBeneficiaries: Math.floor(Math.random() * 500) + 100,
        currentBeneficiaries: Math.floor(Math.random() * 300) + 50,
        goalAmount: Math.floor(Math.random() * 1000000) + 200000,
        collectedAmount: Math.floor(Math.random() * 800000) + 100000,
        status: Math.random() > 0.2 ? "active" : "completed",
        imageUrl: `https://via.placeholder.com/600x400/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Program+${i + 1}`
      });
    }
  });

  const testEvents = [];
  testNGOs.forEach((ngo, index) => {
    const eventCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < eventCount; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 60) + 1);
      
      testEvents.push({
        id: `${index + 1}_${i + 1}`,
        title: `${ngo.category} Awareness Event`,
        description: `Community event focused on ${ngo.category.toLowerCase()} awareness and participation.`,
        ngoId: ngo.id,
        ngoName: ngo.name,
        eventType: Math.random() > 0.5 ? "fundraising" : "awareness",
        category: ngo.category,
        startDate: futureDate.toISOString().split('T')[0],
        location: `${ngo.city}, ${ngo.state}`,
        venue: `${ngo.category} Community Center`,
        maxAttendees: Math.floor(Math.random() * 200) + 50,
        currentAttendees: Math.floor(Math.random() * 100) + 10,
        registrationFee: Math.random() > 0.5 ? Math.floor(Math.random() * 500) + 100 : 0,
        status: "published",
        imageUrl: `https://via.placeholder.com/600x400/${Math.floor(Math.random() * 16777215).toString(16)}/white?text=Event+${i + 1}`
      });
    }
  });

  const testDonations = [];
  for (let i = 0; i < 100; i++) {
    const ngo = testNGOs[Math.floor(Math.random() * testNGOs.length)];
    const donor = testUsers[Math.floor(Math.random() * testUsers.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 180));
    
    testDonations.push({
      id: (i + 1).toString(),
      ngoId: ngo.id,
      ngoName: ngo.name,
      donorId: Math.random() > 0.1 ? donor.id : null,
      donorName: Math.random() > 0.1 ? donor.name : "Anonymous",
      amount: Math.floor(Math.random() * 50000) + 1000,
      currency: "INR",
      isAnonymous: Math.random() > 0.8,
      message: Math.random() > 0.6 ? "Keep up the great work!" : null,
      paymentMethod: ["credit_card", "debit_card", "upi", "net_banking"][Math.floor(Math.random() * 4)],
      status: Math.random() > 0.05 ? "completed" : "pending",
      createdAt: date.toISOString()
    });
  }

  return { testUsers, testNGOs, testPrograms, testEvents, testDonations };
};

const data = generateTestData();

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SevaDaan Test API Server is running!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/ngos - List all NGOs',
      'GET /api/ngos/:id - Get NGO details',
      'GET /api/programs - List all programs',
      'GET /api/events - List all events',
      'GET /api/donations - List all donations',
      'GET /api/users - List all users',
      'GET /api/dashboard - Dashboard statistics',
      'POST /api/auth/login - Login (test credentials)'
    ]
  });
});

// NGOs endpoints
app.get('/api/ngos', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const category = req.query.category || '';
  const status = req.query.status || '';
  
  let filteredNGOs = data.testNGOs;
  
  if (search) {
    filteredNGOs = filteredNGOs.filter(ngo => 
      ngo.name.toLowerCase().includes(search.toLowerCase()) ||
      ngo.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (category) {
    filteredNGOs = filteredNGOs.filter(ngo => ngo.category === category);
  }
  
  if (status) {
    filteredNGOs = filteredNGOs.filter(ngo => ngo.status === status);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedNGOs = filteredNGOs.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedNGOs,
    pagination: {
      page,
      limit,
      total: filteredNGOs.length,
      totalPages: Math.ceil(filteredNGOs.length / limit)
    }
  });
});

app.get('/api/ngos/:id', (req, res) => {
  const ngo = data.testNGOs.find(n => n.id === req.params.id);
  if (!ngo) {
    return res.status(404).json({ success: false, message: 'NGO not found' });
  }
  
  const ngoPrograms = data.testPrograms.filter(p => p.ngoId === ngo.id);
  const ngoEvents = data.testEvents.filter(e => e.ngoId === ngo.id);
  const ngoDonations = data.testDonations.filter(d => d.ngoId === ngo.id);
  
  res.json({
    success: true,
    data: {
      ...ngo,
      programs: ngoPrograms,
      events: ngoEvents,
      donations: ngoDonations.slice(0, 10), // Latest 10 donations
      stats: {
        totalDonations: ngoDonations.reduce((sum, d) => sum + d.amount, 0),
        avgDonation: ngoDonations.length > 0 ? Math.round(ngoDonations.reduce((sum, d) => sum + d.amount, 0) / ngoDonations.length) : 0,
        recentDonorCount: ngoDonations.filter(d => new Date(d.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      }
    }
  });
});

// Programs endpoints
app.get('/api/programs', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const ngoId = req.query.ngoId;
  const category = req.query.category;
  const status = req.query.status;
  
  let filteredPrograms = data.testPrograms;
  
  if (ngoId) {
    filteredPrograms = filteredPrograms.filter(p => p.ngoId === ngoId);
  }
  
  if (category) {
    filteredPrograms = filteredPrograms.filter(p => p.category === category);
  }
  
  if (status) {
    filteredPrograms = filteredPrograms.filter(p => p.status === status);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedPrograms,
    pagination: {
      page,
      limit,
      total: filteredPrograms.length,
      totalPages: Math.ceil(filteredPrograms.length / limit)
    }
  });
});

// Events endpoints
app.get('/api/events', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const ngoId = req.query.ngoId;
  const category = req.query.category;
  const upcoming = req.query.upcoming === 'true';
  
  let filteredEvents = data.testEvents;
  
  if (ngoId) {
    filteredEvents = filteredEvents.filter(e => e.ngoId === ngoId);
  }
  
  if (category) {
    filteredEvents = filteredEvents.filter(e => e.category === category);
  }
  
  if (upcoming) {
    const today = new Date().toISOString().split('T')[0];
    filteredEvents = filteredEvents.filter(e => e.startDate >= today);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedEvents,
    pagination: {
      page,
      limit,
      total: filteredEvents.length,
      totalPages: Math.ceil(filteredEvents.length / limit)
    }
  });
});

// Donations endpoints
app.get('/api/donations', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const ngoId = req.query.ngoId;
  const donorId = req.query.donorId;
  
  let filteredDonations = data.testDonations;
  
  if (ngoId) {
    filteredDonations = filteredDonations.filter(d => d.ngoId === ngoId);
  }
  
  if (donorId) {
    filteredDonations = filteredDonations.filter(d => d.donorId === donorId);
  }
  
  // Sort by date (newest first)
  filteredDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedDonations = filteredDonations.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedDonations,
    pagination: {
      page,
      limit,
      total: filteredDonations.length,
      totalPages: Math.ceil(filteredDonations.length / limit)
    }
  });
});

// Users endpoints
app.get('/api/users', (req, res) => {
  const role = req.query.role;
  let filteredUsers = data.testUsers;
  
  if (role) {
    filteredUsers = filteredUsers.filter(u => u.role === role);
  }
  
  res.json({
    success: true,
    data: filteredUsers
  });
});

// Dashboard endpoint
app.get('/api/dashboard', (req, res) => {
  const totalDonations = data.testDonations.reduce((sum, d) => sum + d.amount, 0);
  const completedDonations = data.testDonations.filter(d => d.status === 'completed');
  const recentDonations = data.testDonations
    .filter(d => new Date(d.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  
  const topNGOs = data.testNGOs
    .sort((a, b) => b.totalDonations - a.totalDonations)
    .slice(0, 5);
  
  const upcomingEvents = data.testEvents
    .filter(e => new Date(e.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);
  
  // Monthly donation trends (last 12 months)
  const monthlyTrends = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthDonations = data.testDonations.filter(d => {
      const donationDate = new Date(d.createdAt);
      return donationDate >= monthStart && donationDate <= monthEnd;
    });
    
    monthlyTrends.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      amount: monthDonations.reduce((sum, d) => sum + d.amount, 0),
      count: monthDonations.length
    });
  }
  
  res.json({
    success: true,
    data: {
      summary: {
        totalNGOs: data.testNGOs.length,
        verifiedNGOs: data.testNGOs.filter(n => n.status === 'verified').length,
        totalPrograms: data.testPrograms.length,
        activePrograms: data.testPrograms.filter(p => p.status === 'active').length,
        totalDonations: totalDonations,
        completedDonations: completedDonations.reduce((sum, d) => sum + d.amount, 0),
        totalVolunteers: data.testUsers.filter(u => u.role === 'volunteer').length,
        totalDonors: data.testUsers.filter(u => u.role === 'donor').length,
        totalBeneficiaries: data.testPrograms.reduce((sum, p) => sum + p.currentBeneficiaries, 0)
      },
      recentDonations,
      topNGOs,
      upcomingEvents,
      monthlyTrends,
      categoryDistribution: [
        { category: "Education", count: data.testNGOs.filter(n => n.category.includes('Education')).length },
        { category: "Healthcare", count: data.testNGOs.filter(n => n.category.includes('Healthcare')).length },
        { category: "Environment", count: data.testNGOs.filter(n => n.category.includes('Environment')).length },
        { category: "Women Empowerment", count: data.testNGOs.filter(n => n.category.includes('Women')).length },
        { category: "Others", count: data.testNGOs.filter(n => !['Education', 'Healthcare', 'Environment', 'Women'].some(cat => n.category.includes(cat))).length }
      ]
    }
  });
});

// Auth endpoints (mock)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Test credentials
  const testCredentials = {
    "admin@sevadaan.com": { password: "password", role: "system_admin" },
    "rajesh.ngo@sevadaan.com": { password: "password", role: "ngo_admin" },
    "priya.volunteer@sevadaan.com": { password: "password", role: "volunteer" },
    "amit.donor@sevadaan.com": { password: "password", role: "donor" },
    "sunita.citizen@sevadaan.com": { password: "password", role: "citizen" }
  };
  
  if (testCredentials[email] && testCredentials[email].password === password) {
    const user = data.testUsers.find(u => u.email === email);
    res.json({
      success: true,
      data: {
        user: user,
        token: 'mock_jwt_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now()
      },
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Categories endpoint
app.get('/api/categories', (req, res) => {
  const categories = [...new Set(data.testNGOs.map(ngo => ngo.category))];
  res.json({
    success: true,
    data: categories
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalNGOs: data.testNGOs.length,
      verifiedNGOs: data.testNGOs.filter(n => n.status === 'verified').length,
      totalPrograms: data.testPrograms.length,
      activePrograms: data.testPrograms.filter(p => p.status === 'active').length,
      totalEvents: data.testEvents.length,
      upcomingEvents: data.testEvents.filter(e => new Date(e.startDate) > new Date()).length,
      totalDonations: data.testDonations.reduce((sum, d) => sum + d.amount, 0),
      totalDonors: data.testDonations.filter(d => d.donorId).length,
      totalVolunteers: data.testUsers.filter(u => u.role === 'volunteer').length,
      totalBeneficiaries: data.testPrograms.reduce((sum, p) => sum + p.currentBeneficiaries, 0)
    }
  });
});

// Start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('🚀 SevaDaan Test API Server running on http://localhost:' + PORT);
    console.log('📊 Test Dashboard: Open test-dashboard.html in your browser');
    console.log('🔌 API Health Check: http://localhost:' + PORT + '/api/health');
    console.log('');
    console.log('📋 Quick Test URLs:');
    console.log('   • All NGOs: http://localhost:' + PORT + '/api/ngos');
    console.log('   • Dashboard Data: http://localhost:' + PORT + '/api/dashboard'); 
    console.log('   • Programs: http://localhost:' + PORT + '/api/programs');
    console.log('   • Events: http://localhost:' + PORT + '/api/events');
    console.log('   • Donations: http://localhost:' + PORT + '/api/donations');
    console.log('');
    console.log('🔑 Test Login Credentials (all passwords: "password"):');
    console.log('   • System Admin: admin@sevadaan.com');
    console.log('   • NGO Admin: rajesh.ngo@sevadaan.com');
    console.log('   • Volunteer: priya.volunteer@sevadaan.com');
    console.log('   • Donor: amit.donor@sevadaan.com');
    console.log('   • Citizen: sunita.citizen@sevadaan.com');
    console.log('');
    console.log('📊 Test Data Summary:');
    console.log('   • 20 NGOs (verified & under review)');
    console.log('   • 30 Users (different roles)');  
    console.log('   • 85+ Programs');
    console.log('   • 50+ Events');
    console.log('   • 100+ Donations');
    console.log('   • Complete profiles with images, descriptions, stats');
    console.log('');
    console.log('✅ Server ready for frontend testing!');
  });
}

module.exports = app;
