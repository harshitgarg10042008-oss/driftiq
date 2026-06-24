import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, Music } from 'lucide-react';

/* ─── Theme Initialization ──────────────────────────────────────────────── */
function useThemeInit() {
  useEffect(() => {
    const isDarkMode = localStorage.getItem('theme') === 'dark' || 
                      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
}

/* ─── Creative Element: Spider Web Network ─────────────────────────────── */
function NetworkParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number, y: number, vx: number, vy: number }[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth / 2;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = document.documentElement.classList.contains('dark');
      const baseColor = isDark ? '255, 255, 255' : '124, 58, 237';

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, 0.5)`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${baseColor}, ${0.2 - dist / 600})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen" />;
}

/* ─── Creative Element: Floating Bubbles ───────────────────────────────── */
function FloatingBubbles() {
  const [bubbles, setBubbles] = useState<{ id: number, size: number, left: number, duration: number, delay: number }[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 60 + 20,
      left: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 10,
    }));
    setBubbles(generated);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes floatBubble {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-20vh) scale(1.2); opacity: 0; }
        }
      `}</style>
      {bubbles.map(b => (
        <div
          key={b.id}
          className="absolute rounded-full border border-white/20 bg-gradient-to-tr from-white/10 to-transparent backdrop-blur-sm"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            bottom: '-100px',
            animation: `floatBubble ${b.duration}s ease-in infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Creative Element: Audio Visualizer ───────────────────────────────── */
function AudioVisualizer() {
  return (
    <div className="flex items-end gap-1.5 h-12 opacity-70">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: ['20%', '100%', '40%', '80%', '20%'] }}
          transition={{
            duration: 1.5 + Math.random(),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1
          }}
          className="w-2 bg-gradient-to-t from-violet-500 to-[#2AABEE] rounded-full"
        />
      ))}
      <Music className="text-violet-400 w-6 h-6 ml-3 animate-pulse" />
    </div>
  );
}

/* ─── Main Register Page ──────────────────────────────────────────────── */
export default function Register() {
  useThemeInit();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

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
      navigate('/telegram-connect');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-[#09090B]">

      {/* ── LEFT CREATIVE PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] relative flex-col overflow-hidden bg-slate-900 dark:bg-[#09090B]">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-violet-950/80 to-[#09090B]" />
        
        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Creative Particles & Bubbles */}
        <NetworkParticles />
        <FloatingBubbles />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-16 justify-between">
          
          {/* Top Logo - Massive */}
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-md shadow-[0_0_50px_rgba(124,58,237,0.4)]">
               <img src="/logo-icon.png" alt="DriftIQ" className="h-14 w-14 object-contain" onError={(e) => {
                 (e.target as HTMLImageElement).style.display = 'none';
               }} />
            </div>
            <span className="font-black italic text-6xl tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">IQ</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-6">
              <AudioVisualizer />
            </div>

            <h2 className="text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
              Start storing<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 animate-shimmer">
                smarter today.
              </span>
            </h2>
            <p className="text-zinc-300 text-lg leading-relaxed max-w-sm mb-12 backdrop-blur-sm bg-black/10 p-4 rounded-xl border border-white/5">
              Get 5 GB of free storage instantly. Join the revolution of Telegram-powered limitless storage.
            </p>

            {/* 3-step mini flow */}
            <div className="flex items-center gap-4 text-sm font-bold text-zinc-300 mb-10 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 w-fit shadow-xl">
              <span className="text-white">Register</span>
              <ArrowRight className="w-5 h-5 text-violet-400 opacity-60" />
              <span className="text-zinc-400">Connect Telegram</span>
              <ArrowRight className="w-5 h-5 text-violet-400 opacity-60" />
              <span className="text-zinc-400">Start Uploading</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Clean solid background */}
        <div className="absolute inset-0 bg-slate-50 dark:bg-[#050505]" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <img src="/logo-icon.png" alt="DriftIQ" className="h-10 w-10 object-contain" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span className="font-black italic text-3xl tracking-tight select-none">
              <span className="text-slate-900 dark:text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">IQ</span>
            </span>
          </div>

          {/* Clean Card Container */}
          <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] p-8 md:p-10 relative z-10">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Create account</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">Free forever. No credit card required.</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    className="input-field pl-12 h-14"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <span className="text-slate-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none font-bold">@</span>
                  <input
                    type="text"
                    required
                    placeholder="janesmith"
                    className="input-field pl-10 h-14"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="input-field pl-12 h-14"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 characters"
                    className="input-field pl-12 h-14"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-4 h-14 text-base disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-500">
              Already have an account?{' '}
              <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-bold transition">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
