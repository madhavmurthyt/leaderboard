import dotenv from 'dotenv';
import { User, sequelize } from '../models/index.js';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@leaderboard.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Seed an admin user
 * Run with: node seeders/adminSeeder.js
 */
const seedAdmin = async () => {
  try {
    console.log('\n🔧 Admin Seeder\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { email: ADMIN_EMAIL }
    });

    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${ADMIN_EMAIL}`);
      
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated user role to admin');
      }
    } else {
      // Create admin user
      const admin = await User.create({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        isActive: true
      });

      console.log('✅ Admin user created successfully!');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
    }

    console.log('\n📝 Admin Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  Please change the password after first login!\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();

