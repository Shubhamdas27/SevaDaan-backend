import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { CustomError } from './errorMiddleware';

export interface RoleHierarchy {
  [key: string]: {
    level: number;
    permissions: string[];
    canDelegate: boolean;
    inherits?: string[];
  };
}

export const ROLE_HIERARCHY: RoleHierarchy = {
  ngo_admin: {
    level: 10,
    permissions: ['*'], // All permissions
    canDelegate: true,
    inherits: []
  },
  ngo: {
    level: 10,
    permissions: ['*'], // All permissions
    canDelegate: true,
    inherits: []
  },
  ngo_manager: {
    level: 5,
    permissions: [], // Delegated permissions only
    canDelegate: false,
    inherits: []
  },
  volunteer: {
    level: 3,
    permissions: [
      'volunteer_read_own',
      'volunteer_update_own',
      'programs_read',
      'events_read',
      'emergency_respond',
      'referrals_create',
      'certificates_read_own'
    ],
    canDelegate: false,
    inherits: []
  },
  donor: {
    level: 3,
    permissions: [
      'donor_read_own',
      'donor_update_own',
      'donations_crud_own',
      'programs_read',
      'reports_read_own',
      'certificates_read_own'
    ],
    canDelegate: false,
    inherits: []
  },
  citizen: {
    level: 1,
    permissions: [
      'citizen_read_own',
      'citizen_update_own',
      'services_read',
      'programs_read',
      'events_read',
      'emergency_create',
      'referrals_create',
      'applications_crud_own'
    ],
    canDelegate: false,
    inherits: []
  }
};

export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    'users_create',
    'users_read',
    'users_update',
    'users_delete',
    'users_read_own',
    'users_update_own'
  ],
  NGO_MANAGEMENT: [
    'ngo_create',
    'ngo_read',
    'ngo_update',
    'ngo_delete',
    'ngo_settings'
  ],
  PROGRAM_MANAGEMENT: [
    'programs_create',
    'programs_read',
    'programs_update',
    'programs_delete',
    'programs_register'
  ],
  VOLUNTEER_MANAGEMENT: [
    'volunteers_create',
    'volunteers_read',
    'volunteers_update',
    'volunteers_delete',
    'volunteers_assign',
    'volunteer_read_own',
    'volunteer_update_own'
  ],
  DONATION_MANAGEMENT: [
    'donations_create',
    'donations_read',
    'donations_update',
    'donations_delete',
    'donations_crud_own'
  ],
  GRANT_MANAGEMENT: [
    'grants_create',
    'grants_read',
    'grants_update',
    'grants_delete',
    'grants_apply'
  ],
  REPORT_MANAGEMENT: [
    'reports_create',
    'reports_read',
    'reports_update',
    'reports_delete',
    'reports_read_own'
  ],
  CERTIFICATE_MANAGEMENT: [
    'certificates_create',
    'certificates_read',
    'certificates_update',
    'certificates_delete',
    'certificates_read_own',
    'certificates_issue'
  ],
  EMERGENCY_MANAGEMENT: [
    'emergency_create',
    'emergency_read',
    'emergency_update',
    'emergency_delete',
    'emergency_respond',
    'emergency_assign'
  ],
  SERVICE_MANAGEMENT: [
    'services_create',
    'services_read',
    'services_update',
    'services_delete',
    'applications_crud_own',
    'applications_review'
  ],
  NOTIFICATION_MANAGEMENT: [
    'notifications_create',
    'notifications_read',
    'notifications_update',
    'notifications_delete',
    'notifications_broadcast'
  ],
  MANAGER_PERMISSIONS: [
    'managers_create',
    'managers_read',
    'managers_update',
    'managers_delete',
    'permissions_delegate'
  ]
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (userRole: string, userPermissions: string[] = [], requiredPermission: string): boolean => {
  const roleConfig = ROLE_HIERARCHY[userRole];
  
  if (!roleConfig) return false;
  
  // Super admin roles have all permissions
  if (roleConfig.permissions.includes('*')) return true;
  
  // Check role-based permissions
  if (roleConfig.permissions.includes(requiredPermission)) return true;
  
  // Check delegated permissions (for managers)
  if (userPermissions.includes(requiredPermission)) return true;
  
  return false;
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    if (hasPermission(req.user.role, req.user.permissions, permission)) {
      return next();
    }

    return next(new CustomError(`Access denied. Required permission: ${permission}`, 403));
  };
};

/**
 * Middleware to check multiple permissions (OR logic)
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user!.role, req.user!.permissions, permission)
    );

    if (hasAnyPermission) {
      return next();
    }

    return next(new CustomError(`Access denied. Required permissions (any): ${permissions.join(', ')}`, 403));
  };
};

/**
 * Middleware to check multiple permissions (AND logic)
 */
export const requireAllPermissions = (permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    const hasAllPermissions = permissions.every(permission => 
      hasPermission(req.user!.role, req.user!.permissions, permission)
    );

    if (hasAllPermissions) {
      return next();
    }

    return next(new CustomError(`Access denied. Required permissions (all): ${permissions.join(', ')}`, 403));
  };
};

/**
 * Middleware to check role hierarchy level
 */
export const requireMinLevel = (minLevel: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    const userLevel = ROLE_HIERARCHY[req.user.role]?.level || 0;
    
    if (userLevel >= minLevel) {
      return next();
    }

    return next(new CustomError(`Access denied. Insufficient role level`, 403));
  };
};

/**
 * Get all available permissions for a role
 */
export const getRolePermissions = (role: string): string[] => {
  const roleConfig = ROLE_HIERARCHY[role];
  if (!roleConfig) return [];
  
  if (roleConfig.permissions.includes('*')) {
    // Return all permissions for super admin roles
    return Object.values(PERMISSION_GROUPS).flat();
  }
  
  return roleConfig.permissions;
};

/**
 * Check if role can delegate permissions
 */
export const canDelegate = (role: string): boolean => {
  return ROLE_HIERARCHY[role]?.canDelegate || false;
};

/**
 * Advanced permission validation functions
 */
export const validateResourceAccess = (userRole: string, userPermissions: string[], resourceType: string, action: string, resourceOwnerId?: string, userId?: string): boolean => {
  const requiredPermission = `${resourceType}_${action}`;
  
  // Check basic permission
  if (hasPermission(userRole, userPermissions, requiredPermission)) {
    return true;
  }
  
  // Check if accessing own resource
  if (resourceOwnerId && userId && resourceOwnerId === userId) {
    const ownPermission = `${resourceType}_${action}_own`;
    return hasPermission(userRole, userPermissions, ownPermission);
  }
  
  return false;
};

/**
 * Get permissions that can be delegated by a role
 */
export const getDelegatablePermissions = (role: string): string[] => {
  if (!canDelegate(role)) return [];
  
  // NGO Admin and NGO can delegate most permissions except critical ones
  const criticalPermissions = ['users_delete', 'ngo_delete', 'managers_delete'];
  const allPermissions = Object.values(PERMISSION_GROUPS).flat();
  
  return allPermissions.filter(permission => !criticalPermissions.includes(permission));
};

/**
 * Middleware for resource ownership validation
 */
export const requireResourceOwnership = (resourceType: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    const userRole = req.user.role;
    const userId = req.user._id.toString();
    
    // Super admin roles can access all resources
    if (ROLE_HIERARCHY[userRole]?.level >= 10) {
      return next();
    }

    // Extract resource owner ID from request (params, body, or query)
    const resourceOwnerId = req.params.userId || req.body.userId || req.query.userId;
    
    if (!resourceOwnerId || resourceOwnerId !== userId) {
      return next(new CustomError('Access denied. Can only access own resources', 403));
    }

    next();
  };
};

/**
 * Dynamic permission checker based on HTTP method
 */
export const requireDynamicPermission = (resourceType: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    const method = req.method.toLowerCase();
    let action = '';
    
    switch (method) {
      case 'get': action = 'read'; break;
      case 'post': action = 'create'; break;
      case 'put':
      case 'patch': action = 'update'; break;
      case 'delete': action = 'delete'; break;
      default: action = 'read';
    }

    const permission = `${resourceType}_${action}`;
    
    if (hasPermission(req.user.role, req.user.permissions, permission)) {
      return next();
    }

    return next(new CustomError(`Access denied. Required permission: ${permission}`, 403));
  };
};
