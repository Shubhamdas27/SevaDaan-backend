import Volunteer from '../../models/Volunteer';
import User from '../../models/User';
import Program from '../../models/Program';
import NGO from '../../models/NGO';

export const seedVolunteers = async (): Promise<void> => {
  try {
    // Clear existing volunteers
    await Volunteer.deleteMany({});

    // Get references
    const users = await User.find({ role: { $in: ['volunteer', 'citizen'] } });
    const programs = await Program.find({});
    const ngos = await NGO.find({});

    if (users.length === 0 || programs.length === 0 || ngos.length === 0) {
      throw new Error('Required data not found for volunteer seeding');
    }    const volunteers = [
      {
        user: users[0]._id, // Ravi Kumar (volunteer)
        program: programs[0]._id, // Rural Education Initiative
        ngo: ngos[0]._id, // Help India Foundation
        applicationDate: new Date('2024-02-15'),
        status: 'approved',
        skills: ['Teaching', 'Child Psychology', 'Community Engagement'],
        experience: 'Worked as a volunteer teacher for 2 years with local NGOs. Have experience in rural education and child development.',
        motivation: 'I believe every child deserves quality education. Growing up in a rural area, I understand the challenges and want to make a difference.',
        availability: {
          daysPerWeek: 4,
          hoursPerDay: 6,
          preferredTime: 'morning',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-12-31')
        },
        preferences: {
          workLocation: 'onsite',
          travelWillingness: true,
          languagesSpoken: ['Hindi', 'English', 'Rajasthani'],
          specialRequirements: 'Need accommodation if working in remote villages'
        },
        background: {
          education: 'Bachelor of Education (B.Ed)',
          occupation: 'Primary School Teacher',
          previousVolunteerExperience: 'Volunteered with Teach for India for 2 years',
          references: [
            {
              name: 'Dr. Meera Joshi',
              contact: '9876543220',
              relationship: 'Former Supervisor at Teach for India'
            }
          ]
        },
        documents: {
          resume: 'https://via.placeholder.com/600x800/ffffff/000000?text=Ravi+Kumar+Resume',
          identityProof: 'https://via.placeholder.com/600x800/ffffff/000000?text=Aadhaar+Card',
          backgroundCheck: 'https://via.placeholder.com/600x800/ffffff/000000?text=Police+Verification'
        },
        approval: {
          approvedBy: ngos[0].adminId,
          approvedAt: new Date('2024-02-20'),
          notes: 'Excellent background in education. Perfect fit for our rural education program.'
        },
        participation: {
          hoursContributed: 180,
          tasksCompleted: 12,
          performanceRating: 4.8,
          feedbackScore: 4.9
        }
      },
      {
        user: users.length > 1 ? users[1]._id : users[0]._id, // Second volunteer user
        program: programs.length > 1 ? programs[1]._id : programs[0]._id, // Clean Water for All
        ngo: ngos.length > 1 ? ngos[1]._id : ngos[0]._id, // Care Foundation
        applicationDate: new Date('2024-03-10'),
        status: 'approved',
        skills: ['Environmental Science', 'Community Mobilization', 'Water Quality Testing'],
        experience: 'Environmental engineer with 5 years experience in water management projects. Previously worked on community water initiatives.',
        motivation: 'Clean water is a basic human right. I want to use my technical skills to help communities access safe drinking water.',
        availability: {
          daysPerWeek: 3,
          hoursPerDay: 8,
          preferredTime: 'flexible',
          startDate: new Date('2024-04-01'),
          endDate: new Date('2025-01-31')
        },
        preferences: {
          workLocation: 'onsite',
          travelWillingness: true,
          languagesSpoken: ['Hindi', 'English', 'Gujarati'],
          specialRequirements: 'Access to water testing equipment'
        },
        background: {
          education: 'M.Tech in Environmental Engineering',
          occupation: 'Environmental Engineer',
          previousVolunteerExperience: 'Worked with WaterAid India on community water projects',
          references: [
            {
              name: 'Prof. Ankit Sharma',
              contact: '9876543221',
              relationship: 'Former College Professor'
            }
          ]
        },
        documents: {
          resume: 'https://via.placeholder.com/600x800/ffffff/000000?text=Engineer+Resume',
          identityProof: 'https://via.placeholder.com/600x800/ffffff/000000?text=PAN+Card',
          backgroundCheck: 'https://via.placeholder.com/600x800/ffffff/000000?text=Police+Verification'
        },
        approval: {
          approvedBy: ngos.length > 1 ? ngos[1].adminId : ngos[0].adminId,
          approvedAt: new Date('2024-03-15'),
          notes: 'Highly qualified engineer with relevant experience. Great addition to our water project.'
        },
        participation: {
          hoursContributed: 120,
          tasksCompleted: 8,
          performanceRating: 4.7,
          feedbackScore: 4.8
        }
      },
      {
        user: users.length > 2 ? users[2]._id : users[0]._id, // Third volunteer user
        program: programs.length > 2 ? programs[2]._id : programs[0]._id, // Skills Development Program
        ngo: ngos.length > 2 ? ngos[2]._id : ngos[0]._id, // Smile Welfare Society
        applicationDate: new Date('2024-01-20'),
        status: 'pending',
        skills: ['Tailoring', 'Fashion Design', 'Business Development'],
        experience: 'Fashion designer with 8 years experience. Run my own boutique and want to teach skills to women.',
        motivation: 'Empowering women through skill development is close to my heart. I want to help women become financially independent.',
        availability: {
          daysPerWeek: 2,
          hoursPerDay: 4,
          preferredTime: 'afternoon',
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-12-31')
        },
        preferences: {
          workLocation: 'hybrid',
          travelWillingness: false,
          languagesSpoken: ['Hindi', 'English', 'Marathi'],
          specialRequirements: 'Need sewing machines and materials'
        },
        background: {
          education: 'Diploma in Fashion Design',
          occupation: 'Fashion Designer & Boutique Owner',
          previousVolunteerExperience: 'Taught tailoring to rural women through local self-help groups',
          references: [
            {
              name: 'Mrs. Kavita Desai',
              contact: '9876543222',
              relationship: 'SHG Coordinator'
            }
          ]
        },
        documents: {
          resume: 'https://via.placeholder.com/600x800/ffffff/000000?text=Designer+Resume',
          identityProof: 'https://via.placeholder.com/600x800/ffffff/000000?text=Driving+License'
        },
        approval: {
          notes: 'Application under review. Waiting for reference verification.'
        },
        participation: {
          hoursContributed: 0,
          tasksCompleted: 0,
          performanceRating: 0,
          feedbackScore: 0
        }
      }
    ];

    const createdVolunteers = await Volunteer.insertMany(volunteers);
    console.log(`✅ ${createdVolunteers.length} volunteers seeded successfully`);

    return;
  } catch (error) {
    console.error('❌ Error seeding volunteers:', error);
    throw error;
  }
};
