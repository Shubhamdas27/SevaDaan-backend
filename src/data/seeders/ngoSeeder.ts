import NGO from '../../models/NGO';
import User from '../../models/User';

export const seedNGOs = async (): Promise<void> => {
  try {
    // Clear existing NGOs
    await NGO.deleteMany({});    // Get admin users for NGOs
    const ngoAdmin1 = await User.findOne({ email: 'ngoadmin@helpindia.org' });
    const ngoManager1 = await User.findOne({ email: 'ngomanager@helpindia.org' });

    if (!ngoAdmin1 || !ngoManager1) {
      throw new Error('NGO admin users not found');
    }const ngos = [
      {
        name: 'Help India Foundation',
        description: 'Dedicated to providing education and healthcare to underprivileged children across India. We work in rural areas to build schools, provide scholarships, and establish medical camps.',
        mission: 'To provide quality education and healthcare to underprivileged children and empower communities through sustainable development programs.',
        vision: 'A world where every child has access to education and healthcare, regardless of their socio-economic background.',
        address: '123 Charity Lane, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        contactEmail: 'info@helpindia.org',        contactPhone: '9876543211',
        website: 'https://helpindia.org',
        registrationNumber: 'NGO-2020-001',
        registrationDate: new Date('2015-01-15'),
        type: 'trust',
        legalStatus: 'registered_society',
        logo: 'https://via.placeholder.com/150/0066cc/ffffff?text=HIF',
        images: [
          'https://via.placeholder.com/800x400/0066cc/ffffff?text=Education+Program',
          'https://via.placeholder.com/800x400/0066cc/ffffff?text=Healthcare+Camp'
        ],
        adminId: ngoAdmin1._id,
        status: 'verified',
        isVerified: true,
        documents: {
          registrationCertificateUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Registration+Certificate',
          panCardUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=PAN+Card',
          taxExemptionUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Tax+Exemption',
          auditReportUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Audit+Report'
        },
        workingAreas: ['education', 'healthcare', 'rural_development'],
        targetBeneficiaries: 'children,women,elderly',
        establishedYear: 2015,
        fcraNumber: 'FCRA-001-2015',
        socialMedia: {
          facebook: 'https://facebook.com/helpindiafoundation',
          twitter: 'https://twitter.com/helpindiafound',
          instagram: 'https://instagram.com/helpindiafoundation'
        },
        impactMetrics: 'Served over 15,000 beneficiaries across 45 completed projects with 250 active volunteers and raised 50 lakh rupees for various causes.',        representative: {
          name: 'Dr. Rajesh Sharma',
          designation: 'Executive Director',
          email: 'rajesh.sharma@helpindia.org',
          phone: '9876543211',
          idType: 'aadhaar',
          idNumber: '1234-5678-9012'
        },
        bankDetails: {
          accountName: 'Help India Foundation',
          bankName: 'State Bank of India',
          accountNumber: '1234567890123456',
          ifscCode: 'SBIN0001234'
        }
      },
      {
        name: 'Care Foundation',
        description: 'Focusing on environmental conservation and sustainable development. We plant trees, clean water bodies, and promote eco-friendly practices in communities.',
        mission: 'To protect and conserve the environment through community-driven initiatives and sustainable development practices.',
        vision: 'A green and sustainable world where humans and nature coexist in harmony.',
        address: '456 Green Avenue, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        contactEmail: 'contact@care.org',        contactPhone: '9876543212',
        website: 'https://care.org',
        registrationNumber: 'NGO-2018-002',
        registrationDate: new Date('2018-03-10'),
        type: 'society',
        legalStatus: 'trust',
        logo: 'https://via.placeholder.com/150/00cc66/ffffff?text=CF',
        images: [
          'https://via.placeholder.com/800x400/00cc66/ffffff?text=Tree+Plantation',
          'https://via.placeholder.com/800x400/00cc66/ffffff?text=Clean+Water+Drive'
        ],
        adminId: ngoManager1._id,
        status: 'verified',
        isVerified: true,
        documents: {
          registrationCertificateUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Registration+Certificate',
          panCardUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=PAN+Card',
          taxExemptionUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Tax+Exemption',
          auditReportUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Audit+Report'
        },
        workingAreas: ['environment', 'rural_development', 'disaster_relief'],
        targetBeneficiaries: 'community,farmers',
        establishedYear: 2018,
        fcraNumber: 'FCRA-002-2018',
        socialMedia: {
          facebook: 'https://facebook.com/carefoundation',
          twitter: 'https://twitter.com/care_found',
          instagram: 'https://instagram.com/carefoundation'
        },
        impactMetrics: 'Environmental impact with 8,000 beneficiaries served, 25 projects completed, 150 volunteers engaged, and 25 lakh rupees raised for environmental causes.',        representative: {
          name: 'Ms. Priya Patel',
          designation: 'Program Manager',
          email: 'priya.patel@care.org',
          phone: '9876543212',
          idType: 'aadhaar',
          idNumber: '9876-5432-1098'
        },
        bankDetails: {
          accountName: 'Care Foundation',
          bankName: 'HDFC Bank',
          accountNumber: '9876543210987654',
          ifscCode: 'HDFC0001234'
        }
      },
      {
        name: 'Smile Welfare Society',
        description: 'Working towards child welfare and women empowerment. We run orphanages, skill development centers, and support programs for single mothers.',
        mission: 'To empower children and women through education, skill development, and comprehensive welfare programs.',
        vision: 'A society where every child and woman has equal opportunities to grow and succeed.',
        address: '789 Hope Street, Koregaon Park',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        contactEmail: 'info@smilewelfare.org',        contactPhone: '9876543213',
        website: 'https://smilewelfare.org',
        registrationNumber: 'NGO-2019-003',
        registrationDate: new Date('2019-06-20'),
        type: 'section8',
        legalStatus: 'registered_society',
        logo: 'https://via.placeholder.com/150/ff6600/ffffff?text=SWS',
        images: [
          'https://via.placeholder.com/800x400/ff6600/ffffff?text=Child+Care',
          'https://via.placeholder.com/800x400/ff6600/ffffff?text=Skill+Development'
        ],
        adminId: ngoAdmin1._id, // Temporarily using same admin
        status: 'pending',
        isVerified: false,
        documents: {
          registrationCertificateUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=Registration+Certificate',
          panCardUrl: 'https://via.placeholder.com/600x800/ffffff/000000?text=PAN+Card'
        },
        workingAreas: ['child_welfare', 'women_empowerment', 'skill_development'],
        targetBeneficiaries: 'children,women',
        establishedYear: 2019,
        socialMedia: {
          facebook: 'https://facebook.com/smilewelfare',
          instagram: 'https://instagram.com/smilewelfare'
        },
        impactMetrics: 'Social welfare impact with 3,000 beneficiaries served, 12 projects completed, 80 volunteers engaged, and 8 lakh rupees raised for welfare programs.',        representative: {
          name: 'Mrs. Sunita Devi',
          designation: 'Founder & Director',
          email: 'sunita.devi@smilewelfare.org',
          phone: '9876543213',
          idType: 'aadhaar',
          idNumber: '5555-6666-7777'
        },
        bankDetails: {
          accountName: 'Smile Welfare Society',
          bankName: 'ICICI Bank',
          accountNumber: '5555666677778888',
          ifscCode: 'ICIC0001234'
        }
      }
    ];

    const createdNGOs = await NGO.insertMany(ngos);
    console.log(`✅ ${createdNGOs.length} NGOs seeded successfully`);

    // Update users with NGO IDs
    await User.findByIdAndUpdate(ngoAdmin1._id, { ngoId: createdNGOs[0]._id });
    await User.findByIdAndUpdate(ngoManager1._id, { ngoId: createdNGOs[1]._id });

    return;
  } catch (error) {
    console.error('❌ Error seeding NGOs:', error);
    throw error;
  }
};
