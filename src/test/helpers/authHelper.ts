// Test Authentication Helper
// File: src/test/helpers/authHelper.ts

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Generate a test JWT token for authentication
 */
export function generateTestToken(userId: mongoose.Types.ObjectId, role: string): string {
  const payload = {
    _id: userId,
    role: role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
}

/**
 * Create test user data
 */
export function createTestUserData(overrides: any = {}) {
  return {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'volunteer',
    isActive: true,
    ...overrides
  };
}

/**
 * Create test NGO data
 */
export function createTestNGOData(adminId: mongoose.Types.ObjectId, overrides: any = {}) {
  return {
    name: 'Test NGO',
    description: 'A test NGO for testing purposes',
    adminId: adminId,
    email: 'test@testngo.org',
    status: 'verified',
    registrationNumber: 'TEST123456',
    ...overrides
  };
}
