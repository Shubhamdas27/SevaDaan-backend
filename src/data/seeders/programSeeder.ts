import Program from '../../models/Program';
import NGO from '../../models/NGO';

export const seedPrograms = async (): Promise<void> => {
  try {
    // Clear existing programs
    await Program.deleteMany({});

    // Get NGOs
    const helpIndia = await NGO.findOne({ name: 'Help India Foundation' });
    const careFoundation = await NGO.findOne({ name: 'Care Foundation' });
    const smileWelfare = await NGO.findOne({ name: 'Smile Welfare Society' });

    if (!helpIndia || !careFoundation || !smileWelfare) {
      throw new Error('NGOs not found for program seeding');
    }    const programs = [
      {
        title: 'Rural Education Initiative',
        shortDescription: 'Providing quality education to rural children through school infrastructure and teacher training.',        description: 'Establishing schools and libraries in remote villages to provide quality education to underprivileged children. The program includes teacher training, infrastructure development, and scholarship programs.',
        category: 'education',
        programType: 'regular',
        ngo: helpIndia._id,
        createdBy: helpIndia.adminId,
        targetAmount: 500000,        raisedAmount: 325000,
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-12-31'),
        status: 'active',
        location: {
          state: 'Rajasthan',
          city: 'Jodhpur',
          pincode: '342001',
          address: 'Various villages in Jodhpur district'
        },
        images: [
          'https://via.placeholder.com/800x400/4CAF50/ffffff?text=Rural+School',
          'https://via.placeholder.com/800x400/4CAF50/ffffff?text=Children+Learning'
        ],
        documents: [
          'https://via.placeholder.com/600x800/ffffff/000000?text=Project+Proposal',
          'https://via.placeholder.com/600x800/ffffff/000000?text=Budget+Plan'
        ],        beneficiariesCount: 500,
        featured: true,
        volunteersNeeded: 20,
        volunteersRegistered: 12,
        participantsRegistered: 25,
        maxParticipants: 50,
        registrationDeadline: new Date('2025-01-10'),
        sdgGoals: [4, 10, 11], // Quality Education, Reduced Inequalities, Sustainable Cities
        impact: {
          description: 'Transforming rural education by providing infrastructure and quality teaching',
          metrics: [
            { name: 'Schools Built', value: 3, unit: 'schools' },
            { name: 'Children Enrolled', value: 450, unit: 'students' },
            { name: 'Teachers Trained', value: 15, unit: 'teachers' },
            { name: 'Books Distributed', value: 2000, unit: 'books' }
          ]
        },
        updates: [
          {
            title: 'First School Completed',
            description: 'Successfully completed construction of first school in Village Khimsar',
            date: new Date('2024-03-15'),
            images: ['https://via.placeholder.com/600x400/4CAF50/ffffff?text=School+Complete']
          },
          {
            title: 'Teacher Training Program',
            description: 'Conducted intensive teacher training program for 15 local teachers',
            date: new Date('2024-04-20'),
            images: ['https://via.placeholder.com/600x400/4CAF50/ffffff?text=Teacher+Training']
          }
        ],
        requirements: [
          'Building materials',
          'Educational equipment',
          'Teacher salaries',
          'Student scholarships'
        ],
        tags: ['education', 'rural', 'children', 'infrastructure']
      },      {
        title: 'Clean Water for All',
        shortDescription: 'Installing water purification systems and building wells in drought-affected areas.',
        description: 'Installing water purification systems and building wells in drought-affected areas. The program aims to provide clean drinking water to 10,000 people.',
        category: 'water-sanitation',
        ngo: careFoundation._id,
        createdBy: careFoundation.adminId,
        targetAmount: 750000,
        raisedAmount: 450000,        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-12-31'),
        status: 'active',
        location: {
          state: 'Gujarat',
          city: 'Kutch',
          pincode: '370001',
          address: 'Drought-affected villages in Kutch district'
        },
        images: [
          'https://via.placeholder.com/800x400/2196F3/ffffff?text=Water+Well',
          'https://via.placeholder.com/800x400/2196F3/ffffff?text=Water+Purification'
        ],
        documents: [
          'https://via.placeholder.com/600x800/ffffff/000000?text=Technical+Report',
          'https://via.placeholder.com/600x800/ffffff/000000?text=Environmental+Impact'
        ],
        beneficiariesCount: 10000,
        featured: true,
        volunteersNeeded: 30,
        volunteersRegistered: 22,
        sdgGoals: [3, 6, 11], // Good Health, Clean Water, Sustainable Cities
        impact: {
          description: 'Providing access to clean water and improving health outcomes in drought-affected areas',
          metrics: [
            { name: 'Wells Built', value: 8, unit: 'wells' },
            { name: 'Purification Systems', value: 5, unit: 'systems' },
            { name: 'People Served', value: 6500, unit: 'people' },
            { name: 'Water Quality Tests', value: 50, unit: 'tests' }
          ]
        },
        updates: [
          {
            title: 'First Phase Completion',
            description: 'Successfully completed installation of 5 water wells',
            date: new Date('2024-05-10'),
            images: ['https://via.placeholder.com/600x400/2196F3/ffffff?text=Wells+Complete']
          }
        ],
        requirements: [
          'Drilling equipment',
          'Water purification systems',
          'Maintenance supplies',
          'Transportation'
        ],
        tags: ['water', 'health', 'rural', 'infrastructure']
      },      {
        title: 'Women Skill Development',
        shortDescription: 'Empowering women through skill development programs including tailoring and entrepreneurship.',
        description: 'Empowering women through skill development programs including tailoring, computer literacy, and entrepreneurship training.',
        category: 'women-empowerment',
        ngo: smileWelfare._id,
        createdBy: smileWelfare.adminId,
        targetAmount: 300000,
        raisedAmount: 125000,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-11-30'),
        status: 'active',
        location: {
          state: 'Maharashtra',
          city: 'Pune',
          pincode: '411001',
          address: 'Skill Development Center, Pune'
        },
        images: [
          'https://via.placeholder.com/800x400/FF5722/ffffff?text=Skill+Training',
          'https://via.placeholder.com/800x400/FF5722/ffffff?text=Women+Empowerment'
        ],
        documents: [
          'https://via.placeholder.com/600x800/ffffff/000000?text=Curriculum+Plan',
          'https://via.placeholder.com/600x800/ffffff/000000?text=Certification+Details'
        ],
        beneficiariesCount: 200,
        featured: false,
        volunteersNeeded: 15,
        volunteersRegistered: 8,
        sdgGoals: [5, 8, 10], // Gender Equality, Decent Work, Reduced Inequalities
        impact: {
          description: 'Empowering women through skill development and creating economic opportunities',
          metrics: [
            { name: 'Women Trained', value: 85, unit: 'women' },
            { name: 'Skills Certified', value: 3, unit: 'skills' },
            { name: 'Job Placements', value: 25, unit: 'jobs' },
            { name: 'Businesses Started', value: 8, unit: 'businesses' }
          ]
        },
        updates: [
          {
            title: 'First Batch Graduation',
            description: '30 women completed tailoring certification program',
            date: new Date('2024-05-25'),
            images: ['https://via.placeholder.com/600x400/FF5722/ffffff?text=Graduation+Day']
          }
        ],
        requirements: [
          'Sewing machines',
          'Computer equipment',
          'Training materials',
          'Instructor fees'
        ],
        tags: ['women', 'skills', 'empowerment', 'training']
      },      {
        title: 'Tree Plantation Drive 2024',
        shortDescription: 'Large-scale tree plantation initiative to combat climate change and restore green cover.',
        description: 'Large-scale tree plantation initiative to combat climate change and restore green cover in urban and rural areas.',
        category: 'environment',
        ngo: careFoundation._id,
        createdBy: careFoundation.adminId,
        targetAmount: 200000,
        raisedAmount: 180000,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-09-30'),
        status: 'active',
        location: {
          state: 'Maharashtra',
          city: 'Mumbai',
          pincode: '400001',
          address: 'Various locations in Mumbai and surrounding areas'
        },
        images: [
          'https://via.placeholder.com/800x400/4CAF50/ffffff?text=Tree+Planting',
          'https://via.placeholder.com/800x400/4CAF50/ffffff?text=Green+Mumbai'
        ],
        documents: [
          'https://via.placeholder.com/600x800/ffffff/000000?text=Plantation+Plan',
          'https://via.placeholder.com/600x800/ffffff/000000?text=Species+Selection'
        ],
        beneficiariesCount: 100000,
        featured: true,
        volunteersNeeded: 100,
        volunteersRegistered: 85,
        sdgGoals: [13, 15, 11], // Climate Action, Life on Land, Sustainable Cities
        impact: {
          description: 'Contributing to climate change mitigation and urban green cover restoration',
          metrics: [
            { name: 'Trees Planted', value: 15000, unit: 'trees' },
            { name: 'Areas Restored', value: 25, unit: 'hectares' },
            { name: 'Volunteers Participated', value: 500, unit: 'volunteers' },
            { name: 'Carbon Offset', value: 150, unit: 'tons CO2' }
          ]
        },
        updates: [
          {
            title: 'Monsoon Plantation',
            description: 'Successfully planted 10,000 trees during monsoon season',
            date: new Date('2024-07-15'),
            images: ['https://via.placeholder.com/600x400/4CAF50/ffffff?text=Monsoon+Planting']
          }
        ],
        requirements: [
          'Saplings',
          'Gardening tools',
          'Transportation',
          'Maintenance supplies'
        ],
        tags: ['environment', 'trees', 'climate', 'urban']
      },      {
        title: 'Emergency Food Relief',
        shortDescription: 'Providing emergency food assistance to families affected by natural disasters.',
        description: 'Providing emergency food assistance to families affected by natural disasters and economic hardships.',
        category: 'disaster-relief',
        ngo: helpIndia._id,        createdBy: helpIndia.adminId,
        targetAmount: 400000,
        raisedAmount: 350000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        status: 'active',
        location: {
          state: 'Multiple States',
          city: 'Various Cities',
          pincode: '000000',
          address: 'Disaster-affected areas across India'
        },
        images: [
          'https://via.placeholder.com/800x400/FF9800/ffffff?text=Food+Distribution',
          'https://via.placeholder.com/800x400/FF9800/ffffff?text=Relief+Camp'
        ],
        documents: [
          'https://via.placeholder.com/600x800/ffffff/000000?text=Relief+Strategy',
          'https://via.placeholder.com/600x800/ffffff/000000?text=Distribution+Plan'
        ],
        beneficiariesCount: 5000,
        featured: false,
        volunteersNeeded: 50,
        volunteersRegistered: 35,
        sdgGoals: [1, 2, 11], // No Poverty, Zero Hunger, Sustainable Cities
        impact: {
          description: 'Providing immediate food relief to disaster-affected families and communities',
          metrics: [
            { name: 'Families Helped', value: 1200, unit: 'families' },
            { name: 'Meals Distributed', value: 25000, unit: 'meals' },
            { name: 'Relief Camps Setup', value: 8, unit: 'camps' },
            { name: 'Emergency Kits', value: 800, unit: 'kits' }
          ]
        },
        updates: [
          {
            title: 'Flood Relief Operations',
            description: 'Provided emergency food to 500 families affected by floods',
            date: new Date('2024-06-20'),
            images: ['https://via.placeholder.com/600x400/FF9800/ffffff?text=Flood+Relief']
          }
        ],
        requirements: [
          'Food supplies',
          'Emergency kits',
          'Transportation',
          'Storage facilities'        ],
        tags: ['disaster', 'emergency', 'food', 'relief']
      },
      
      // EVENT TYPE PROGRAMS
      {
        title: 'Digital Literacy Workshop',
        shortDescription: 'Interactive workshop teaching digital skills to senior citizens and rural communities.',
        description: 'A comprehensive workshop series designed to bridge the digital divide by teaching essential computer and internet skills to senior citizens and rural community members.',
        category: 'education',
        programType: 'workshop',
        ngo: helpIndia._id,
        createdBy: helpIndia.adminId,
        targetAmount: 50000,
        raisedAmount: 35000,
        startDate: new Date('2025-07-15'),
        endDate: new Date('2025-07-17'),
        registrationDeadline: new Date('2025-07-10'),
        status: 'active',
        location: {
          state: 'Delhi',
          city: 'New Delhi',
          pincode: '110001',
          address: 'Community Center, Connaught Place'
        },
        images: ['https://via.placeholder.com/800x400/9C27B0/ffffff?text=Digital+Workshop'],
        documents: [],
        beneficiariesCount: 50,
        featured: false,
        volunteersNeeded: 5,
        volunteersRegistered: 4,
        participantsRegistered: 35,
        maxParticipants: 50,
        sdgGoals: [4, 9], // Quality Education, Industry Innovation
        impact: {
          description: 'Empowering communities through digital literacy',
          metrics: [
            { name: 'People Trained', value: 50, unit: 'individuals' },
            { name: 'Skills Learned', value: 8, unit: 'skills' }
          ]
        },
        updates: [],
        requirements: ['Laptops', 'Internet connection', 'Trainers', 'Certificates'],
        tags: ['education', 'digital', 'workshop', 'seniors']
      },
      
      {
        title: 'Health Awareness Campaign',
        shortDescription: 'Community event promoting health awareness and free medical checkups.',
        description: 'A day-long health awareness event featuring free medical checkups, health education sessions, and distribution of health kits to underprivileged communities.',
        category: 'healthcare',
        programType: 'event',
        ngo: careFoundation._id,
        createdBy: careFoundation.adminId,
        targetAmount: 75000,
        raisedAmount: 60000,        startDate: new Date('2025-08-05'),
        endDate: new Date('2025-08-25'),
        registrationDeadline: new Date('2025-08-01'),
        status: 'active',
        location: {
          state: 'Maharashtra',
          city: 'Mumbai',
          pincode: '400001',
          address: 'Municipal School Ground, Dharavi'
        },
        images: ['https://via.placeholder.com/800x400/2196F3/ffffff?text=Health+Camp'],
        documents: [],
        beneficiariesCount: 200,
        featured: true,
        volunteersNeeded: 15,
        volunteersRegistered: 12,
        participantsRegistered: 150,
        maxParticipants: 200,
        sdgGoals: [3, 10], // Good Health, Reduced Inequalities
        impact: {
          description: 'Providing accessible healthcare to underserved communities',
          metrics: [
            { name: 'People Screened', value: 200, unit: 'individuals' },
            { name: 'Health Kits Distributed', value: 200, unit: 'kits' }
          ]
        },
        updates: [],
        requirements: ['Medical equipment', 'Health kits', 'Volunteers', 'Venue'],
        tags: ['healthcare', 'event', 'community', 'awareness']
      },
      
      {
        title: 'Environmental Conservation Training',
        shortDescription: 'Training program on sustainable practices and environmental conservation.',
        description: 'A comprehensive training program focused on teaching sustainable environmental practices, waste management, and conservation techniques to community leaders and volunteers.',
        category: 'environment',
        programType: 'training',
        ngo: smileWelfare._id,
        createdBy: smileWelfare.adminId,
        targetAmount: 40000,
        raisedAmount: 30000,
        startDate: new Date('2025-09-10'),
        endDate: new Date('2025-09-12'),
        registrationDeadline: new Date('2025-09-05'),
        status: 'active',
        location: {
          state: 'Karnataka',
          city: 'Bangalore',
          pincode: '560001',
          address: 'Environmental Training Center, Cubbon Park'
        },
        images: ['https://via.placeholder.com/800x400/4CAF50/ffffff?text=Eco+Training'],
        documents: [],
        beneficiariesCount: 30,
        featured: false,
        volunteersNeeded: 8,
        volunteersRegistered: 6,
        participantsRegistered: 25,
        maxParticipants: 30,
        sdgGoals: [13, 14, 15], // Climate Action, Life Below Water, Life on Land
        impact: {
          description: 'Building environmental leaders in communities',
          metrics: [
            { name: 'Leaders Trained', value: 30, unit: 'leaders' },
            { name: 'Techniques Learned', value: 12, unit: 'techniques' }
          ]
        },
        updates: [],
        requirements: ['Training materials', 'Certificates', 'Equipment demos', 'Field trip'],
        tags: ['environment', 'training', 'sustainability', 'conservation']
      }
    ];

    const createdPrograms = await Program.insertMany(programs);
    console.log(`✅ ${createdPrograms.length} programs seeded successfully`);

    return;
  } catch (error) {
    console.error('❌ Error seeding programs:', error);
    throw error;
  }
};
