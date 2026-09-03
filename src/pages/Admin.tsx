import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { AuthorizedUser } from '../types';
import { AdminLogin } from '../components/AdminLogin';
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
} from 'lucide-react';

interface AdminProps {
  onNavigateCandidate?: () => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigateCandidate }) => {
  const { user, isAdmin } = useAuth();
  const [adminSession, setAdminSession] = useState<{ isAuthenticated: boolean; username: string }>(
    authService.getAdminSession()
  );
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const isAdminLoggedIn = adminSession.isAuthenticated || isAdmin;
  const adminUsername = adminSession.username || (isAdmin ? (user?.email || 'admin') : 'admin');

  // Client roster state
  const [clients, setClients] = useState<AuthorizedUser[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<AuthorizedUser | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchClients();
    }
  }, [isAdminLoggedIn]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const list = await authService.getAuthorizedUsers();
      setClients(list);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleOnboardClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setOnboardError('Client email address is required.');
      return;
    }

    try {
      setSubmitting(true);
      setOnboardError(null);
      await authService.addAuthorizedUser(newEmail.trim(), newPhone.trim());
      setNewEmail('');
      setNewPhone('');
      setShowOnboardModal(false);
      setActionNotice(`Client "${newEmail.trim().toLowerCase()}" successfully onboarded.`);
      setTimeout(() => setActionNotice(null), 4000);
      await fetchClients();
    } catch (err: any) {
      console.error('Error onboarding client:', err);
      setOnboardError(err?.message || 'Failed to onboard client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (client: AuthorizedUser) => {
    const nextStatus = client.status === 'active' ? 'disabled' : 'active';
    try {
      await authService.updateAuthorizedUserStatus(client.id, nextStatus);
      setActionNotice(
        `Client "${client.email}" marked as ${nextStatus === 'active' ? 'Active' : 'Disabled'}.`
      );
      setTimeout(() => setActionNotice(null), 4000);
      await fetchClients();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      setSubmitting(true);
      await authService.removeAuthorizedUser(clientToDelete.id);
      setActionNotice(`Client "${clientToDelete.email}" deleted successfully.`);
      setTimeout(() => setActionNotice(null), 4000);
      setClientToDelete(null);
      await fetchClients();
    } catch (err) {
      console.error('Failed to remove client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLogout = () => {
    authService.clearAdminSession();
    setAdminSession({ isAuthenticated: false, username: '' });
  };

  const handleConnectGoogleAdmin = async () => {
    setConnectingGoogle(true);
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in error:', err);
    } finally {
      setConnectingGoogle(false);
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <AdminLogin onLoginSuccess={() => setAdminSession(authService.getAdminSession())} />

        <div className="mt-6 pt-6 border-t border-neutral-200 text-center space-y-3">
          <p className="text-xs text-neutral-500">Or authenticate using an authorized Google Admin email</p>
          <button
            onClick={handleConnectGoogleAdmin}
            disabled={connectingGoogle}
            className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Shield className="w-4 h-4 text-neutral-700" />
            <span>{connectingGoogle ? 'Connecting...' : 'Sign in as Google Admin'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter clients by search query
  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.email.toLowerCase().includes(q) || (c.phone && c.phone.toLowerCase().includes(q));
  });

  const activeCount = clients.filter(c => c.status === 'active').length;
  const disabledCount = clients.filter(c => c.status === 'disabled').length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Admin Navigation Bar */}
      <div className="bg-neutral-900 text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center border border-neutral-700">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-wide">Client Onboarding Admin</span>
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Candidate Portal</span>
            </button>
          )}

          <button
            id="admin-logout-btn"
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Logout</span>
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scope Clarification Notice */}
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-3">
        <Users className="w-4 h-4 text-neutral-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-900">Dedicated Client Management Scope</p>
          <p className="leading-relaxed">
            As an administrator, your responsibility is strictly to <strong>onboard clients</strong> and{' '}
            <strong>delete/deactivate clients</strong>. Job postings are not managed here; active internet jobs
            are dynamically aggregated and searched live from external job networks (Indeed, LinkedIn,
            Glassdoor, and official Company Portals) for candidates.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Total Onboarded Clients</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">{clients.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Active Clients</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Disabled Clients</span>
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-500 mt-2">{disabledCount}</p>
        </div>
      </div>

      {/* Client Roster Card */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Client Directory</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Only onboarded clients can authenticate into the portal with Google. Emails are strictly lowercase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-refresh-clients-btn"
              onClick={fetchClients}
              disabled={loadingClients}
              className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
              title="Refresh roster"
            >
              <RefreshCw className={`w-4 h-4 ${loadingClients ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="admin-onboard-client-btn"
              onClick={() => {
                setNewEmail('');
                setNewPhone('');
                setOnboardError(null);
                setShowOnboardModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard New Client</span>
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by client email or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Clients Table */}
        {loadingClients ? (
          <div className="py-16 text-center text-xs text-neutral-500">Loading client directory...</div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">
              {searchQuery ? 'No matching clients found' : 'No clients onboarded yet'}
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Click "Onboard New Client" above to grant candidate access to the portal.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Phone</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Onboarded Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-semibold text-xs shrink-0">
                          {client.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 text-xs">{client.email}</p>
                          <span className="text-[11px] text-neutral-400">Google OAuth Permitted</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {client.phone ? (
                        <div className="flex items-center gap-1 text-neutral-700">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{client.phone}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(client)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          client.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200'
                        }`}
                        title="Click to toggle active/disabled status"
                      >
                        {client.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-neutral-500" />
                        )}
                        <span>{client.status === 'active' ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        <span>{new Date(client.addedAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        id={`delete-client-btn-${client.id}`}
                        onClick={() => setClientToDelete(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                        title="Delete client from portal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Client</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Onboard Client */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Onboard New Client</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Add client email to the authorized roster so they can sign in to the candidate portal.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            {onboardError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Client Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    id="client-email-input"
                    type="email"
                    placeholder="client@example.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Normalized to lowercase automatically for case-insensitive verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    id="client-phone-input"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-onboard-client-btn"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Onboarding...' : 'Onboard Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Client */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">Delete Client Access?</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Are you sure you want to delete client{' '}
                  <span className="font-semibold text-neutral-900">{clientToDelete.email}</span>?
                  They will no longer be authorized to sign in to the portal.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={submitting}
                className="px-3.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-client-btn"
                onClick={handleConfirmDeleteClient}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Deleting...' : 'Confirm Delete Client'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
