import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle, Zap, Shield, HardDrive } from 'lucide-react';

/* ─── Floating Particles ───────────────────────────────────────────────── */
interface Particle {
  id: number;
  color: string;
  size: number;
  left: number;
  duration: number;
  delay: number;
}

const PARTICLE_COLORS = ['bg-violet-500', 'bg-indigo-500', 'bg-[#2AABEE]', 'bg-pink-500', 'bg-emerald-500'];

function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 15,
    }));
    setParticles(generated);
  }, []);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(80vh) scale(1); }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute rounded-full opacity-60 ${p.color}`}
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              bottom: '-20px',
              animation: `floatUp ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ─── Floating shape (decorative) ─────────────────────────────────────── */
function FloatingShape({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
      transition={{ duration: 6 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    />
  );
}

export default function Login() {
  const [view, setView] = useState<'login' | 'forgot' | 'forgot-success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // ─── All original handlers — unchanged ───────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth({ id: 'temp', email, role: 'user' }, data.access_token, data.refresh_token);
      const me = await api.get('/auth/me');
      setAuth(me.data, data.access_token, data.refresh_token);
      navigate('/dashboard');
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
    <div className="min-h-screen w-full flex bg-[#09090B]">

      {/* ── LEFT BRANDING PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] relative flex-col overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-indigo-950/80 to-[#09090B]" />
        {/* Animated glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-52 h-52 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl" />

        {/* Floating decorative shapes */}
        <FloatingShape className="absolute top-24 right-32 w-14 h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm" />
        <FloatingShape className="absolute bottom-36 left-24 w-10 h-10 rounded-xl border border-violet-400/20 bg-violet-500/10 backdrop-blur-sm" />
        <FloatingShape className="absolute top-1/2 right-16 w-8 h-8 rounded-lg border border-indigo-400/20 bg-indigo-500/10 backdrop-blur-sm" />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="DriftIQ"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-black italic text-xl tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {/* Telegram badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2AABEE]/10 border border-[#2AABEE]/30 text-[#2AABEE] text-xs font-semibold mb-8 w-fit">
              <Zap className="w-3 h-3" />
              Powered by Telegram Bot
            </div>

            <h2 className="text-4xl font-extrabold text-zinc-100 tracking-tight leading-tight mb-4">
              Your files,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                everywhere you are.
              </span>
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed max-w-xs">
              Secure cloud storage with real-time Telegram sync. Upload once, access anywhere.
            </p>

            {/* Stats */}
            <div className="mt-10 flex items-center gap-8">
              {[
                { value: '5 GB', label: 'Free storage' },
                { value: '256-bit', label: 'Encryption' },
                { value: '99.9%', label: 'Uptime' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-zinc-100 tracking-tight">{stat.value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              { icon: <Zap className="w-3.5 h-3.5" />, text: 'Real-time sync via Telegram' },
              { icon: <Shield className="w-3.5 h-3.5" />, text: 'Password-protected sharing' },
              { icon: <HardDrive className="w-3.5 h-3.5" />, text: 'Unlimited file types supported' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2.5 text-xs text-zinc-400">
                <div className="text-violet-400">{item.icon}</div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle background noise */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 to-zinc-900/50" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <img
              src="/logo-icon.png"
              alt="DriftIQ"
              className="h-7 w-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-black italic text-lg tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
            </span>
          </div>

          {/* Glassmorphism card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {/* ── LOGIN VIEW ─────────────────────────────────────────── */}
              {view === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Sign in</h1>
                  <p className="text-sm text-zinc-500 mb-8">Welcome back. Enter your credentials to continue.</p>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="label">Email or Username</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="you@example.com or @username"
                          className="input-field pl-10 focus:ring-violet-500"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="label mb-0">Password</label>
                        <button
                          type="button"
                          onClick={() => { setView('forgot'); setError(''); }}
                          className="text-xs text-violet-400 hover:text-violet-300 font-medium transition"
                        >
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
                      className="btn-primary w-full mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed group"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-sm text-zinc-500">
                    Don&apos;t have an account?{' '}
                    <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition">
                      Create one free
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ── FORGOT PASSWORD ────────────────────────────────────── */}
              {view === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); }}
                    className="flex items-center text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
                  </button>
                  <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Reset Password</h1>
                  <p className="text-sm text-zinc-500 mb-8">Enter your email and we&apos;ll send you a reset link.</p>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="label">Email</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                </motion.div>
              )}

              {/* ── FORGOT SUCCESS ─────────────────────────────────────── */}
              {view === 'forgot-success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">Check your email</h1>
                  <p className="text-sm text-zinc-500 mb-8">
                    If an account exists for <span className="text-zinc-300">{email}</span>, we&apos;ve sent instructions to reset your password.
                  </p>
                  <button onClick={() => setView('login')} className="btn-secondary w-full py-3">
                    Return to Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
