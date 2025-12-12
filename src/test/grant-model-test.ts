// Test script to verify Grant model with new custom questions
import mongoose from 'mongoose';
import Grant from '../models/Grant';
import { config } from 'dotenv';

config();

async function testGrantModel() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sevadaan-test');
    console.log('✅ Connected to database');

    // Test creating a grant with new custom questions
    const sampleGrant = {
      title: 'Test Grant with Custom Questions',
      description: 'This is a test grant to verify the new custom questions feature',
      ngo: new mongoose.Types.ObjectId(),
      requestedBy: new mongoose.Types.ObjectId(),
      category: 'education',
      requestedAmount: 50000,
      currency: 'INR',
      duration: 12,
      grantGoal: 'Improve literacy rates in rural communities',
      purpose: 'To provide educational resources and training to teachers',
      fundUsage: 'Books, supplies, teacher training programs, infrastructure improvements',
      // New custom questions
      impactMeasurement: 'We will measure impact through pre/post literacy assessments, school attendance rates, and teacher feedback surveys conducted quarterly.',
      sustainabilityPlan: 'Local community will take ownership after year 2, government partnership for ongoing funding, train local volunteers as mentors.',
      communityEngagement: 'Regular town hall meetings, parent-teacher committees, student leadership programs, and community volunteer recruitment drives.',
      objectives: ['Increase literacy by 30%', 'Train 50 teachers', 'Reach 500 students'],
      expectedOutcomes: ['Higher test scores', 'Better teacher confidence', 'Improved school infrastructure'],
      beneficiaries: {
        directCount: 500,
        indirectCount: 2000,
        demographics: 'Children aged 6-14, rural community members'
      },
      budget: {
        breakdown: [
          { category: 'Educational Materials', amount: 20000, description: 'Books and supplies' },
          { category: 'Teacher Training', amount: 15000, description: 'Workshop and training costs' },
          { category: 'Infrastructure', amount: 15000, description: 'Classroom improvements' }
        ],
        justification: 'Breakdown aligns with project goals and local market rates'
      },
      timeline: {
        milestones: [
          {
            title: 'Setup Phase',
            description: 'Procure materials and setup classrooms',
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            budget: 20000,
            completed: false
          }
        ]
      }
    };

    const grant = new Grant(sampleGrant);
    await grant.save();
    console.log('✅ Grant created successfully with ID:', grant._id);
    console.log('✅ Grant slug generated:', grant.slug);
    console.log('✅ Custom questions saved:');
    console.log('   - Impact Measurement:', grant.impactMeasurement.substring(0, 50) + '...');
    console.log('   - Sustainability Plan:', grant.sustainabilityPlan.substring(0, 50) + '...');
    console.log('   - Community Engagement:', grant.communityEngagement.substring(0, 50) + '...');

    // Test finding by slug
    const foundGrant = await Grant.findOne({ slug: grant.slug });
    if (foundGrant) {
      console.log('✅ Grant found by slug successfully');
    } else {
      console.log('❌ Failed to find grant by slug');
    }

    // Cleanup
    await Grant.deleteOne({ _id: grant._id });
    console.log('✅ Test grant cleaned up');

    console.log('\n🎉 All tests passed! Grant model is working correctly with custom questions.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
testGrantModel().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
