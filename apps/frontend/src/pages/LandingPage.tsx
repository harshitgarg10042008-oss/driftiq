import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, HardDrive, RefreshCw, ArrowRight
} from 'lucide-react';

/* ─── Floating particle canvas (CSS) ─────────────────────────────────────── */
function FloatingParticles() {
  const colors = ['bg-violet-500', 'bg-indigo-500', 'bg-[#2AABEE]', 'bg-pink-500', 'bg-emerald-500'];
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 30 }).map((_, i) => ({
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
    <>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(80vh) scale(1); }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }
        @keyframes shimmer {
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
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
              left: \`\${p.left}%\`,
              bottom: '-20px',
              animation: \`floatUp \${p.duration}s linear infinite\`,
              animationDelay: \`\${p.delay}s\`,
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ─── Main Landing Page ─────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#09090B] text-zinc-50 overflow-x-hidden relative font-sans">
      
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/3 w-[600px] h-[600px] bg-[#4C1D95]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-indigo-700/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-800/10 rounded-full blur-[120px]" />
      </div>

      <FloatingParticles />

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/40 backdrop-blur border-b border-white/5">
        <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="DriftIQ" className="h-8 w-8 object-contain" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span className="font-black italic text-xl tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</a>
            <a href="#docs" className="hover:text-zinc-100 transition-colors">Docs</a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-40 pb-20 px-4 text-center">
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2AABEE]/10 border border-[#2AABEE]/20 text-xs font-semibold text-[#2AABEE] mb-8 backdrop-blur-sm"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>⚡ Powered by Telegram Bot</span>
        </motion.div>

        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          src="/logo.png"
          alt="DriftIQ"
          className="h-28 w-auto mx-auto mb-6"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto"
        >
          <span className="text-white">Store Smarter.</span><br className="sm:hidden" />{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400 animate-shimmer">
            Powered by Telegram.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Get 5GB free cloud storage. No credit card. No setup.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-violet-500/25 text-base"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how"
            className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-semibold rounded-2xl transition-all text-base"
          >
            See How It Works
          </a>
        </motion.div>

        {/* Floating Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mx-auto mt-16 max-w-3xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent z-10" />
          <div className="rounded-t-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="space-y-3">
              {[
                { name: 'Project_Alpha_v2.zip', size: '1.2 GB', type: 'archive' },
                { name: 'Pitch_Deck_Final.pdf', size: '4.5 MB', type: 'doc' },
                { name: 'Design_Assets.fig', size: '42 MB', type: 'design' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-zinc-200">{item.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{item.size}</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          
          <div className="p-8 rounded-3xl bg-white/[0.02] backdrop-blur border border-white/[0.06] hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A855F7] mb-6">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">5 GB Free</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Start with a generous free tier for all your personal files.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] backdrop-blur border border-white/[0.06] hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2AABEE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-[#2AABEE]/20 border border-[#2AABEE]/30 flex items-center justify-center text-[#2AABEE] mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Telegram Sync</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Use Telegram as your backend. Secure, lightning fast, everywhere.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] backdrop-blur border border-white/[0.06] hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Real-time</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Instant sync across all your devices via WebSockets.
            </p>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how" className="relative z-10 py-24 px-4 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-zinc-400">Three simple steps to limitless storage.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            
            {[
              { num: '1', title: 'Create account', desc: 'Sign up in seconds.' },
              { num: '2', title: 'Connect Telegram', desc: 'Link the bot.' },
              { num: '3', title: 'Upload anywhere', desc: 'Drag, drop, done.' },
            ].map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-white/10 flex items-center justify-center text-xl font-bold text-[#A855F7] mb-6 relative z-10 shadow-xl">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="DriftIQ" className="h-6 w-6 object-contain" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span className="font-bold italic text-lg tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#A855F7]">IQ</span>
            </span>
          </div>
          
          <div className="text-sm text-zinc-500 font-medium">
            Free forever · No credit card · Cancel anytime
          </div>
        </div>
      </footer>
    </div>
  );
}

