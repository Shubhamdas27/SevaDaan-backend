import { faker } from '@faker-js/faker';
import Referral from '../../models/Referral';
import Certificate from '../../models/Certificate';
import ProgramRegistration from '../../models/ProgramRegistration';
import Invoice from '../../models/Invoice';
import User from '../../models/User';
import NGO from '../../models/NGO';
import Program from '../../models/Program';
import Donation from '../../models/Donation';

export const seedReferrals = async (): Promise<void> => {
  try {
    console.log('📞 Seeding referrals...');
    
    // Clear existing referrals
    await Referral.deleteMany({});
    
    // Get existing data
    const citizens = await User.find({ role: 'citizen' });
    const ngos = await NGO.find({});
    const managers = await User.find({ role: 'ngo_manager' });
    
    if (citizens.length === 0 || ngos.length === 0 || managers.length === 0) {
      console.log('⚠️  Insufficient data found. Skipping referral seeding.');
      return;
    }

    const referrals: any[] = [];
    const serviceTypes = ['healthcare', 'education', 'emergency_aid', 'legal_assistance', 'counseling', 'financial_support'];
    const statuses = ['pending', 'accepted', 'in_progress', 'completed', 'rejected'];
    
    // Create 10 referrals
    for (let i = 0; i < 10; i++) {
      const citizen = faker.helpers.arrayElement(citizens);
      const fromNGO = faker.helpers.arrayElement(ngos);
      const toNGO = faker.helpers.arrayElement(ngos.filter(ngo => ngo._id !== fromNGO._id));
      const referredBy = faker.helpers.arrayElement(managers);
      const serviceType = faker.helpers.arrayElement(serviceTypes);
      const status = faker.helpers.arrayElement(statuses);
      
      const referral = {
        fromNGO: fromNGO._id,
        toNGO: toNGO ? toNGO._id : fromNGO._id,
        citizenId: citizen._id,
        referredBy: referredBy._id,
        serviceType,
        reason: `Citizen needs ${serviceType.replace('_', ' ')} services that are better provided by the referred NGO.`,
        referralNotes: `Referring ${citizen.name} for ${serviceType.replace('_', ' ')} services. ${faker.lorem.sentence()}`,
        urgencyLevel: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
        status,
        priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
        followUpRequired: faker.datatype.boolean(),
        expectedOutcome: faker.lorem.sentence(),
        additionalInfo: faker.lorem.paragraph(),
        ...(status !== 'pending' && {
          followUpDate: faker.date.future(),
          followUpNotes: faker.lorem.sentence()
        })
      };
      
      referrals.push(referral);
    }
    
    await Referral.insertMany(referrals);
    console.log(`✅ Created ${referrals.length} referrals`);
    
  } catch (error) {
    console.error('❌ Error seeding referrals:', error);
    throw error;
  }
};

export const seedCertificates = async (): Promise<void> => {
  try {
    console.log('🏆 Seeding certificates...');
    
    // Clear existing certificates
    await Certificate.deleteMany({});
    
    // Get existing data
    const users = await User.find({});
    const ngos = await NGO.find({});
    const programs = await Program.find({});
    const donations = await Donation.find({});
    
    if (users.length === 0 || ngos.length === 0) {
      console.log('⚠️  No users or NGOs found. Skipping certificate seeding.');
      return;
    }
      const certificates: any[] = [];
    const certificateTypes = ['volunteer', 'donor', 'participant', 'completion', 'appreciation', 'achievement'];
    const relatedTypes = ['program', 'donation', 'volunteer_work', 'general'];
    
    // Create 30 certificates
    for (let i = 0; i < 30; i++) {
      const recipient = faker.helpers.arrayElement(users);
      const issuedBy = faker.helpers.arrayElement(ngos);
      const certificateType = faker.helpers.arrayElement(certificateTypes);
      const relatedType = faker.helpers.arrayElement(relatedTypes);
      
      let relatedReference;
      if (relatedType === 'program' && programs.length > 0) {
        relatedReference = faker.helpers.arrayElement(programs)._id;
      } else if (relatedType === 'donation' && donations.length > 0) {
        relatedReference = faker.helpers.arrayElement(donations)._id;
      } else {
        relatedReference = recipient._id;
      }
      
      const certificate = {
        certificateId: `CERT-${faker.string.alphanumeric(8).toUpperCase()}`,
        recipient: recipient._id,
        issuedBy: issuedBy._id,
        certificateType,
        title: `Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`,
        description: faker.lorem.paragraph(),
        relatedTo: {
          type: relatedType,
          reference: relatedReference
        },
        achievements: {
          ...(certificateType === 'volunteer' && {
            hoursCompleted: faker.number.int({ min: 10, max: 200 }),
            sessionsAttended: faker.number.int({ min: 5, max: 50 })
          }),
          ...(certificateType === 'donor' && {
            amountDonated: faker.number.int({ min: 1000, max: 100000 })
          }),
          impactMetrics: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
            name: faker.helpers.arrayElement(['Lives Impacted', 'Hours Contributed', 'Funds Raised', 'Communities Served']),
            value: faker.number.int({ min: 1, max: 1000 }),
            unit: faker.helpers.arrayElement(['people', 'hours', 'rupees', 'communities'])
          }))
        },
        validFrom: faker.date.past(),
        status: 'active',
        verificationCode: faker.string.alphanumeric(12).toUpperCase(),
        metadata: {
          issuerDetails: {
            name: faker.person.fullName(),
            position: 'Director',
            organization: issuedBy.name
          },
          recipientDetails: {
            name: recipient.name,
            email: recipient.email,
            phone: recipient.phone
          }
        },
        downloadCount: faker.number.int({ min: 0, max: 20 }),
        sharedCount: faker.number.int({ min: 0, max: 10 }),
        verifiedCount: faker.number.int({ min: 0, max: 5 })
      };
      
      certificates.push(certificate);
    }
    
    await Certificate.insertMany(certificates);
    console.log(`✅ Created ${certificates.length} certificates`);
    
  } catch (error) {
    console.error('❌ Error seeding certificates:', error);
    throw error;
  }
};

export const seedProgramRegistrations = async (): Promise<void> => {
  try {
    console.log('📝 Seeding program registrations...');
    
    // Clear existing registrations
    await ProgramRegistration.deleteMany({});
    
    // Get existing data
    const users = await User.find({ role: { $in: ['citizen', 'volunteer', 'donor'] } });
    const programs = await Program.find({});
    
    if (users.length === 0 || programs.length === 0) {
      console.log('⚠️  No users or programs found. Skipping registration seeding.');
      return;
    }
      const registrations: any[] = [];
    const registrationTypes = ['volunteer', 'beneficiary', 'participant'];
    const statuses = ['pending', 'approved', 'rejected', 'completed'];
    const skills = ['Teaching', 'Nursing', 'Counseling', 'Event Management', 'Social Work', 'Computer Skills', 'Fundraising'];
    const availability = {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      timeSlots: ['morning', 'afternoon', 'evening', 'flexible']
    };
    
    // Create registrations for each program
    for (const program of programs) {
      const numRegistrations = faker.number.int({ min: 3, max: 8 });
      
      for (let i = 0; i < numRegistrations; i++) {
        const user = faker.helpers.arrayElement(users);
        const registrationType = faker.helpers.arrayElement(registrationTypes);
        const status = faker.helpers.arrayElement(statuses);
        
        const registration = {
          program: program._id,
          user: user._id,
          registrationType,
          status,
          applicationData: {
            motivation: faker.lorem.paragraph(),
            skills: faker.helpers.arrayElements(skills, { min: 1, max: 3 }),
            availability: {
              days: faker.helpers.arrayElements(availability.days, { min: 2, max: 5 }),
              timeSlots: faker.helpers.arrayElements(availability.timeSlots, { min: 1, max: 2 })
            },
            experience: faker.lorem.sentences(2),
            specialRequirements: faker.lorem.sentence()
          },
          ...(status === 'approved' && {
            approvedBy: user._id,
            approvedAt: faker.date.past()
          }),
          ...(status === 'completed' && {
            completedAt: faker.date.recent(),
            feedback: {
              rating: faker.number.int({ min: 3, max: 5 }),
              comment: faker.lorem.sentence(),
              submittedAt: faker.date.recent()
            },
            attendanceRecord: {
              sessionsAttended: faker.number.int({ min: 5, max: 20 }),
              totalSessions: faker.number.int({ min: 10, max: 25 }),
              lastAttendance: faker.date.recent()
            },
            certificateIssued: faker.datatype.boolean(),
            ...(faker.datatype.boolean() && {
              certificateUrl: `https://example.com/certificate-${faker.string.alphanumeric(8)}.pdf`
            })
          })
        };
        
        registrations.push(registration);
      }
    }
    
    await ProgramRegistration.insertMany(registrations);
    console.log(`✅ Created ${registrations.length} program registrations`);
    
  } catch (error) {
    console.error('❌ Error seeding program registrations:', error);
    throw error;
  }
};

export const seedInvoices = async (): Promise<void> => {
  try {
    console.log('🧾 Seeding invoices...');
    
    // Clear existing invoices
    await Invoice.deleteMany({});
      // Get existing data
    const donations = await Donation.find({}).populate('donor').populate('ngo');
    
    if (donations.length === 0) {
      console.log('⚠️  No donations found. Skipping invoice seeding.');
      return;
    }
    
    const invoices: any[] = [];
    const invoiceTypes = ['donation', 'subscription', 'event_ticket', 'membership'];
    const paymentMethods = ['credit_card', 'debit_card', 'net_banking', 'upi', 'wallet'];
    const paymentStatuses = ['paid', 'pending', 'failed'];
    const taxTypes = ['80G', 'GST', 'none'];
    
    // Create invoices for donations
    for (const donation of donations) {
      if (!donation.donor || !donation.ngo) continue;
      
      const donorData = donation.donor as any;
      const ngoData = donation.ngo as any;
      
      const invoiceType = faker.helpers.arrayElement(invoiceTypes);
      const paymentStatus = faker.helpers.arrayElement(paymentStatuses);
      const taxType = faker.helpers.arrayElement(taxTypes);
      const taxRate = taxType === 'GST' ? 18 : 0;
      
      const invoice = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${faker.string.numeric(6)}`,
        donation: donation._id,
        donor: donation.donor._id,
        ngo: donation.ngo._id,
        invoiceType,
        amount: donation.amount,
        currency: 'INR',
        taxDetails: {
          taxRate,
          taxAmount: (donation.amount * taxRate) / 100,
          taxType,
          ...(taxType === '80G' && {
            exemptionCertificate: `https://example.com/80g-cert-${faker.string.alphanumeric(8)}.pdf`
          })
        },        lineItems: [{
          description: `Donation to ${ngoData.name}`,
          quantity: 1,
          unitPrice: donation.amount,
          totalPrice: donation.amount,
          category: 'donation'
        }],
        paymentDetails: {
          method: faker.helpers.arrayElement(paymentMethods),
          transactionId: `TXN${faker.string.alphanumeric(16).toUpperCase()}`,
          gateway: 'Razorpay',
          paidAt: donation.createdAt,
          status: paymentStatus
        },
        billingAddress: {
          name: donorData.name,
          email: donorData.email,
          phone: donorData.phone || faker.string.numeric(10),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          pincode: faker.string.numeric(6),
          country: 'India'
        },
        ...(taxType === '80G' && {
          taxCertificate: {
            certificateNumber: `80G-${faker.string.alphanumeric(8).toUpperCase()}`,
            issueDate: donation.createdAt,
            validUntil: new Date(donation.createdAt.getFullYear() + 1, 3, 31), // March 31 next year
            downloadUrl: `https://example.com/80g-cert-${faker.string.alphanumeric(8)}.pdf`
          }
        }),
        status: paymentStatus === 'paid' ? 'paid' : 'sent',
        issuedDate: donation.createdAt,
        notes: faker.lorem.sentence(),
        remindersSent: paymentStatus === 'pending' ? faker.number.int({ min: 0, max: 3 }) : 0,
        downloadCount: faker.number.int({ min: 0, max: 10 }),
        viewCount: faker.number.int({ min: 1, max: 20 }),
        publicUrl: `invoice-${faker.string.alphanumeric(16)}`,
        pdfUrl: `https://example.com/invoice-${faker.string.alphanumeric(8)}.pdf`
      };
      
      invoices.push(invoice);
    }
    
    await Invoice.insertMany(invoices);
    console.log(`✅ Created ${invoices.length} invoices`);
    
  } catch (error) {
    console.error('❌ Error seeding invoices:', error);
    throw error;
  }
};
