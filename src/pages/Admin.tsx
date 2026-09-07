import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService, DEFAULT_USER_PERMISSIONS } from '../services/authService';
import { AuthorizedUser, UserPermissions } from '../types';
import { AdminLogin } from '../components/AdminLogin';
import { FirestorePermissionBanner } from '../components/FirestorePermissionBanner';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Calendar,
  UserX,
  Sliders,
  Sparkles,
  Briefcase,
  FileCheck2,
  Lock,
} from 'lucide-react';

interface AdminProps {
  onNavigateCandidate?: () => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigateCandidate }) => {
  const { user, isAdmin } = useAuth();
  const [explicitLogout, setExplicitLogout] = useState(false);
  const [adminSession, setAdminSession] = useState<{ isAuthenticated: boolean; username: string }>(
    authService.getAdminSession()
  );

  // When explicitLogout is true, force login prompt even if firebase auth is active
  const isAdminLoggedIn = !explicitLogout && (adminSession.isAuthenticated || isAdmin);
  const adminUsername = adminSession.username || (isAdmin ? user?.email || 'admin' : 'admin');

  // User roster state
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);
  const [userToEditPermissions, setUserToEditPermissions] = useState<AuthorizedUser | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>({
    resumeBuilder: true,
    jobs: true,
    applications: true,
  });

  const [editingPermissions, setEditingPermissions] = useState<UserPermissions>({
    resumeBuilder: true,
    jobs: true,
    applications: true,
  });

  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchUsers();
    }
  }, [isAdminLoggedIn]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const list = await authService.getAuthorizedUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setAddUserError('User email address is required.');
      return;
    }

    try {
      setSubmitting(true);
      setAddUserError(null);
      await authService.addAuthorizedUser(newEmail.trim(), newPhone.trim(), newPermissions);
      setNewEmail('');
      setNewPhone('');
      setNewPermissions({ resumeBuilder: true, jobs: true, applications: true });
      setShowAddUserModal(false);
      setActionNotice(`User "${newEmail.trim().toLowerCase()}" added with custom feature permissions.`);
      setTimeout(() => setActionNotice(null), 4000);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error adding user:', err);
      setAddUserError(err?.message || 'Failed to add user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditPermissions) return;

    try {
      setSubmitting(true);
      await authService.updateUserPermissions(userToEditPermissions.id, editingPermissions);
      setActionNotice(`Feature permissions updated for ${userToEditPermissions.email}.`);
      setTimeout(() => setActionNotice(null), 4000);
      setUserToEditPermissions(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error updating permissions:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userItem: AuthorizedUser) => {
    const nextStatus = userItem.status === 'active' ? 'disabled' : 'active';
    try {
      await authService.updateAuthorizedUserStatus(userItem.id, nextStatus);
      setActionNotice(
        `User "${userItem.email}" marked as ${nextStatus === 'active' ? 'Active' : 'Disabled'}.`
      );
      setTimeout(() => setActionNotice(null), 4000);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setSubmitting(true);
      await authService.removeAuthorizedUser(userToDelete.id);
      setActionNotice(`User "${userToDelete.email}" deleted successfully. Access revoked.`);
      setTimeout(() => setActionNotice(null), 4000);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to remove user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    await authService.clearAdminSession();
    setAdminSession({ isAuthenticated: false, username: '' });
    setExplicitLogout(true);
  };

  // If not authenticated as Admin, show clean full-page Admin Login screen
  if (!isAdminLoggedIn) {
    return (
      <AdminLogin
        onLoginSuccess={username => {
          authService.setAdminSession(username);
          setExplicitLogout(false);
          setAdminSession({ isAuthenticated: true, username });
        }}
        onNavigateCandidate={onNavigateCandidate}
      />
    );
  }

  // Filter users by search query
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.phone && u.phone.toLowerCase().includes(q));
  });

  const activeCount = users.filter(u => u.status === 'active').length;
  const disabledCount = users.filter(u => u.status === 'disabled').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <FirestorePermissionBanner />

      {/* Admin Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center font-bold">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-wide">Administrator Console</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Signed in as: {adminUsername}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateCandidate && (
            <button
              onClick={onNavigateCandidate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Candidate Portal</span>
            </button>
          )}

          <button
            id="admin-logout-btn"
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700 transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Logout</span>
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scope Notice */}
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-3 shadow-xs">
        <Users className="w-4 h-4 text-neutral-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-900">Invite-Only Roster & Feature Access Control</p>
          <p className="leading-relaxed">
            Only users in this roster can log in. Users not added will be strictly blocked. You can grant access to <strong>all features</strong> or restrict candidates to <strong>specific features</strong> (e.g., only Resume Builder).
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Total Authorized Users</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">{users.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Active Users</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Disabled Users</span>
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-500 mt-2">{disabledCount}</p>
        </div>
      </div>

      {/* Users Directory Card */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Authorized Users Directory</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Manage allowed candidate emails and fine-tune which modules each user can access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-refresh-users-btn"
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
              title="Refresh users"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="admin-add-user-btn"
              onClick={() => {
                setNewEmail('');
                setNewPhone('');
                setNewPermissions({ resumeBuilder: true, jobs: true, applications: true });
                setAddUserError(null);
                setShowAddUserModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by user email or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users Table */}
        {loadingUsers ? (
          <div className="py-16 text-center text-xs text-neutral-500">Loading user directory...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">
              {searchQuery ? 'No matching users found' : 'No users added yet'}
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Click "Add User" above to grant candidate access to the portal.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Allowed Features</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Added Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map(u => {
                  const userPerms = u.permissions || DEFAULT_USER_PERMISSIONS;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-semibold text-xs shrink-0">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 text-xs">{u.email}</p>
                            <span className="text-[11px] text-neutral-400">
                              {u.phone ? u.phone : 'Google OAuth'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Feature Permissions Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {userPerms.resumeBuilder ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              <Sparkles className="w-3 h-3" />
                              Resume
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 text-[11px] font-normal border border-neutral-200">
                              <Lock className="w-3 h-3" />
                              Resume
                            </span>
                          )}

                          {userPerms.jobs ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                              <Briefcase className="w-3 h-3" />
                              Jobs
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 text-[11px] font-normal border border-neutral-200">
                              <Lock className="w-3 h-3" />
                              Jobs
                            </span>
                          )}

                          {userPerms.applications ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200">
                              <FileCheck2 className="w-3 h-3" />
                              Apply
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 text-[11px] font-normal border border-neutral-200">
                              <Lock className="w-3 h-3" />
                              Apply
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200'
                          }`}
                          title="Click to toggle active/disabled status"
                        >
                          {u.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-neutral-500" />
                          )}
                          <span>{u.status === 'active' ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      <td className="px-6 py-4 text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span>{new Date(u.addedAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setUserToEditPermissions(u);
                              setEditingPermissions(u.permissions || DEFAULT_USER_PERMISSIONS);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit feature access"
                          >
                            <Sliders className="w-3.5 h-3.5 text-neutral-600" />
                            <span>Access</span>
                          </button>

                          <button
                            id={`delete-user-btn-${u.id}`}
                            onClick={() => setUserToDelete(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete user from portal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add User with Feature Permissions */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Add Authorized User</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Authorize a candidate and specify which features they can access.
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addUserError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addUserError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  User Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    id="user-email-input"
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    id="user-phone-input"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Feature Access Checkboxes */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <label className="block text-xs font-bold text-neutral-900">
                  Feature Permissions (Grant / Revoke)
                </label>
                <p className="text-[11px] text-neutral-500">
                  Select which modules this user can access. Unchecked features will be locked.
                </p>

                <div className="space-y-2 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2.5 text-xs text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.resumeBuilder}
                      onChange={e =>
                        setNewPermissions(prev => ({ ...prev, resumeBuilder: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-medium">Resume Builder</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.jobs}
                      onChange={e =>
                        setNewPermissions(prev => ({ ...prev, jobs: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium">Job Search Portal</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.applications}
                      onChange={e =>
                        setNewPermissions(prev => ({ ...prev, applications: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-medium">Applications Tracker & Tailor Flow</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-add-user-btn"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Adding...' : 'Add User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Permissions */}
      {userToEditPermissions && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Manage Feature Access</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Adjust enabled modules for <strong className="text-neutral-900">{userToEditPermissions.email}</strong>
                </p>
              </div>
              <button
                onClick={() => setUserToEditPermissions(null)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-2.5 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-semibold text-neutral-900">Resume Builder</p>
                      <p className="text-[10px] text-neutral-500">Tailor resumes matching company JD</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPermissions.resumeBuilder}
                    onChange={e =>
                      setEditingPermissions(prev => ({ ...prev, resumeBuilder: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-semibold text-neutral-900">Job Search Portal</p>
                      <p className="text-[10px] text-neutral-500">Live internet jobs & search</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPermissions.jobs}
                    onChange={e =>
                      setEditingPermissions(prev => ({ ...prev, jobs: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="font-semibold text-neutral-900">Applications Tracker</p>
                      <p className="text-[10px] text-neutral-500">Application history & tailor apply flow</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPermissions.applications}
                    onChange={e =>
                      setEditingPermissions(prev => ({ ...prev, applications: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setUserToEditPermissions(null)}
                  disabled={submitting}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <span>{submitting ? 'Saving...' : 'Save Permissions'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">Delete User Access?</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Are you sure you want to delete user{' '}
                  <span className="font-semibold text-neutral-900">{userToDelete.email}</span>?
                  They will be immediately blocked from signing into the portal with Google.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={submitting}
                className="px-3.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-user-btn"
                onClick={handleConfirmDeleteUser}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Deleting...' : 'Confirm Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
