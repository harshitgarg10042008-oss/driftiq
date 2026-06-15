import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { ChevronLeft, User, Shield, Lock, HardDrive, Smartphone, Copy, Check} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { formatBytes } from '../lib/utils';

export default function Settings() {
  const { user } = useAuthStore();
  const toast = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [stats, setStats] = useState<{ storageUsed: number, storageLimit: number } | null>(null);
  
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/files/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats');
      }
    };
    fetchStats();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.show('New passwords do not match', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.show('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsLoadingCode(true);
    try {
      const { data } = await api.get('/users/telegram-link-code');
      setTelegramCode(data.code);
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to generate code', 'error');
    } finally {
      setIsLoadingCode(false);
    }
  };

  const copyToClipboard = () => {
    if (!telegramCode) return;
    navigator.clipboard.writeText(`/link ${telegramCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="h-20 flex items-center px-8 shrink-0 border-b border-white/5 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
          <Link to="/" className="flex items-center text-zinc-400 hover:text-zinc-100 transition mr-4">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </Link>
          <h1 className="text-xl font-semibold">Account Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-8">
            
            {/* Profile Section */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center bg-white/[0.01]">
                <User className="w-5 h-5 mr-3 text-violet-400" />
                <h2 className="text-lg font-medium">Profile Information</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2">Full Name</label>
                    <div className="px-4 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-300 font-medium">
                      {user?.full_name || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2">Username</label>
                    <div className="px-4 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-300 font-medium">
                      @{user?.username}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-500 mb-2">Email Address</label>
                    <div className="px-4 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-300 font-medium flex justify-between items-center">
                      <span>{user?.email}</span>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Storage Section */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center bg-white/[0.01]">
                <HardDrive className="w-5 h-5 mr-3 text-violet-400" />
                <h2 className="text-lg font-medium">Storage Usage</h2>
              </div>
              <div className="p-6">
                {stats ? (
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <span className="text-3xl font-bold text-zinc-100">{formatBytes(stats.storageUsed)}</span>
                        <span className="text-zinc-500 ml-2 font-medium">used of {formatBytes(stats.storageLimit)}</span>
                      </div>
                      <span className="text-sm font-medium text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                        {((stats.storageUsed / stats.storageLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, (stats.storageUsed / stats.storageLimit) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Telegram Link Section */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center bg-white/[0.01]">
                <Smartphone className="w-5 h-5 mr-3 text-violet-400" />
                <h2 className="text-lg font-medium">Telegram Storage Bot</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Connect DriftIQ to your Telegram account. Once linked, any files you send to the DriftIQ bot will be instantly saved to your cloud drive and synced in real-time.
                </p>

                {!telegramCode ? (
                  <button 
                    onClick={handleGenerateCode}
                    disabled={isLoadingCode}
                    className="flex items-center px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition text-sm font-medium disabled:opacity-50"
                  >
                    {isLoadingCode ? 'Generating...' : 'Generate Connection Link'}
                  </button>
                ) : (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-violet-300 mb-3">Follow these steps to link your account:</h3>
                    <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-2 mb-5 font-medium">
                      <li>Open the DriftIQ Telegram Bot</li>
                      <li>Send the following command to the bot:</li>
                    </ol>
                    <div className="flex items-center space-x-3 bg-zinc-950 p-3 rounded-lg border border-white/10">
                      <code className="text-violet-400 font-mono text-lg flex-1 pl-2">/link {telegramCode}</code>
                      <button 
                        onClick={copyToClipboard}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition text-zinc-400 hover:text-zinc-100"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-4 italic">This code will expire in 10 minutes.</p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Security Section */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center bg-white/[0.01]">
                <Shield className="w-5 h-5 mr-3 text-violet-400" />
                <h2 className="text-lg font-medium">Security & Password</h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Current Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="password" 
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-violet-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-violet-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-violet-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition text-sm font-medium mt-2 disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </motion.section>

          </div>
        </div>
      </div>
    </div>
  );
}
