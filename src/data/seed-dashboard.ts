import mongoose from 'mongoose';
import UserRole from '../models/UserRole';
import User from '../models/User';
import config from '../config/config';
import logger from '../utils/logger';

const seedUserRoles = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB for seeding user roles');

    // Clear existing roles
    await UserRole.deleteMany({});
    logger.info('Cleared existing user roles');

    // Get default roles configuration
    const defaultRoles = [
      {
        name: 'NGO',
        permissions: {
          view_all: true,
          manage_org: true,
          view_analytics: true,
          manage_operations: true
        },
        description: 'Basic NGO organization access'
      },
      {
        name: 'NGO_ADMIN',
        permissions: {
          admin_access: true,
          manage_users: true,
          view_all: true,
          manage_org: true,
          view_analytics: true,
          manage_operations: true
        },
        description: 'Full administrative access for NGO'
      },
      {
        name: 'NGO_MANAGER',
        permissions: {
          manage_operations: true,
          view_analytics: true,
          view_all: true
        },
        description: 'Operational management for NGO'
      },
      {
        name: 'CITIZEN',
        permissions: {
          apply_services: true,
          view_services: true
        },
        description: 'Basic citizen access to services'
      },
      {
        name: 'VOLUNTEER',
        permissions: {
          view_opportunities: true,
          track_hours: true,
          view_services: true
        },
        description: 'Volunteer access to opportunities and tracking'
      },
      {
        name: 'DONOR',
        permissions: {
          view_impact: true,
          track_donations: true,
          view_services: true
        },
        description: 'Donor access to impact tracking and donations'
      }
    ];

    // Insert default roles
    const createdRoles = await UserRole.insertMany(defaultRoles);
    logger.info(`Created ${createdRoles.length} user roles`);

    // Update existing users to reference the new role system
    const roleMapping: Record<string, string[]> = {
      'NGO': ['ngo'],
      'NGO_ADMIN': ['ngo_admin'],
      'NGO_MANAGER': ['ngo_manager'],
      'CITIZEN': ['citizen'],
      'VOLUNTEER': ['volunteer'],
      'DONOR': ['donor']
    };

    for (const role of createdRoles) {
      const userRoles = roleMapping[role.name];
      if (userRoles) {
        await User.updateMany(
          { role: { $in: userRoles } },
          { roleId: role._id }
        );
        logger.info(`Updated users with role ${role.name}`);
      }
    }

    logger.info('User role seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding user roles:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

const seedDashboardAnalytics = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB for seeding dashboard analytics');

    // This would typically be called by a cron job or scheduler
    // For now, we'll just log that the analytics seeding is available
    logger.info('Dashboard analytics seeding structure ready');

    await mongoose.disconnect();
  } catch (error) {
    logger.error('Error seeding dashboard analytics:', error);
    throw error;
  }
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'roles':
      seedUserRoles()
        .then(() => {
          console.log('✅ User roles seeded successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Error seeding user roles:', error);
          process.exit(1);
        });
      break;
    case 'analytics':
      seedDashboardAnalytics()
        .then(() => {
          console.log('✅ Dashboard analytics structure ready');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Error setting up analytics:', error);
          process.exit(1);
        });
      break;
    default:
      console.log('Usage: npm run seed [roles|analytics]');
      process.exit(1);
  }
}

export { seedUserRoles, seedDashboardAnalytics };
