import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, HardDrive, Zap, Shield, RefreshCw } from 'lucide-react';

/* ─── Floating particle canvas (CSS) ─────────────────────────────────────── */
function FloatingParticles() {
  const colors = ['bg-violet-500', 'bg-indigo-500', 'bg-[#2AABEE]', 'bg-pink-500', 'bg-emerald-500'];
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 15,
    }));
    setParticles(generated);
  }, []);

  return (
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
  );
}

/* ─── Floating shape (decorative) ─────────────────────────────────────── */
function FloatingShape({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
      transition={{ duration: 5 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut', delay }}
      className={className}
    />
  );
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // ─── Original handler — unchanged ────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, username, fullName, password });
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setAuth(me.data, data.access_token, data.refresh_token);
      // After register → Telegram connect flow
      navigate('/telegram-connect');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#09090B]">

      {/* ── LEFT BRANDING PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] relative flex-col overflow-hidden">
        <FloatingParticles />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-violet-950/80 to-[#09090B]" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-60 h-60 bg-violet-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }} />

        {/* Floating decorative file preview card mockup */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-32 right-12 z-20 w-64 rounded-xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
               <HardDrive className="w-4 h-4" />
            </div>
            <div>
               <div className="h-2 w-24 rounded bg-white/20 mb-1.5" />
               <div className="h-2 w-12 rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-1.5 w-full rounded bg-white/5" />
            <div className="h-1.5 w-4/5 rounded bg-white/5" />
            <div className="h-1.5 w-3/4 rounded bg-white/5" />
          </div>
        </motion.div>

        <FloatingShape delay={0} className="absolute top-28 right-28 w-14 h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm" />
        <FloatingShape delay={1} className="absolute bottom-32 left-20 w-10 h-10 rounded-xl border border-indigo-400/20 bg-indigo-500/10 backdrop-blur-sm" />
        <FloatingShape delay={2} className="absolute top-2/3 right-20 w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-400/20" />

        <div className="relative z-10 flex flex-col h-full p-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="DriftIQ" className="h-8 w-8 object-contain" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span className="font-black italic text-xl tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center mt-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2AABEE]/10 border border-[#2AABEE]/30 text-[#2AABEE] text-xs font-semibold mb-8 w-fit">
              <Zap className="w-3 h-3" />
              Powered by Telegram Bot
            </div>

            <h2 className="text-4xl font-extrabold text-zinc-100 tracking-tight leading-tight mb-4">
              Start storing<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                smarter today.
              </span>
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed max-w-xs mb-10">
              Get 5 GB of free storage instantly. No credit card required.
            </p>

            {/* 3-step mini flow */}
            <div className="flex items-center gap-3 text-sm font-medium text-zinc-300 mb-10 bg-white/[0.03] p-4 rounded-xl border border-white/[0.05] w-fit">
              <span className="text-white">Register</span>
              <ArrowRight className="w-4 h-4 text-violet-400 opacity-60" />
              <span className="text-zinc-400">Connect Telegram</span>
              <ArrowRight className="w-4 h-4 text-violet-400 opacity-60" />
              <span className="text-zinc-400">Start Uploading</span>
            </div>

            <ul className="space-y-3.5">
              {[
                { icon: <Zap className="w-3.5 h-3.5" />, text: 'Sync files via Telegram bot' },
                { icon: <Shield className="w-3.5 h-3.5" />, text: 'Share with password protection' },
                { icon: <RefreshCw className="w-3.5 h-3.5" />, text: 'Real-time collaboration updates' },
                { icon: <HardDrive className="w-3.5 h-3.5" />, text: 'Admin controls & analytics' },
              ].map(item => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-zinc-400">
                  <div className="w-6 h-6 rounded-md bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                    {item.icon}
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-zinc-600 mt-4">Free forever · No credit card · Cancel anytime</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 to-zinc-900/50" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <img src="/logo-icon.png" alt="DriftIQ" className="h-8 w-8 object-contain" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span className="font-black italic text-xl tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Create account</h1>
            <p className="text-sm text-zinc-500 mb-8">Free forever. No credit card required.</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    className="input-field pl-10 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <span className="text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">@</span>
                  <input
                    type="text"
                    required
                    placeholder="janesmith"
                    className="input-field pl-9 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="input-field pl-10 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 characters"
                    className="input-field pl-10 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed group animate-shimmer-btn bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#7C3AED]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
