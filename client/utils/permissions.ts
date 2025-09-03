// Optimized Permissions Utility with React Cache for Server Components
import { createClient } from '@/app/utils/supabase/server';
import { SessionCache } from './performance';
import { cache } from 'react';

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

// Optimized function using React cache for server components and session storage for client
export const getUserPermissions = cache(async (orgId: string, userId: string): Promise<UserPermissions> => {
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
    
    // Cache the default permissions to avoid repeated failed calls
    SessionCache.setPermissions(orgId, defaultPermissions, userId);
    return defaultPermissions;
  }

  const role = orgInfo.role as UserRole;
  const isOrgCreator = orgInfo.is_org_creator;

  const basePermissions = getPermissionsByRole(role || 'viewer');
  
  const permissions: UserPermissions = {
    role: role || 'viewer',
    isOrgCreator,
    // If organization creator, override all permissions, otherwise use role-based
    canCreateLeads: isOrgCreator ? true : basePermissions.canCreateLeads!,
    canEditLeads: isOrgCreator ? true : basePermissions.canEditLeads!,
    canDeleteLeads: isOrgCreator ? true : basePermissions.canDeleteLeads!,
    canViewLeads: isOrgCreator ? true : basePermissions.canViewLeads!,
    canCreateTemplates: isOrgCreator ? true : basePermissions.canCreateTemplates!,
    canEditTemplates: isOrgCreator ? true : basePermissions.canEditTemplates!,
    canDeleteTemplates: isOrgCreator ? true : basePermissions.canDeleteTemplates!,
    canViewTemplates: isOrgCreator ? true : basePermissions.canViewTemplates!,
    canInviteMembers: isOrgCreator ? true : basePermissions.canInviteMembers!,
    canManageMembers: isOrgCreator ? true : basePermissions.canManageMembers!,
    canManageOrganization: isOrgCreator ? true : basePermissions.canManageOrganization!,
    canViewMembers: isOrgCreator ? true : basePermissions.canViewMembers!,
    canImportLeads: isOrgCreator ? true : basePermissions.canImportLeads!,
    canExportLeads: isOrgCreator ? true : basePermissions.canExportLeads!,
  };

  // Cache the permissions in session storage (for client-side usage)
  if (typeof window !== 'undefined') {
    SessionCache.setPermissions(orgId, permissions, userId);
  }
  
  return permissions;
});

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

// Clear session cache when needed (e.g., on logout)
export function clearPermissionsCache() {
  SessionCache.clearSession();
}

// Client-side permissions function that uses session cache
export function getUserPermissionsClient(orgId: string): UserPermissions | null {
  return SessionCache.getPermissions(orgId) as UserPermissions | null;
}

// Hook for getting permissions (for client components)
export function usePermissions(orgId: string): UserPermissions | null {
  return SessionCache.getPermissions(orgId) as UserPermissions | null;
}
