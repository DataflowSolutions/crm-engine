'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMember, updateMemberRole, removeMember, revokeInvite, resendInvite } from './actions';

// Simple toast hook for this component
function useSimpleToast() {
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success' | 'error'}>>([]);
  
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm rounded-lg p-4 shadow-lg transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return { addToast, ToastContainer };
}

type User = {
  id: string;
  email: string;
  full_name: string | null;
} | null;

type Membership = {
  id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'invited' | 'accepted' | 'suspended' | 'left';
  invited_email: string | null;
  invited_token: string | null;
  invited_at: string | null;
  created_at: string | null;
  user_id: string | null;
  users: User | User[]; // Support both single object and array from Supabase
};

type Org = {
  id: string;
  name: string | null;
  slug: string | null;
};

type Props = {
  org: Org;
  memberships: Membership[];
  locale: string;
};

export default function MembersClient({ org, memberships, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [copyableLink, setCopyableLink] = useState<string | null>(null);
  const { addToast, ToastContainer } = useSimpleToast();

  // Helper function to get user data (handle both single object and array)
  const getUserData = (member: Membership): User => {
    if (!member.users) return null;
    if (Array.isArray(member.users)) {
      return member.users.length > 0 ? member.users[0] : null;
    }
    return member.users;
  };

  const acceptedMembers = memberships.filter(m => m.status === 'accepted');
  const pendingInvites = memberships.filter(m => m.status === 'invited');

  const handleInvite = async () => {
    if (!inviteEmail) {
      addToast('Please enter an email address', 'error');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    
    startTransition(async () => {
      try {
        const { token } = await inviteMember(org.id, inviteEmail, inviteRole);
        const origin = window.location.origin;
        const link = `${origin}/${locale}/accept-invite?token=${token}`;
        setCopyableLink(link);
        setInviteEmail('');
        addToast(`Invitation sent to ${inviteEmail}`, 'success');
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send invite';
        addToast(message, 'error');
      }
    });
  };

  const handleRoleChange = async (membershipId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') => {
    startTransition(async () => {
      try {
        await updateMemberRole(membershipId, newRole);
        addToast('Member role updated successfully', 'success');
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update role';
        addToast(message, 'error');
      }
    });
  };

  const handleRemove = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    startTransition(async () => {
      try {
        await removeMember(membershipId);
        addToast('Member removed successfully', 'success');
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove member';
        addToast(message, 'error');
      }
    });
  };

  const handleRevoke = async (membershipId: string) => {
    startTransition(async () => {
      try {
        await revokeInvite(membershipId);
        addToast('Invitation revoked successfully', 'success');
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to revoke invite';
        addToast(message, 'error');
      }
    });
  };

  const handleResend = async (membershipId: string) => {
    startTransition(async () => {
      try {
        const { invited_token } = await resendInvite(membershipId);
        const origin = window.location.origin;
        const link = `${origin}/${locale}/accept-invite?token=${invited_token}`;
        setCopyableLink(link);
        addToast('Invitation link refreshed', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resend invite';
        addToast(message, 'error');
      }
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Members - {org.name}</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          disabled={isPending}
        >
          Invite Member
        </button>
      </div>

      {/* Members Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Members ({acceptedMembers.length})</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {acceptedMembers.map((member) => {
                const userData = getUserData(member);
                return (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {userData?.full_name || userData?.email || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">{userData?.email || 'No email'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as 'owner' | 'admin' | 'member' | 'viewer')}
                      className="text-sm border rounded px-2 py-1"
                      disabled={isPending}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isPending}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Pending Invites ({pendingInvites.length})</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingInvites.map((invite) => (
                <tr key={invite.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invite.invited_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="capitalize">{invite.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invite.invited_at ? new Date(invite.invited_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleResend(invite.id)}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={isPending}
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isPending}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isPending}
                >
                  <option value="admin">Admin - Can manage members and organization settings</option>
                  <option value="member">Member - Can access and edit organization data</option>
                  <option value="viewer">Viewer - Can only view organization data</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setCopyableLink(null);
                  setInviteEmail('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </button>
            </div>
            
            {copyableLink && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 mb-2">Invite link created:</p>
                <div className="flex">
                  <input
                    type="text"
                    value={copyableLink}
                    readOnly
                    className="flex-1 text-xs bg-white border border-green-300 rounded-l-md px-2 py-1"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(copyableLink)}
                    className="bg-green-600 text-white px-3 py-1 rounded-r-md text-xs hover:bg-green-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <ToastContainer />
    </div>
  );
}
