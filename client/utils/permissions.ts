// Optimized Permissions Utility
// /utils/permissions-optimized.ts

import { createClient } from '@/app/utils/supabase/server';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserPermissions {
  role: UserRole;
  canCreateLeads: boolean;
  canEditLeads: boolean;
  canDeleteLeads: boolean;
  canViewLeads: boolean;
  canCreateTemplates: boolean;
  canEditTemplates: boolean;
  canDeleteTemplates: boolean;
  canViewTemplates: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canManageOrganization: boolean;
  canViewMembers: boolean;
  canImportLeads: boolean;
  canExportLeads: boolean;
  isOrgCreator: boolean;
}

export interface OrganizationInfo {
  role: UserRole | null;
  is_org_creator: boolean;
  org_name: string;
  org_slug: string;
}

// Cache for permissions - simple in-memory cache
const permissionsCache = new Map<string, { permissions: UserPermissions; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, orgId: string): string {
  return `${userId}:${orgId}`;
}

function isValidCacheEntry(entry: { permissions: UserPermissions; timestamp: number }): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// Optimized function using database function
export async function getUserPermissions(orgId: string, userId: string): Promise<UserPermissions> {
  const cacheKey = getCacheKey(userId, orgId);
  const cached = permissionsCache.get(cacheKey);
  
  if (cached && isValidCacheEntry(cached)) {
    return cached.permissions;
  }

  const sb = await createClient();
  
  // Use the optimized database function
  const { data: orgInfo, error } = await sb
    .rpc('get_user_permissions_fast', {
      p_user_id: userId,
      p_org_id: orgId
    })
    .single() as { data: OrganizationInfo | null; error: unknown };

  if (error || !orgInfo) {
    const defaultPermissions: UserPermissions = {
      role: 'viewer',
      canCreateLeads: false,
      canEditLeads: false,
      canDeleteLeads: false,
      canViewLeads: false,
      canCreateTemplates: false,
      canEditTemplates: false,
      canDeleteTemplates: false,
      canViewTemplates: false,
      canInviteMembers: false,
      canManageMembers: false,
      canManageOrganization: false,
      canViewMembers: false,
      canImportLeads: false,
      canExportLeads: false,
      isOrgCreator: false,
    };
    
    permissionsCache.set(cacheKey, {
      permissions: defaultPermissions,
      timestamp: Date.now()
    });
    
    return defaultPermissions;
  }

  const role = orgInfo.role as UserRole;
  const isOrgCreator = orgInfo.is_org_creator;

  const permissions: UserPermissions = {
    role: role || 'viewer',
    isOrgCreator,
    // Organization creator has ultimate permissions
    ...(isOrgCreator ? {
      canCreateLeads: true,
      canEditLeads: true,
      canDeleteLeads: true,
      canViewLeads: true,
      canCreateTemplates: true,
      canEditTemplates: true,
      canDeleteTemplates: true,
      canViewTemplates: true,
      canInviteMembers: true,
      canManageMembers: true,
      canManageOrganization: true,
      canViewMembers: true,
      canImportLeads: true,
      canExportLeads: true,
    } : {
      canCreateLeads: false,
      canEditLeads: false,
      canDeleteLeads: false,
      canViewLeads: false,
      canCreateTemplates: false,
      canEditTemplates: false,
      canDeleteTemplates: false,
      canViewTemplates: false,
      canInviteMembers: false,
      canManageMembers: false,
      canManageOrganization: false,
      canViewMembers: false,
      canImportLeads: false,
      canExportLeads: false,
      ...getPermissionsByRole(role || 'viewer')
    })
  };

  // Cache the result
  permissionsCache.set(cacheKey, {
    permissions,
    timestamp: Date.now()
  });

  return permissions;
}

function getPermissionsByRole(role: UserRole): Partial<UserPermissions> {
  switch (role) {
    case 'owner':
      return {
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: true,
        canViewLeads: true,
        canCreateTemplates: true,
        canEditTemplates: true,
        canDeleteTemplates: true,
        canViewTemplates: true,
        canInviteMembers: true,
        canManageMembers: true,
        canManageOrganization: true,
        canViewMembers: true,
        canImportLeads: true,
        canExportLeads: true,
      };
    
    case 'admin':
      return {
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: true,
        canViewLeads: true,
        canCreateTemplates: true,
        canEditTemplates: true,
        canDeleteTemplates: false, // Admins can't delete templates
        canViewTemplates: true,
        canInviteMembers: true,
        canManageMembers: true,
        canManageOrganization: false, // Admins can't manage org settings
        canViewMembers: true,
        canImportLeads: true,
        canExportLeads: true,
      };
    
    case 'member':
      return {
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: false,
        canViewLeads: true,
        canCreateTemplates: false,
        canEditTemplates: false,
        canDeleteTemplates: false,
        canViewTemplates: true,
        canInviteMembers: false,
        canManageMembers: false,
        canManageOrganization: false,
        canViewMembers: true,
        canImportLeads: false,
        canExportLeads: true,
      };
    
    case 'viewer':
    default:
      return {
        canCreateLeads: false,
        canEditLeads: false,
        canDeleteLeads: false,
        canViewLeads: true,
        canCreateTemplates: false,
        canEditTemplates: false,
        canDeleteTemplates: false,
        canViewTemplates: true,
        canInviteMembers: false,
        canManageMembers: false,
        canManageOrganization: false,
        canViewMembers: true,
        canImportLeads: false,
        canExportLeads: false,
      };
  }
}

// Clear cache when needed
export function clearPermissionsCache(userId?: string, orgId?: string) {
  if (userId && orgId) {
    permissionsCache.delete(getCacheKey(userId, orgId));
  } else {
    permissionsCache.clear();
  }
}
