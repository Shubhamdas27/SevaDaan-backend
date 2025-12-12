import Testimonial from '../../models/Testimonial';
import Notice from '../../models/Notice';
import EmergencyHelp from '../../models/EmergencyHelp';
import Contact from '../../models/Contact';
import User from '../../models/User';
import NGO from '../../models/NGO';
import Program from '../../models/Program';

export const seedMiscData = async (): Promise<void> => {
  try {
    // Clear existing data
    await Testimonial.deleteMany({});
    await Notice.deleteMany({});
    await EmergencyHelp.deleteMany({});
    await Contact.deleteMany({});

    // Get references
    const users = await User.find({});
    const ngos = await NGO.find({});
    const programs = await Program.find({});

    if (users.length === 0 || ngos.length === 0 || programs.length === 0) {
      throw new Error('Required data not found for misc seeding');
    }    // Seed Testimonials
    const testimonials = [
      {
        name: 'Priya Sharma',
        contactEmail: 'priya.sharma@gmail.com',
        message: 'Help India Foundation changed my life completely. Through their education program, I was able to complete my studies and now I work as a teacher in my village. Forever grateful!',
        rating: 5,
        ngo: ngos[0]._id,
        program: programs[0]._id,
        isApproved: true,
        approvedBy: users[0]._id,
        approvedAt: new Date(),
        designation: 'Teacher',
        location: 'Rajasthan, India',
        isFeatured: true,
        isVisible: true
      },
      {
        name: 'Ravi Kumar',
        contactEmail: 'ravi.kumar@gmail.com',
        message: 'The clean water project by Care Foundation brought pure drinking water to our village for the first time. Our children are healthier now. Thank you so much!',
        rating: 5,
        ngo: ngos[1]._id,
        program: programs[1]._id,
        isApproved: true,
        approvedBy: users[0]._id,
        approvedAt: new Date(),
        designation: 'Village Head',
        location: 'Gujarat, India',
        isFeatured: true,
        isVisible: true
      },
      {
        name: 'Sunita Devi',
        contactEmail: 'sunita.devi@example.com',
        message: 'Thanks to the skill development program, I learned tailoring and now run my own business. I can support my family independently.',
        rating: 5,
        ngo: ngos[2]._id,
        program: programs[2]._id,
        isApproved: true,
        approvedBy: users[0]._id,
        approvedAt: new Date(),
        designation: 'Entrepreneur',
        company: 'Sunita Tailoring Works',
        location: 'Maharashtra, India',
        isFeatured: false,
        isVisible: true
      },
      {
        name: 'Anonymous Beneficiary',
        contactEmail: 'anonymous@example.com',
        message: 'During the floods last year, Help India Foundation provided us with food and shelter when we had nowhere to go. They are true heroes.',
        rating: 5,
        ngo: ngos[0]._id,
        program: programs[4]._id,
        isApproved: false,
        location: 'Bihar, India',
        isFeatured: false,
        isVisible: true
      }
    ];    // Seed Notices
    const notices = [
      {
        title: 'Volunteer Drive 2024 - Join Us!',
        content: 'We are looking for passionate volunteers to join our upcoming education programs in rural areas. No prior experience required - just a willingness to make a difference!',
        type: 'event',
        isHighlighted: true,
        ngoId: ngos[0]._id,
        createdBy: users[1]._id,
        expiryDate: new Date('2024-12-31'),
        attachmentUrls: ['https://via.placeholder.com/600x800/4CAF50/ffffff?text=Volunteer+Guidelines'],
        isActive: true
      },
      {
        title: 'Annual Report 2023 Published',
        content: 'Our Annual Report for 2023 is now available. Learn about our achievements, impact stories, and financial transparency. Thank you to all our supporters!',
        type: 'announcement',
        isHighlighted: false,
        ngoId: ngos[1]._id,
        createdBy: users[2]._id,
        attachmentUrls: ['https://via.placeholder.com/600x800/2196F3/ffffff?text=Annual+Report+2023'],
        isActive: true
      },
      {
        title: 'Emergency Fundraiser - Earthquake Relief',
        content: 'Urgent appeal for earthquake relief efforts in northern India. Every contribution counts in helping affected families rebuild their lives.',
        type: 'urgent',
        isHighlighted: true,
        ngoId: ngos[0]._id,
        createdBy: users[1]._id,
        expiryDate: new Date('2024-09-30'),
        isActive: true
      },
      {
        title: 'New Skill Development Center Opening',
        content: 'We are excited to announce the opening of our new skill development center in Pune. Registration for computer literacy and entrepreneurship courses starts next month.',
        type: 'announcement',
        isHighlighted: false,
        ngoId: ngos[2]._id,
        createdBy: users[2]._id,
        expiryDate: new Date('2024-10-31'),
        isActive: true
      }
    ];    // Seed Emergency Help Requests
    const emergencyRequests = [
      {
        name: 'Rakesh Sharma',
        email: 'rakesh.sharma@example.com',
        phone: '9876543220',
        emergencyType: 'medical',
        description: 'My father needs urgent heart surgery but we cannot afford the medical expenses. Any help would be greatly appreciated.',
        location: {
          state: 'Delhi',
          city: 'New Delhi',
          pincode: '110085',
          address: 'Rohini, New Delhi'
        },
        urgencyLevel: 'high',
        requiredAmount: 500000,
        status: 'pending',
        documents: ['https://via.placeholder.com/600x800/FF5722/ffffff?text=Medical+Report'],
        contactPreference: 'phone'
      },
      {
        name: 'Meera Joshi',
        email: 'meera.joshi@example.com',
        phone: '9876543221',
        emergencyType: 'disaster',
        description: 'Our house was completely destroyed in the recent floods. We need immediate shelter and basic necessities for our family of 5.',
        location: {
          state: 'Kerala',
          city: 'Kochi',
          pincode: '682001',
          address: 'Ernakulam, Kochi'
        },
        urgencyLevel: 'high',
        status: 'in_progress',
        assignedTo: users[0]._id,
        assignedAt: new Date(),
        documents: ['https://via.placeholder.com/600x800/FF5722/ffffff?text=Flood+Damage+Photos'],
        contactPreference: 'email'
      },
      {
        name: 'Suresh Kumar',
        email: 'suresh.kumar@example.com',
        phone: '9876543222',
        emergencyType: 'education',
        description: 'My daughter is a brilliant student but we cannot afford her college fees due to job loss during COVID. Seeking educational assistance.',
        location: {
          state: 'Uttar Pradesh',
          city: 'Lucknow',
          pincode: '226010',
          address: 'Gomti Nagar, Lucknow'
        },
        urgencyLevel: 'medium',
        requiredAmount: 150000,
        status: 'pending',
        contactPreference: 'phone'
      }
    ];

    // Seed Contact Messages
    const contactMessages = [
      {
        name: 'Amit Patel',
        email: 'amit.patel@gmail.com',
        phone: '9876543230',
        subject: 'Partnership Opportunity',
        message: 'We are a corporate foundation interested in partnering with your organization for CSR activities. Could we schedule a meeting to discuss potential collaboration?',
        type: 'partnership',
        priority: 'high',
        status: 'new'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        subject: 'Volunteer Application',
        message: 'I am an international volunteer from Canada and would like to contribute to your education programs. I have experience teaching English to children.',
        type: 'general',
        priority: 'medium',
        status: 'new'
      },
      {
        name: 'Rajesh Gupta',
        email: 'rajesh.gupta@company.com',
        phone: '9876543231',
        subject: 'Website Technical Issue',
        message: 'I was trying to make a donation but the payment gateway is not working properly. Please look into this technical issue.',
        type: 'support',
        priority: 'high',
        status: 'in_progress',
        assignedTo: users[0]._id,
        assignedAt: new Date()
      },
      {
        name: 'Kavita Singh',
        email: 'kavita.singh@email.com',
        subject: 'Feedback on Recent Program',
        message: 'I attended your recent awareness program in Mumbai and wanted to share positive feedback. The content was very informative and well-organized.',
        type: 'feedback',
        priority: 'low',
        status: 'resolved',
        responseMessage: 'Thank you so much for your positive feedback! We are glad you found the program helpful.',
        responseBy: users[1]._id,
        responseAt: new Date()
      }
    ];

    // Insert all data
    await Testimonial.insertMany(testimonials);
    await Notice.insertMany(notices);
    await EmergencyHelp.insertMany(emergencyRequests);
    await Contact.insertMany(contactMessages);

    console.log(`✅ Miscellaneous data seeded successfully`);
    console.log(`   - ${testimonials.length} testimonials`);
    console.log(`   - ${notices.length} notices`);
    console.log(`   - ${emergencyRequests.length} emergency requests`);
    console.log(`   - ${contactMessages.length} contact messages`);

    return;
  } catch (error) {
    console.error('❌ Error seeding miscellaneous data:', error);
    throw error;
  }
};
