import Donation from '../../models/Donation';
import User from '../../models/User';
import Program from '../../models/Program';
import NGO from '../../models/NGO';

export const seedDonations = async (): Promise<void> => {
  try {
    // Clear existing donations
    await Donation.deleteMany({});    // Get users and programs
    const donor1 = await User.findOne({ email: 'donor@example.com' });
    const donor2 = await User.findOne({ role: 'donor', email: { $ne: 'donor@example.com' } });
    const donor3 = await User.findOne({ role: 'citizen' });
    
    const program1 = await Program.findOne({});
    const program2 = await Program.findOne({}).skip(1);
    const program3 = await Program.findOne({}).skip(2);
    
    const ngo1 = await NGO.findOne({});
    const ngo2 = await NGO.findOne({}).skip(1);    if (!donor1 || !program1 || !ngo1) {
      throw new Error('Required entities not found for donation seeding');
    }

    const donations = [
      {
        donor: donor1._id,
        ngo: ngo1._id,
        program: program1._id,
        amount: 10000,
        currency: 'INR',
        donorName: donor1.name,
        donorEmail: donor1.email,
        donorPhone: donor1.phone,
        paymentMethod: 'razorpay',
        paymentStatus: 'completed',
        razorpayOrderId: 'order_test_001',
        razorpayPaymentId: 'pay_test_001',
        receiptNumber: 'RCP-2024-000001',
        isAnonymous: false,
        message: 'Happy to support this important cause. Keep up the great work!',
        taxBenefit: {
          eligible: true,
          section: '80G',
          percentage: 50,
          certificateGenerated: true
        },
        metadata: {
          source: 'web',
          campaign: 'general_donation',
          referrer: 'direct'
        },        notes: 'Regular donor, very supportive of social initiatives'
      }
    ];

    // Add one more donation if we have a second program and ngo
    if (program2 && ngo2) {
      donations.push({
        donor: donor1._id,
        ngo: ngo2._id,
        program: program2._id,
        amount: 15000,
        currency: 'INR',
        donorName: donor1.name,
        donorEmail: donor1.email,
        donorPhone: donor1.phone,
        paymentMethod: 'razorpay',
        paymentStatus: 'completed',
        razorpayOrderId: 'order_test_002',
        razorpayPaymentId: 'pay_test_002',
        receiptNumber: 'RCP-2024-000002',
        isAnonymous: false,
        message: 'Supporting another great cause!',
        taxBenefit: {
          eligible: true,
          section: '80G',
          percentage: 50,
          certificateGenerated: true        },
        metadata: {
          source: 'web',
          campaign: 'general_donation',
          referrer: 'direct'
        },
        notes: 'Regular donor, very supportive of social initiatives'
      });
    }

    // Add an anonymous donation
    if (ngo1 && program1) {
      donations.push({
        donor: donor1._id, // Use actual donor instead of null
        ngo: ngo1._id,
        program: program1._id,
        amount: 3000,
        currency: 'INR',        donorName: 'Anonymous Donor',
        donorEmail: 'anonymous@example.com',
        donorPhone: donor1.phone,
        paymentMethod: 'razorpay',
        paymentStatus: 'completed',
        razorpayOrderId: 'order_test_003',
        razorpayPaymentId: 'pay_test_003',
        receiptNumber: 'RCP-2024-000003',
        isAnonymous: true,
        message: 'Anonymous donation for this cause.',
        taxBenefit: {
          eligible: false,
          section: '80G',
          percentage: 0,
          certificateGenerated: false        },
        metadata: {
          source: 'web',          campaign: 'anonymous_support',
          referrer: 'direct'
        },
        notes: 'Anonymous donation for supporting the cause'
      });
    }

    const createdDonations = await Donation.insertMany(donations);
    console.log(`✅ ${createdDonations.length} donations seeded successfully`);

    return;
  } catch (error) {
    console.error('❌ Error seeding donations:', error);
    throw error;
  }
};
