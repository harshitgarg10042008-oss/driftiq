import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Login() {
  const [view, setView] = useState<'login' | 'forgot' | 'forgot-success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth({ id: 'temp', email, role: 'user' }, data.access_token, data.refresh_token);
      const me = await api.get('/auth/me');
      setAuth(me.data, data.access_token, data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email });
      setView('forgot-success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-zinc-950">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-start justify-end p-16 overflow-hidden">
        {/* Subtle radial gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-zinc-950 to-zinc-950" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg" />
            <span className="text-xl font-bold text-zinc-100 tracking-tight">DriftIQ</span>
          </div>
          <h2 className="text-4xl font-bold text-zinc-100 tracking-tight leading-snug mb-4">
            Your files,<br />everywhere you are.
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
            Secure cloud storage with real-time Telegram sync. Upload once, access anywhere.
          </p>

          <div className="mt-12 flex items-center gap-6">
            {[
              { value: '5 GB', label: 'Free storage' },
              { value: '256-bit', label: 'Encryption' },
              { value: '99.9%', label: 'Uptime SLA' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-zinc-100 tracking-tight">{stat.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg" />
            <span className="text-lg font-bold text-zinc-100 tracking-tight">DriftIQ</span>
          </div>

          {view === 'login' && (
            <>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Sign in</h1>
              <p className="text-sm text-zinc-500 mb-8">Welcome back. Enter your credentials to continue.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="input-field pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Password</label>
                    <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="input-field pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition">
                  Create one free
                </Link>
              </p>
            </>
          )}

          {view === 'forgot' && (
            <>
              <button type="button" onClick={() => { setView('login'); setError(''); }} className="flex items-center text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
              </button>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Reset Password</h1>
              <p className="text-sm text-zinc-500 mb-8">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="input-field pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {view === 'forgot-success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">Check your email</h1>
              <p className="text-sm text-zinc-500 mb-8">
                If an account exists for <span className="text-zinc-300">{email}</span>, we've sent instructions to reset your password.
              </p>
              <button onClick={() => setView('login')} className="btn-secondary w-full py-3">
                Return to Login
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
