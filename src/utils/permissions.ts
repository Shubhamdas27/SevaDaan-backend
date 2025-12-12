import { INGO } from '../types';

/**
 * Check if user has permission to perform actions on an NGO
 * @param ngo - The NGO document
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @returns boolean indicating if user has permission
 */
export const checkPermission = (
  ngo: INGO | any, 
  userId: string, 
  userRole?: string
): boolean => {
  // Super admin can access everything
  if (userRole === 'ngo') {
    return true;
  }

  // Admin can access everything
  if (userRole === 'admin') {
    return true;
  }

  // Check if user is the NGO admin
  if (ngo.adminId && ngo.adminId.toString() === userId.toString()) {
    return true;
  }

  return false;
};

/**
 * Check if user can approve/reject items (NGO admins)
 * @param userRole - The user's role
 * @returns boolean indicating if user can approve/reject
 */
export const canApprove = (userRole?: string): boolean => {
  return ['ngo', 'ngo_admin'].includes(userRole || '');
};

/**
 * Check if user can manage featured content (NGO admins)
 * @param userRole - The user's role
 * @returns boolean indicating if user can manage featured content
 */
export const canManageFeatured = (userRole?: string): boolean => {
  return ['ngo', 'ngo_admin'].includes(userRole || '');
};

/**
 * Check if user can access admin dashboard
 * @param userRole - The user's role
 * @returns boolean indicating if user can access admin dashboard
 */
export const isAdminUser = (userRole?: string): boolean => {
  return ['ngo', 'ngo_admin'].includes(userRole || '');
};
