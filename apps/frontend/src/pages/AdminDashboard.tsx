import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import {
  Users, HardDrive, Share2, FileText, Search,
  ShieldCheck, ShieldOff, Trash2,
  RefreshCw, UserX, UserCheck, ArrowLeft, Loader2,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import api from '../lib/api';
import { formatBytes } from '../lib/utils';

interface DashboardStats {
  totalUsers: number;
  totalFiles: number;
  storageUsedFormatted: string;
  activeShares: number;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  storage_used: number;
  storage_limit: number;
  created_at: string;
  last_login: string | null;
  telegram_status: string;
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="card-elevated p-6 flex items-center gap-5"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data);
    } catch {
      toast.show('Failed to load dashboard stats', 'error');
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: 20, search },
      });
      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
    } catch {
      toast.show('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchDashboard();
    fetchUsers();
  }, [fetchDashboard, fetchUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchUsers()]);
    setRefreshing(false);
  };

  const handleAction = async (userId: string, action: string, label: string) => {
    try {
      if (action === 'delete') {
        await api.delete(`/admin/users/${userId}`);
      } else {
        await api.put(`/admin/users/${userId}/${action}`);
      }
      toast.show(`${label} successful`, 'success');
      fetchUsers();
      fetchDashboard();
    } catch (err: any) {
      toast.show(err.response?.data?.message || `${label} failed`, 'error');
    }
  };

  if (user?.role !== 'admin') return <Navigate to="/" />;

  const totalPages = Math.ceil(totalUsers / 20);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 px-8 h-20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs text-zinc-500">Platform management &amp; analytics</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-violet-400" />}
            label="Total Users"
            value={stats?.totalUsers ?? '—'}
            accent="bg-violet-500/10"
          />
          <StatCard
            icon={<FileText className="w-5 h-5 text-indigo-400" />}
            label="Total Files"
            value={stats?.totalFiles ?? '—'}
            accent="bg-indigo-500/10"
          />
          <StatCard
            icon={<HardDrive className="w-5 h-5 text-emerald-400" />}
            label="Storage Used"
            value={stats?.storageUsedFormatted ?? '—'}
            accent="bg-emerald-500/10"
          />
          <StatCard
            icon={<Share2 className="w-5 h-5 text-amber-400" />}
            label="Active Shares"
            value={stats?.activeShares ?? '—'}
            accent="bg-amber-500/10"
          />
        </div>

        {/* Users Table */}
        <div className="card-elevated overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Users</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{totalUsers} total accounts</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="input-field pl-10 w-64"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  {['User', 'Email', 'Role', 'Status', 'Storage', 'Telegram', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <Loader2 className="w-6 h-6 border-0 animate-spin text-violet-500 mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-zinc-600 text-sm">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-600/30 flex items-center justify-center shrink-0 text-xs font-semibold text-violet-300">
                            {(u.full_name || u.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{u.full_name || u.username}</p>
                            <p className="text-xs text-zinc-500">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-6 py-4 text-sm text-zinc-400">{u.email}</td>
                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${
                          u.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-white/5'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      {/* Storage */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-zinc-300">{formatBytes(u.storage_used || 0)}</p>
                          <p className="text-xs text-zinc-600">of {formatBytes(u.storage_limit || 5368709120)}</p>
                        </div>
                      </td>
                      {/* Telegram */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${
                          u.telegram_status === 'connected'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-zinc-800 text-zinc-500 border border-white/5'
                        }`}>
                          {u.telegram_status === 'connected' ? '✓' : '—'} {u.telegram_status || 'disconnected'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {u.is_active ? (
                            <button
                              onClick={() => handleAction(u.id, 'disable', 'Disable')}
                              className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
                              title="Disable user"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(u.id, 'enable', 'Enable')}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                              title="Enable user"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {u.role === 'user' ? (
                            <button
                              onClick={() => handleAction(u.id, 'promote', 'Promote')}
                              className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-lg transition"
                              title="Promote to admin"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(u.id, 'demote', 'Demote')}
                              className="p-1.5 text-zinc-400 hover:bg-white/5 rounded-lg transition"
                              title="Demote to user"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(u.id, 'delete', 'Delete')}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalUsers > 20 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <p className="text-xs text-zinc-500">
                Page <span className="text-zinc-300 font-medium">{page}</span> of{' '}
                <span className="text-zinc-300 font-medium">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
