import Grant from '../../models/Grant';
import User from '../../models/User';
import NGO from '../../models/NGO';

export const seedGrants = async (): Promise<void> => {
  try {
    // Clear existing grants
    await Grant.deleteMany({});

    // Get references
    const ngoAdmins = await User.find({ role: { $in: ['ngo_admin', 'ngo_manager'] } });
    const ngos = await NGO.find({});
    const superAdmin = await User.findOne({ role: 'ngo' });

    if (ngoAdmins.length === 0 || ngos.length === 0 || !superAdmin) {
      throw new Error('Required data not found for grant seeding');
    }

    const grants = [
      {
        title: 'Digital Learning Infrastructure Grant',
        description: 'Funding request to establish digital learning centers in rural schools with computers, internet connectivity, and educational software to bridge the digital divide.',
        ngo: ngos[0]._id, // Help India Foundation
        requestedBy: ngoAdmins[0]._id,
        category: 'education',
        requestedAmount: 2500000,
        approvedAmount: 2000000,
        currency: 'INR',
        duration: 18,
        status: 'approved',
        priority: 'high',
        objectives: [
          'Establish 10 digital learning centers in rural schools',
          'Train 50 teachers on digital pedagogy',
          'Provide digital literacy to 1000 students',
          'Create sustainable technology maintenance system'
        ],
        expectedOutcomes: [
          'Improved learning outcomes through technology integration',
          'Enhanced teacher capabilities in digital education',
          'Increased student engagement and retention',
          'Better preparation of rural students for digital economy'
        ],
        beneficiaries: {
          directCount: 1000,
          indirectCount: 5000,
          demographics: 'Students aged 8-16 in rural government schools, teachers, and their families'
        },
        budget: {
          breakdown: [
            {
              category: 'Hardware (Computers, Tablets)',
              amount: 1500000,
              description: '30 computers, 50 tablets, networking equipment'
            },
            {
              category: 'Software & Licenses',
              amount: 300000,
              description: 'Educational software, operating system licenses'
            },
            {
              category: 'Infrastructure Setup',
              amount: 400000,
              description: 'Internet connectivity, electrical work, furniture'
            },
            {
              category: 'Training & Capacity Building',
              amount: 200000,
              description: 'Teacher training, student orientation, parent awareness'
            },
            {
              category: 'Project Management',
              amount: 100000,
              description: 'Coordination, monitoring, evaluation'
            }
          ],
          justification: 'Digital infrastructure is crucial for modern education. This investment will serve students for 10+ years and create a foundation for digital literacy in rural areas.'
        },
        timeline: {
          milestones: [
            {
              title: 'Infrastructure Assessment',
              description: 'Survey schools and assess infrastructure requirements',
              targetDate: new Date('2024-02-15'),
              budget: 50000,
              completed: true,
              completedDate: new Date('2024-02-10')
            },
            {
              title: 'Hardware Procurement',
              description: 'Purchase and quality check all digital equipment',
              targetDate: new Date('2024-04-30'),
              budget: 1500000,
              completed: true,
              completedDate: new Date('2024-04-25')
            },
            {
              title: 'Installation & Setup',
              description: 'Install equipment and establish connectivity',
              targetDate: new Date('2024-06-30'),
              budget: 400000,
              completed: false
            },
            {
              title: 'Teacher Training Program',
              description: 'Comprehensive training for teachers on digital tools',
              targetDate: new Date('2024-08-15'),
              budget: 200000,
              completed: false
            },
            {
              title: 'Launch & Monitoring',
              description: 'Launch digital centers and begin monitoring',
              targetDate: new Date('2024-09-01'),
              budget: 50000,
              completed: false
            }
          ]
        },
        documents: {
          proposal: 'https://via.placeholder.com/600x800/ffffff/000000?text=Digital+Learning+Proposal',
          budget: 'https://via.placeholder.com/600x800/ffffff/000000?text=Detailed+Budget+Plan',
          impactAssessment: 'https://via.placeholder.com/600x800/ffffff/000000?text=Impact+Assessment+Report',
          progressReports: [
            'https://via.placeholder.com/600x800/ffffff/000000?text=Q1+Progress+Report',
            'https://via.placeholder.com/600x800/ffffff/000000?text=Q2+Progress+Report'
          ]
        },
        review: {
          reviewedBy: superAdmin._id,
          reviewedAt: new Date('2024-01-25'),
          reviewComments: 'Excellent proposal with clear objectives and realistic timeline. Approved with slight budget adjustment.',
          reviewScore: 4.7
        },
        approval: {
          approvedBy: superAdmin._id,
          approvedAt: new Date('2024-01-30'),
          approvalComments: 'Grant approved for digital transformation in rural education. Monitor progress closely.',
          conditions: [
            'Monthly progress reports required',
            'Teacher training completion mandatory before equipment deployment',
            'Impact assessment to be conducted after 6 months'
          ]
        },
        disbursement: {
          schedule: [
            {
              amount: 800000,
              dueDate: new Date('2024-02-15'),
              status: 'disbursed',
              disbursedAt: new Date('2024-02-15'),
              description: 'Initial infrastructure and procurement'
            },
            {
              amount: 700000,
              dueDate: new Date('2024-05-15'),
              status: 'disbursed',
              disbursedAt: new Date('2024-05-15'),
              description: 'Hardware procurement and installation'
            },
            {
              amount: 500000,
              dueDate: new Date('2024-08-15'),
              status: 'pending',
              description: 'Training and launch phase'
            }
          ],
          totalDisbursed: 1500000
        },
        compliance: {
          reportsSubmitted: 2,
          reportsRequired: 6,
          lastReportDate: new Date('2024-05-01'),
          complianceScore: 4.5,
          auditStatus: 'pending'
        }
      },
      {
        title: 'Clean Water Access Expansion Grant',
        description: 'Funding to expand clean water access to remote villages through bore wells, water purification systems, and community water management training.',
        ngo: ngos[1]._id, // Care Foundation
        requestedBy: ngoAdmins[1]._id,
        category: 'environment',
        requestedAmount: 1800000,
        currency: 'INR',
        duration: 12,
        status: 'under_review',
        priority: 'urgent',
        objectives: [
          'Install 15 bore wells in water-scarce villages',
          'Set up 5 community water purification centers',
          'Train 100 community members on water management',
          'Establish water quality monitoring system'
        ],
        expectedOutcomes: [
          'Access to safe drinking water for 8000 people',
          'Reduced water-borne diseases by 70%',
          'Sustainable community water management',
          'Improved health and productivity in target villages'
        ],
        beneficiaries: {
          directCount: 8000,
          indirectCount: 20000,
          demographics: 'Rural families, children, elderly, and livestock in drought-affected areas of Gujarat'
        },
        budget: {
          breakdown: [
            {
              category: 'Bore Well Installation',
              amount: 900000,
              description: '15 bore wells with hand pumps and solar systems'
            },
            {
              category: 'Purification Systems',
              amount: 500000,
              description: '5 community-level water purification units'
            },
            {
              category: 'Training & Awareness',
              amount: 200000,
              description: 'Community training on water management and hygiene'
            },
            {
              category: 'Maintenance & Monitoring',
              amount: 150000,
              description: 'Equipment maintenance and water quality testing'
            },
            {
              category: 'Administrative Costs',
              amount: 50000,
              description: 'Project coordination and documentation'
            }
          ],
          justification: 'Water scarcity affects 8000+ people in target villages. This investment will provide sustainable water access and improve health outcomes significantly.'
        },
        timeline: {
          milestones: [
            {
              title: 'Site Survey & Permissions',
              description: 'Geological survey and government approvals',
              targetDate: new Date('2024-06-15'),
              budget: 50000,
              completed: false
            },
            {
              title: 'Bore Well Drilling',
              description: 'Drill and install 15 bore wells',
              targetDate: new Date('2024-09-30'),
              budget: 900000,
              completed: false
            },
            {
              title: 'Purification Center Setup',
              description: 'Install community purification systems',
              targetDate: new Date('2024-11-15'),
              budget: 500000,
              completed: false
            },
            {
              title: 'Community Training',
              description: 'Train local communities on water management',
              targetDate: new Date('2024-12-31'),
              budget: 200000,
              completed: false
            }
          ]
        },
        documents: {
          proposal: 'https://via.placeholder.com/600x800/ffffff/000000?text=Water+Access+Proposal',
          budget: 'https://via.placeholder.com/600x800/ffffff/000000?text=Water+Project+Budget',
          impactAssessment: 'https://via.placeholder.com/600x800/ffffff/000000?text=Water+Impact+Assessment'
        },
        review: {
          reviewComments: 'Under review by technical committee. Waiting for geological survey report.',
          reviewScore: 0
        },
        compliance: {
          reportsSubmitted: 0,
          reportsRequired: 4,
          complianceScore: 0,
          auditStatus: 'not_applicable'
        }
      },
      {
        title: 'Women Skill Development & Entrepreneurship Grant',
        description: 'Comprehensive program to provide skill training, entrepreneurship support, and micro-credit access to rural women for economic empowerment.',
        ngo: ngos[2]._id, // Smile Welfare Society
        requestedBy: ngoAdmins[0]._id, // Using available admin
        category: 'women-empowerment',
        requestedAmount: 1200000,
        currency: 'INR',
        duration: 24,
        status: 'submitted',
        priority: 'medium',
        objectives: [
          'Train 200 women in various marketable skills',
          'Establish 5 skill development centers',
          'Support 50 women to start micro-enterprises',
          'Create market linkages for products'
        ],
        expectedOutcomes: [
          'Economic independence for 200 women',
          'Average income increase of 300% for beneficiaries',
          'Strengthened community networks and self-help groups',
          'Sustainable skill development ecosystem'
        ],
        beneficiaries: {
          directCount: 200,
          indirectCount: 1000,
          demographics: 'Rural women aged 18-45, especially single mothers, widows, and economically disadvantaged women'
        },
        budget: {
          breakdown: [
            {
              category: 'Training Materials & Equipment',
              amount: 400000,
              description: 'Sewing machines, computers, raw materials for training'
            },
            {
              category: 'Trainer Fees & Salaries',
              amount: 350000,
              description: 'Skilled trainers for various trades'
            },
            {
              category: 'Infrastructure & Centers',
              amount: 250000,
              description: 'Rent and setup of skill development centers'
            },
            {
              category: 'Micro-credit & Business Support',
              amount: 150000,
              description: 'Seed funding and business development support'
            },
            {
              category: 'Marketing & Linkages',
              amount: 50000,
              description: 'Product marketing and market linkage creation'
            }
          ],
          justification: 'Women empowerment through skills training has proven impact on family welfare and community development. ROI expected through increased household incomes.'
        },
        timeline: {
          milestones: [
            {
              title: 'Center Setup & Recruitment',
              description: 'Establish centers and recruit beneficiaries',
              targetDate: new Date('2024-07-31'),
              budget: 300000,
              completed: false
            },
            {
              title: 'Phase 1 Training (100 women)',
              description: 'Complete training for first batch',
              targetDate: new Date('2024-12-31'),
              budget: 400000,
              completed: false
            },
            {
              title: 'Phase 2 Training (100 women)',
              description: 'Complete training for second batch',
              targetDate: new Date('2025-06-30'),
              budget: 400000,
              completed: false
            },
            {
              title: 'Enterprise Support & Market Linkage',
              description: 'Support business setup and create market linkages',
              targetDate: new Date('2025-12-31'),
              budget: 100000,
              completed: false
            }
          ]
        },
        documents: {
          proposal: 'https://via.placeholder.com/600x800/ffffff/000000?text=Women+Skill+Proposal',
          budget: 'https://via.placeholder.com/600x800/ffffff/000000?text=Skills+Budget+Plan',
          impactAssessment: 'https://via.placeholder.com/600x800/ffffff/000000?text=Women+Empowerment+Impact'
        },
        review: {
          reviewComments: 'Proposal submitted and awaiting initial review by grants committee.',
          reviewScore: 0
        },
        compliance: {
          reportsSubmitted: 0,
          reportsRequired: 8,
          complianceScore: 0,
          auditStatus: 'not_applicable'
        }
      },
      {
        title: 'Emergency Disaster Response Fund',
        description: 'Rapid response fund for natural disasters including medical aid, temporary shelter, food distribution, and rehabilitation support.',
        ngo: ngos[0]._id, // Help India Foundation
        requestedBy: ngoAdmins[0]._id,
        category: 'disaster-relief',
        requestedAmount: 3000000,
        currency: 'INR',
        duration: 6,
        status: 'draft',
        priority: 'urgent',
        objectives: [
          'Establish emergency response protocols',
          'Maintain emergency supply stockpiles',
          'Train rapid response teams',
          'Coordinate with government disaster management'
        ],
        expectedOutcomes: [
          'Reduced response time to disasters from 48hrs to 6hrs',
          'Emergency support for up to 5000 affected people',
          'Established network of trained volunteers',
          'Improved coordination with authorities'
        ],
        beneficiaries: {
          directCount: 5000,
          indirectCount: 25000,
          demographics: 'Disaster-affected populations including children, elderly, and disabled individuals'
        },
        budget: {
          breakdown: [
            {
              category: 'Emergency Supplies Stockpile',
              amount: 1500000,
              description: 'Food, medicine, blankets, tents, first aid supplies'
            },
            {
              category: 'Transportation & Logistics',
              amount: 600000,
              description: 'Emergency vehicles, fuel, communication equipment'
            },
            {
              category: 'Team Training & Equipment',
              amount: 500000,
              description: 'Rescue equipment, team training, safety gear'
            },
            {
              category: 'Coordination & Communication',
              amount: 300000,
              description: 'Coordination center, communication systems'
            },
            {
              category: 'Administrative Costs',
              amount: 100000,
              description: 'Documentation, compliance, reporting'
            }
          ],
          justification: 'Climate change has increased disaster frequency. Having pre-positioned resources and trained teams can save lives and reduce suffering during emergencies.'
        },
        timeline: {
          milestones: [
            {
              title: 'Team Formation & Training',
              description: 'Recruit and train emergency response teams',
              targetDate: new Date('2024-08-15'),
              budget: 500000,
              completed: false
            },
            {
              title: 'Supply Procurement & Storage',
              description: 'Procure and stockpile emergency supplies',
              targetDate: new Date('2024-09-30'),
              budget: 1500000,
              completed: false
            },
            {
              title: 'System Testing & Drills',
              description: 'Conduct emergency drills and system testing',
              targetDate: new Date('2024-11-30'),
              budget: 300000,
              completed: false
            },
            {
              title: 'Full Operational Readiness',
              description: 'Complete setup and operational readiness',
              targetDate: new Date('2024-12-31'),
              budget: 700000,
              completed: false
            }
          ]
        },
        documents: {
          proposal: 'https://via.placeholder.com/600x800/ffffff/000000?text=Emergency+Response+Proposal',
          budget: 'https://via.placeholder.com/600x800/ffffff/000000?text=Emergency+Budget+Plan'
        },
        review: {
          reviewComments: 'Draft proposal under internal review before submission.',
          reviewScore: 0
        },
        compliance: {
          reportsSubmitted: 0,
          reportsRequired: 2,
          complianceScore: 0,
          auditStatus: 'not_applicable'
        }
      }
    ];

    const createdGrants = await Grant.insertMany(grants);
    console.log(`✅ ${createdGrants.length} grants seeded successfully`);

    return;
  } catch (error) {
    console.error('❌ Error seeding grants:', error);
    throw error;
  }
};
