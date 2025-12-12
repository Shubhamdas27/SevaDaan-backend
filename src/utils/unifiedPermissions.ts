// =============================================
// UNIFIED PERMISSION SYSTEM FOR SEVADAAN
// =============================================

// Type definitions
export type RoleName = 'SUPER_ADMIN' | 'NGO_ADMIN' | 'NGO_MANAGER' | 'VOLUNTEER' | 'DONOR' | 'CITIZEN' | 'PUBLIC';

export type ModuleName = 
  | 'users' | 'ngos' | 'programs' | 'volunteers' | 'donations' | 'grants' 
  | 'certificates' | 'reports' | 'emergency' | 'services' | 'notifications' 
  | 'system' | 'ngo_settings' | 'managers' | 'profile' | 'hours' | 'referrals' 
  | 'impact_tracking' | 'tax_receipts' | 'home' | 'about' | 'contact' | 'events'
  | 'applications';

export type ActionName = 
  | 'create' | 'read' | 'update' | 'delete' | 'assign_roles' | 'approve' | 'suspend'
  | 'feature' | 'assign' | 'refund' | 'disburse' | 'apply' | 'issue' | 'export'
  | 'respond' | 'broadcast' | 'send' | 'assign_permissions' | 'register'
  | 'settings' | 'analytics' | 'audit' | 'maintenance' | 'download' | 'review';

export type PermissionConfig = {
  [K in RoleName]: {
    [module: string]: ActionName[];
  };
};

export type RoleHierarchyConfig = {
  [K in RoleName]: {
    level: number;
    inherits: string[];
    canDelegate: boolean;
    delegatableRoles: RoleName[];
  };
};

// Core permission configuration
export const PERMISSIONS: PermissionConfig = {
  // Super Admin - Full system access
  SUPER_ADMIN: {
    users: ['create', 'read', 'update', 'delete', 'assign_roles'],
    ngos: ['create', 'read', 'update', 'delete', 'approve', 'suspend'],
    programs: ['create', 'read', 'update', 'delete', 'approve', 'feature'],
    volunteers: ['create', 'read', 'update', 'delete', 'assign'],
    donations: ['create', 'read', 'update', 'delete', 'refund'],
    grants: ['create', 'read', 'update', 'delete', 'approve', 'disburse'],
    certificates: ['create', 'read', 'update', 'delete', 'issue'],
    reports: ['create', 'read', 'update', 'delete', 'export'],
    emergency: ['create', 'read', 'update', 'delete', 'respond', 'assign'],
    services: ['create', 'read', 'update', 'delete', 'approve'],
    notifications: ['create', 'read', 'update', 'delete', 'broadcast'],
    system: ['settings', 'analytics', 'audit', 'maintenance']
  },

  // NGO Admin - Full NGO management
  NGO_ADMIN: {
    users: ['create', 'read', 'update', 'delete'], // Within NGO
    programs: ['create', 'read', 'update', 'delete'],
    volunteers: ['create', 'read', 'update', 'delete', 'assign'],
    donations: ['read', 'update'], // Own NGO donations
    grants: ['create', 'read', 'update', 'apply'],
    certificates: ['create', 'read', 'update', 'issue'],
    reports: ['create', 'read', 'update', 'export'],
    emergency: ['create', 'read', 'update', 'respond', 'assign'],
    services: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update', 'send'],
    ngo_settings: ['read', 'update'],
    managers: ['create', 'read', 'update', 'delete', 'assign_permissions']
  },

  // NGO Manager - Delegated management within NGO
  NGO_MANAGER: {
    programs: ['create', 'read', 'update'], // Based on delegated permissions
    volunteers: ['read', 'update', 'assign'],
    donations: ['read'], // Read-only access
    grants: ['read', 'apply'],
    certificates: ['read', 'issue'],
    reports: ['read', 'create'],
    emergency: ['read', 'respond'],
    services: ['read', 'update'],
    notifications: ['read', 'send']
  },

  // Volunteer - Limited operational access
  VOLUNTEER: {
    profile: ['read', 'update'], // Own profile
    programs: ['read', 'register'],
    events: ['read', 'register'],
    certificates: ['read'], // Own certificates
    reports: ['read'], // Own reports
    emergency: ['respond'],
    services: ['read'],
    hours: ['create', 'read', 'update'], // Own hours
    referrals: ['create', 'read']
  },

  // Donor - Donation and impact tracking
  DONOR: {
    profile: ['read', 'update'], // Own profile
    donations: ['create', 'read', 'update'], // Own donations
    programs: ['read'], // View programs to donate to
    reports: ['read'], // Impact reports
    certificates: ['read'], // Own certificates
    tax_receipts: ['read', 'download'],
    impact_tracking: ['read']
  },

  // Citizen - Service access and applications
  CITIZEN: {
    profile: ['read', 'update'], // Own profile
    services: ['read', 'apply'],
    programs: ['read', 'apply'],
    applications: ['create', 'read', 'update'], // Own applications
    emergency: ['create', 'read'],
    referrals: ['create', 'read'],
    certificates: ['read'], // Own certificates
    notifications: ['read']
  },

  // Public - Anonymous access
  PUBLIC: {
    ngos: ['read'], // Public NGO profiles
    programs: ['read'], // Public program information
    events: ['read'], // Public events
    home: ['read'], // Home page content
    about: ['read'], // About page content
    contact: ['read'] // Contact information
  }
};

// Module-Action mapping for easier permission checking
export const MODULE_ACTIONS = {
  // User Management
  users: ['create', 'read', 'update', 'delete', 'assign_roles'],
  
  // NGO Management
  ngos: ['create', 'read', 'update', 'delete', 'approve', 'suspend'],
  ngo_settings: ['read', 'update'],
  
  // Program Management
  programs: ['create', 'read', 'update', 'delete', 'approve', 'feature', 'register'],
  
  // Volunteer Management
  volunteers: ['create', 'read', 'update', 'delete', 'assign'],
  
  // Donation Management
  donations: ['create', 'read', 'update', 'delete', 'refund'],
  
  // Grant Management
  grants: ['create', 'read', 'update', 'delete', 'approve', 'disburse', 'apply'],
  
  // Certificate Management
  certificates: ['create', 'read', 'update', 'delete', 'issue'],
  
  // Report Management
  reports: ['create', 'read', 'update', 'delete', 'export'],
  
  // Emergency Management
  emergency: ['create', 'read', 'update', 'delete', 'respond', 'assign'],
  
  // Service Management
  services: ['create', 'read', 'update', 'delete', 'approve', 'apply'],
  
  // Application Management
  applications: ['create', 'read', 'update', 'delete', 'review'],
  
  // Notification Management
  notifications: ['create', 'read', 'update', 'delete', 'broadcast', 'send'],
  
  // Manager Management
  managers: ['create', 'read', 'update', 'delete', 'assign_permissions'],
  
  // Profile Management
  profile: ['read', 'update'],
  
  // System Management
  system: ['settings', 'analytics', 'audit', 'maintenance'],
  
  // Tracking & Analytics
  hours: ['create', 'read', 'update', 'delete'],
  referrals: ['create', 'read', 'update', 'delete'],
  impact_tracking: ['read'],
  tax_receipts: ['read', 'download'],
  
  // Public Access
  home: ['read'],
  about: ['read'],
  contact: ['read'],
  events: ['read', 'register']
};

// Role hierarchy for inheritance and delegation
export const ROLE_HIERARCHY: RoleHierarchyConfig = {
  SUPER_ADMIN: {
    level: 100,
    inherits: [],
    canDelegate: true,
    delegatableRoles: ['NGO_ADMIN', 'NGO_MANAGER']
  },
  
  NGO_ADMIN: {
    level: 80,
    inherits: [],
    canDelegate: true,
    delegatableRoles: ['NGO_MANAGER']
  },
  
  NGO_MANAGER: {
    level: 60,
    inherits: [],
    canDelegate: false,
    delegatableRoles: []
  },
  
  VOLUNTEER: {
    level: 40,
    inherits: [],
    canDelegate: false,
    delegatableRoles: []
  },
  
  DONOR: {
    level: 30,
    inherits: [],
    canDelegate: false,
    delegatableRoles: []
  },
  
  CITIZEN: {
    level: 20,
    inherits: [],
    canDelegate: false,
    delegatableRoles: []
  },
  
  PUBLIC: {
    level: 10,
    inherits: [],
    canDelegate: false,
    delegatableRoles: []
  }
};

// =============================================
// CORE PERMISSION CHECKING FUNCTIONS
// =============================================

/**
 * Check if a role has permission for a specific module and action
 */
export const checkPermission = (role: string, module: string, action: string): boolean => {
  // Normalize role to uppercase
  const normalizedRole = role.toUpperCase() as RoleName;
  
  // Check if role exists
  if (!PERMISSIONS[normalizedRole]) {
    return false;
  }
  
  // Check if module exists for this role
  if (!PERMISSIONS[normalizedRole][module]) {
    return false;
  }
  
  // Check if action is allowed for this module
  return PERMISSIONS[normalizedRole][module].includes(action as ActionName);
};

/**
 * Check if a role has any permission for a module
 */
export const hasModuleAccess = (role: string, module: string): boolean => {
  const normalizedRole = role.toUpperCase() as RoleName;
  
  if (!PERMISSIONS[normalizedRole]) {
    return false;
  }
  
  return !!PERMISSIONS[normalizedRole][module];
};

/**
 * Get all permissions for a specific role
 */
export const getRolePermissions = (role: string): Record<string, ActionName[]> => {
  const normalizedRole = role.toUpperCase() as RoleName;
  return PERMISSIONS[normalizedRole] || {};
};

/**
 * Get all actions available for a role and module
 */
export const getModuleActions = (role: string, module: string): ActionName[] => {
  const normalizedRole = role.toUpperCase() as RoleName;
  
  if (!PERMISSIONS[normalizedRole] || !PERMISSIONS[normalizedRole][module]) {
    return [];
  }
  
  return PERMISSIONS[normalizedRole][module];
};

/**
 * Check if a role can delegate permissions to another role
 */
export const canDelegateToRole = (fromRole: string, toRole: string): boolean => {
  const fromRoleConfig = ROLE_HIERARCHY[fromRole.toUpperCase() as RoleName];
  
  if (!fromRoleConfig || !fromRoleConfig.canDelegate) {
    return false;
  }
  
  return fromRoleConfig.delegatableRoles.includes(toRole.toUpperCase() as RoleName);
};

/**
 * Check if a role is higher in hierarchy than another role
 */
export const isHigherRole = (role1: string, role2: string): boolean => {
  const role1Config = ROLE_HIERARCHY[role1.toUpperCase() as RoleName];
  const role2Config = ROLE_HIERARCHY[role2.toUpperCase() as RoleName];
  
  if (!role1Config || !role2Config) {
    return false;
  }
  
  return role1Config.level > role2Config.level;
};

// =============================================
// PERMISSION VALIDATION HELPERS
// =============================================

/**
 * Validate if user can perform action on resource
 */
export const validateResourceAccess = (
  userRole: string,
  userId: string,
  resourceOwnerId: string,
  module: string,
  action: string
): boolean => {
  // Check basic permission
  if (!checkPermission(userRole, module, action)) {
    return false;
  }
  
  // Check if action is for own resource
  if (action.endsWith('_own') && userId !== resourceOwnerId) {
    return false;
  }
  
  return true;
};

/**
 * Get filtered permissions based on ownership
 */
export const getFilteredPermissions = (
  userRole: string,
  userId: string,
  resourceOwnerId: string,
  module: string
): string[] => {
  const allActions = getModuleActions(userRole, module);
  
  return allActions.filter(action => {
    if (action.endsWith('_own')) {
      return userId === resourceOwnerId;
    }
    return true;
  });
};

export default {
  PERMISSIONS,
  MODULE_ACTIONS,
  ROLE_HIERARCHY,
  checkPermission,
  hasModuleAccess,
  getRolePermissions,
  getModuleActions,
  canDelegateToRole,
  isHigherRole,
  validateResourceAccess,
  getFilteredPermissions
};
