import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import {
  Users, UserPlus, Shield, ChefHat, Loader2, AlertCircle, CheckCircle2,
  X, RefreshCw, Eye, EyeOff, Trash2
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  ADMIN: 'Manager',
  STAFF: 'Staff',
  DISABLED: 'Disabled',
};

const ROLE_COLORS: Record<string, string> = {
  MANAGER: 'bg-amber-100 text-amber-800 border-amber-200',
  ADMIN: 'bg-amber-100 text-amber-800 border-amber-200',
  STAFF: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DISABLED: 'bg-stone-100 text-stone-500 border-stone-200',
};

export const StaffManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'STAFF' | 'MANAGER'>('STAFF');
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Password reset modal
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStaffList();
      setStaff(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await api.createStaffAccount({ name: createName, email: createEmail, password: createPassword, role: createRole });
      setShowCreateModal(false);
      setCreateName(''); setCreateEmail(''); setCreatePassword(''); setCreateRole('STAFF');
      showSuccess(`Account created for ${createName}`);
      loadStaff();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleToggle = async (member: StaffMember) => {
    if (member.id === currentUser?.id) return;
    const newRole = (member.role === 'STAFF') ? 'MANAGER' : 'STAFF';
    try {
      await api.updateStaffAccount(member.id, { role: newRole });
      showSuccess(`${member.name} is now ${ROLE_LABELS[newRole] || newRole}`);
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleDeactivate = async (member: StaffMember) => {
    if (member.id === currentUser?.id) return;
    if (!confirm(`Deactivate ${member.name}? They will no longer be able to log in.`)) return;
    try {
      await api.deactivateStaffAccount(member.id);
      showSuccess(`${member.name}'s account has been deactivated`);
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate account');
    }
  };

  const openResetModal = (member: StaffMember) => {
    setResetUserId(member.id);
    setResetUserName(member.name);
    setNewPassword('');
    setResetError(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    setResetError(null);
    setResetting(true);
    try {
      await api.resetStaffPassword(resetUserId, newPassword);
      setResetUserId(null);
      showSuccess(`Password updated for ${resetUserName}`);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleReactivate = async (member: StaffMember) => {
    try {
      await api.updateStaffAccount(member.id, { role: 'STAFF' });
      showSuccess(`${member.name}'s account has been reactivated`);
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-300 pb-4">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">
            Staff Management
          </h1>
          <p className="text-xs text-charcoal-600 font-normal mt-0.5">
            Manage staff accounts, roles, and access credentials
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="touch-press btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-subtle"
        >
          <UserPlus className="w-3.5 h-3.5 text-white" />
          <span className="text-white">Add staff member</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Staff Table */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-charcoal-700 mx-auto mb-2" />
          <p className="text-xs text-charcoal-500">Loading staff roster...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-cream-300 p-12 text-center">
          <Users className="w-8 h-8 text-charcoal-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-charcoal-700">No staff members yet</p>
          <p className="text-xs text-charcoal-500 mt-1">Create your first staff account to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cream-300 shadow-subtle overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-cream-300 bg-cream-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-600">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-600">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-600">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-600">Added</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-charcoal-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {staff.map((member) => {
                const isCurrentUser = member.id === currentUser?.id;
                const isDisabled = member.role === 'DISABLED';
                return (
                  <tr key={member.id} className={`${isDisabled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-charcoal-100 flex items-center justify-center text-charcoal-700 font-bold text-[11px]">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-charcoal-900">{member.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-charcoal-500 font-medium bg-cream-100 px-1.5 py-0.5 rounded border border-cream-300">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-charcoal-600">{member.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ROLE_COLORS[member.role] || 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                        {member.role === 'STAFF' ? <ChefHat className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-charcoal-500">
                      {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isCurrentUser && !isDisabled && (
                          <>
                            <button
                              type="button"
                              onClick={() => openResetModal(member)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg text-charcoal-500 hover:bg-cream-100 hover:text-charcoal-900 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(member)}
                              title={member.role === 'STAFF' ? 'Promote to Manager' : 'Demote to Staff'}
                              className="p-1.5 rounded-lg text-charcoal-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeactivate(member)}
                              title="Deactivate Account"
                              className="p-1.5 rounded-lg text-charcoal-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {isDisabled && (
                          <button
                            type="button"
                            onClick={() => handleReactivate(member)}
                            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-50 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-cream-300">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif font-bold text-charcoal-900 text-lg">Add staff member</h2>
              <button onClick={() => setShowCreateModal(false)} className="touch-press w-9 h-9 flex items-center justify-center rounded-xl text-charcoal-500 hover:bg-cream-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Full name</label>
                <input
                  required value={createName} onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. Arjun Kumar"
                  className="w-full px-3.5 py-2.5 border border-cream-300 rounded-xl text-base sm:text-xs text-charcoal-900 focus:border-charcoal-800 outline-none bg-cream-50/50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Email address</label>
                <input
                  type="email" required value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                  placeholder="arjun@cafe.com"
                  className="w-full px-3.5 py-2.5 border border-cream-300 rounded-xl text-base sm:text-xs text-charcoal-900 focus:border-charcoal-800 outline-none bg-cream-50/50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePw ? 'text' : 'password'} required value={createPassword} onChange={e => setCreatePassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 border border-cream-300 rounded-xl text-base sm:text-xs text-charcoal-900 focus:border-charcoal-800 outline-none bg-cream-50/50 focus:bg-white transition-colors"
                  />
                  <button type="button" onClick={() => setShowCreatePw(!showCreatePw)} className="w-9 h-9 flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-charcoal-400">
                    {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(['STAFF', 'MANAGER'] as const).map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => setCreateRole(r)}
                      className={`touch-press flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-semibold border transition-all ${createRole === r
                        ? r === 'MANAGER' ? 'bg-amber-600 text-white border-amber-600' : 'bg-charcoal-900 text-white border-charcoal-900'
                        : 'bg-cream-50 text-charcoal-700 border-cream-300 hover:border-charcoal-400'}`}
                    >
                      {r === 'MANAGER' ? 'Manager' : 'Staff'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-charcoal-500 mt-1.5">
                  {createRole === 'MANAGER' ? 'Full management access and financial analytics' : 'Operational access: live orders and waiter calls'}
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="touch-press flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-semibold border border-cream-300 text-charcoal-700 hover:bg-cream-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="touch-press flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span className="text-white">Create account</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-cream-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-bold text-charcoal-900 text-lg">Reset password</h2>
              <button onClick={() => setResetUserId(null)} className="touch-press w-9 h-9 flex items-center justify-center rounded-xl text-charcoal-500 hover:bg-cream-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-charcoal-600 mb-4">Set a new password for <strong>{resetUserName}</strong>.</p>

            {resetError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 border border-cream-300 rounded-xl text-base sm:text-xs text-charcoal-900 focus:border-charcoal-800 outline-none bg-cream-50/50 focus:bg-white transition-colors"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="w-9 h-9 flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-charcoal-400">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setResetUserId(null)} className="touch-press flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-semibold border border-cream-300 text-charcoal-700 hover:bg-cream-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetting} className="touch-press flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span className="text-white">Update password</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
