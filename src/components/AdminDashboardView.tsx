import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  KeyRound,
  Activity,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Sparkles,
  Database,
  Lock,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  SystemUserRecord,
  AuditLogEntry,
  SystemMetrics,
  UserProfile,
  SystemRole,
} from '../types';
import {
  subscribeToAllUsers,
  subscribeToAuditLogs,
  updateUserRole,
  logAuditEvent,
} from '../firebase';

interface AdminDashboardViewProps {
  currentUser: any;
  totalReflectionsCount?: number;
  totalVaultsCount?: number;
  totalDigestsCount?: number;
  onClose?: () => void;
  onExitAdmin?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  totalReflectionsCount = 0,
  totalVaultsCount = 0,
  totalDigestsCount = 0,
  onClose,
  onExitAdmin,
}) => {
  const handleExit = onClose || onExitAdmin || (() => {});
  const [users, setUsers] = useState<SystemUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'security' | 'warning' | 'info'>('all');
  const [isUpdatingUser, setIsUpdatingUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'security_policies'>('users');

  // Real-time Firestore subscriptions for Admin
  useEffect(() => {
    const unsubUsers = subscribeToAllUsers((userList) => {
      setUsers(userList);
    });

    const unsubLogs = subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    // Log admin access event
    logAuditEvent(
      { uid: currentUser.uid, email: currentUser.email },
      'ADMIN_DASHBOARD_ACCESSED',
      `Admin console session opened by ${currentUser.email || currentUser.uid}`,
      'info'
    );

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [currentUser]);

  const handleToggleRole = async (targetUser: SystemUserRecord) => {
    const newRole: SystemRole = targetUser.role === 'admin' ? 'member' : 'admin';
    const confirmMsg = `Are you sure you want to change the role of ${targetUser.email} to '${newRole}'?`;
    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingUser(targetUser.uid);
    try {
      await updateUserRole(targetUser.uid, newRole, {
        uid: currentUser.uid,
        email: currentUser.email,
      });
    } catch (err: any) {
      alert(`Error updating role: ${err.message || 'Permission denied'}`);
    } finally {
      setIsUpdatingUser(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredLogs = auditLogs.filter((log) => {
    if (logFilter === 'all') return true;
    return log.severity === logFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50 overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 px-6 py-6 border-b border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-xl text-white">System Admin & RBAC Console</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Elevated Privileges
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Authenticated as <span className="text-amber-200 font-mono">{currentUser.email}</span> with Owner-Bound & Role-Based Permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors"
            >
              Exit to Journal
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
        {/* System Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">Registered Users</span>
              <span className="font-serif text-2xl font-bold text-stone-900">{users.length || 1}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-olive-50 text-olive-800">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">Journal Reflections</span>
              <span className="font-serif text-2xl font-bold text-stone-900">{totalReflectionsCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">Collaborative Vaults</span>
              <span className="font-serif text-2xl font-bold text-stone-900">{totalVaultsCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-800">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">Gemini Primary Model</span>
              <span className="font-mono text-xs font-bold text-emerald-700 block mt-1">gemini-3.6-flash</span>
              <span className="text-[10px] text-stone-400">4-Tier Resilient Fallback</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            User Roles & RBAC ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Security Audit Stream ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('security_policies')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'security_policies'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Firestore RBAC Rules Policy
          </button>
        </div>

        {/* Tab 1: User Roles & RBAC Directory */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter users by email or name..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-olive-600/30"
                />
              </div>
              <span className="text-xs text-stone-500 font-medium">
                {filteredUsers.length} user record{filteredUsers.length !== 1 ? 's' : ''} found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-100/80 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">UID Path</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">RBAC Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredUsers.map((user) => {
                    const isAdmin = user.role === 'admin';
                    const isSelf = user.uid === currentUser.uid;

                    return (
                      <tr key={user.uid} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-olive-700/10 text-olive-800 font-semibold flex items-center justify-center text-xs">
                              {(user.displayName || user.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                                {user.displayName || 'User'}
                                {isSelf && (
                                  <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 font-mono">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              isAdmin
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {isAdmin ? <ShieldAlert className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            {isAdmin ? 'Administrator' : 'Standard Member'}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-stone-500">
                          users/{user.uid.slice(0, 10)}...
                        </td>

                        <td className="px-4 py-3 text-stone-500">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleRole(user)}
                            disabled={isUpdatingUser === user.uid}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              isAdmin
                                ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
                                : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300'
                            }`}
                          >
                            {isUpdatingUser === user.uid
                              ? 'Updating...'
                              : isAdmin
                              ? 'Demote to Member'
                              : 'Promote to Admin'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Live Security Audit Log Stream */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden space-y-3">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-600">Filter Severity:</span>
                {(['all', 'security', 'warning', 'info'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors ${
                      logFilter === filter
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <span className="text-xs text-stone-500 font-mono">
                {filteredLogs.length} audit records in cache
              </span>
            </div>

            <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">No audit events recorded under this filter.</div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.severity === 'security'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : log.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-sky-100 text-sky-800 border border-sky-300'
                          }`}
                        >
                          {log.severity}
                        </span>
                        <span className="font-mono font-bold text-stone-800">{log.action}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-500 font-mono">{log.actorEmail}</span>
                      </div>
                      <p className="text-stone-700">{log.details}</p>
                    </div>
                    <span className="text-[11px] text-stone-400 whitespace-nowrap font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Firestore RBAC Security Policies Overview */}
        {activeTab === 'security_policies' && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">Firestore RBAC Security Architecture</h3>
              <p className="text-xs text-stone-500 mt-1">
                Active policy matrix enforcing owner-bound document isolation and dynamic administrative overrides.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-stone-900">
                  <Lock className="w-4 h-4 text-olive-700" />
                  <span>1. User-Bound Path Isolation</span>
                </div>
                <p className="text-stone-600">
                  Personal reflections at <code className="bg-stone-200 px-1 py-0.5 rounded">/users/{'{userId}'}/interactions</code> enforce strict rule:
                </p>
                <pre className="p-2.5 bg-stone-900 text-stone-100 rounded-lg text-[11px] font-mono overflow-x-auto">
                  allow read, write: if isOwner(userId) || isAdmin();
                </pre>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-stone-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>2. Dynamic Admin Lookup (`isAdmin()`)</span>
                </div>
                <p className="text-stone-600">
                  Evaluates role against <code className="bg-stone-200 px-1 py-0.5 rounded">users/{'{uid}'}.role == 'admin'</code>:
                </p>
                <pre className="p-2.5 bg-stone-900 text-stone-100 rounded-lg text-[11px] font-mono overflow-x-auto">
                  function isAdmin() {'{'}{'\n'}  return isSignedIn() && ({'\n'}    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'{'\n'}  );{'\n'}{'}'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
