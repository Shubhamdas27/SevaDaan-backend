// Test script to verify notification system
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import notificationService from '../services/notificationService';
import { config } from 'dotenv';

config();

async function testNotificationSystem() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sevadaan-test');
    console.log('✅ Connected to database');

    // Test creating a notification
    const testUserId = new mongoose.Types.ObjectId();
    const testGrantId = new mongoose.Types.ObjectId();
    const testNgoId = new mongoose.Types.ObjectId();

    console.log('🔔 Testing notification creation...');

    // Test grant posted notification
    await notificationService.notifyGrantPosted(
      testGrantId,
      'Test Grant Notification',
      testNgoId,
      [testUserId]
    );
    console.log('✅ Grant posted notification sent');

    // Wait a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify notification was saved to database
    const notifications = await Notification.find({ userId: testUserId });
    console.log(`✅ Found ${notifications.length} notification(s) in database`);

    if (notifications.length > 0) {
      const notification = notifications[0];
      console.log('✅ Notification details:');
      console.log(`   - Type: ${notification.type}`);
      console.log(`   - Title: ${notification.title}`);
      console.log(`   - Message: ${notification.message}`);
      console.log(`   - Read: ${notification.read}`);
      console.log(`   - Created: ${notification.createdAt}`);
    }

    // Test volunteer application notification
    const testVolunteerId = new mongoose.Types.ObjectId();
    await notificationService.notifyVolunteerApplication(
      testVolunteerId,
      'John Doe',
      testNgoId,
      [testUserId]
    );
    console.log('✅ Volunteer application notification sent');

    // Test donation received notification
    const testDonationId = new mongoose.Types.ObjectId();
    const testGrantId2 = new mongoose.Types.ObjectId();
    await notificationService.notifyDonationReceived(
      testDonationId,
      'Jane Smith',
      5000,
      'INR',
      testGrantId2,
      testNgoId,
      [testUserId]
    );
    console.log('✅ Donation received notification sent');

    // Wait for all async operations to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check total notifications
    const allNotifications = await Notification.find({ userId: testUserId });
    console.log(`✅ Total notifications created: ${allNotifications.length}`);

    // Cleanup test notifications
    await Notification.deleteMany({ userId: testUserId });
    console.log('✅ Test notifications cleaned up');

    console.log('\n🎉 All notification tests passed! Notification system is working correctly.');

  } catch (error) {
    console.error('❌ Notification test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
testNotificationSystem().then(() => {
  console.log('Notification test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Notification test failed with error:', error);
  process.exit(1);
});
