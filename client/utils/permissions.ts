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

export function getRoleLevel(role: UserRole): number {
  switch (role) {
    case 'owner': return 1;
    case 'admin': return 2;
    case 'member': return 3;
    case 'viewer': return 4;
    default: return 5;
  }
}

export async function getUserRole(orgId: string, userId: string): Promise<UserRole | null> {
  const sb = await createClient();
  
  const { data: membership } = await sb
    .from('memberships')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .single();
  
  return membership?.role as UserRole || null;
}

export async function isOrganizationCreator(orgId: string, userId: string): Promise<boolean> {
  const sb = await createClient();
  
  const { data: org } = await sb
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single();
  
  return org?.owner_id === userId;
}

export async function getUserPermissions(orgId: string, userId: string): Promise<UserPermissions> {
  const role = await getUserRole(orgId, userId);
  const isOrgCreator = await isOrganizationCreator(orgId, userId);
  
  if (!role) {
    // No membership found - default to no permissions
    return {
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
  }

  // Organization creator has ultimate permissions
  if (isOrgCreator) {
    return {
      role,
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
      isOrgCreator: true,
    };
  }

  // Role-based permissions
  switch (role) {
    case 'owner':
      return {
        role,
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
        isOrgCreator: false,
      };
    
    case 'admin':
      return {
        role,
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
        canManageOrganization: false, // Admins can't manage org settings
        canViewMembers: true,
        canImportLeads: true,
        canExportLeads: true,
        isOrgCreator: false,
      };
    
    case 'member':
      return {
        role,
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteLeads: false, // Members can't delete leads
        canViewLeads: true,
        canCreateTemplates: false, // Members can't create templates
        canEditTemplates: false,
        canDeleteTemplates: false,
        canViewTemplates: true,
        canInviteMembers: false, // Members can't invite
        canManageMembers: false,
        canManageOrganization: false,
        canViewMembers: true,
        canImportLeads: true,
        canExportLeads: true,
        isOrgCreator: false,
      };
    
    case 'viewer':
      return {
        role,
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
        isOrgCreator: false,
      };
    
    default:
      // Fallback to viewer permissions
      return {
        role: 'viewer',
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
        isOrgCreator: false,
      };
  }
}

export function canPerformAction(userRole: UserRole, isOrgCreator: boolean, action: keyof UserPermissions): boolean {
  // Organization creator can do everything
  if (isOrgCreator) return true;
  
  const roleLevel = getRoleLevel(userRole);
  
  switch (action) {
    case 'canCreateLeads':
    case 'canEditLeads':
    case 'canViewLeads':
    case 'canImportLeads':
    case 'canExportLeads':
      return roleLevel <= 3; // owner, admin, member
    
    case 'canDeleteLeads':
      return roleLevel <= 2; // owner, admin only
    
    case 'canCreateTemplates':
    case 'canEditTemplates':
    case 'canDeleteTemplates':
      return roleLevel <= 2; // owner, admin only
    
    case 'canViewTemplates':
    case 'canViewMembers':
      return roleLevel <= 4; // everyone including viewer
    
    case 'canInviteMembers':
    case 'canManageMembers':
      return roleLevel <= 2; // owner, admin only
    
    case 'canManageOrganization':
      return roleLevel <= 1; // owner only
    
    default:
      return false;
  }
}
