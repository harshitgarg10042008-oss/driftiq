import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Zap, HardDrive, RefreshCw, ArrowRight, Shield, FolderGit2, Link as LinkIcon, Star, CheckCircle2, ChevronDown, Lock, Server, Sparkles, Send
} from 'lucide-react';

/* ─── Floating particle canvas (CSS) ─────────────────────────────────────── */

interface Particle {
  id: number;
  color: string;
  size: number;
  left: number;
  duration: number;
  delay: number;
}

const COLORS = ['bg-violet-500', 'bg-indigo-500', 'bg-[#2AABEE]', 'bg-pink-500', 'bg-emerald-500'];

function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 15,
    }));
    setParticles(generated);
  }, []);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 0.8; transform: translateY(80vh) scale(1); }
          90% { opacity: 0.8; }
          100% { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }
        @keyframes shimmer {
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 fixed h-screen w-screen">
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

/* ─── FAQ Component ──────────────────────────────────────────────────────── */

const faqs = [
  {
    question: "How does DriftIQ provide free storage?",
    answer: "DriftIQ leverages the Telegram Bot API as a secure, distributed backend for file storage. When you upload a file, it is chunked and stored securely within a private Telegram channel, allowing us to bypass traditional expensive cloud storage costs like AWS S3."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. Files are only accessible via secure, temporary streaming links authenticated through your DriftIQ account. They reside in a private Telegram channel inaccessible to the public."
  },
  {
    question: "What is the maximum file size I can upload?",
    answer: "Currently, you can upload files up to 2GB per file, matching Telegram's maximum file size limit for bot uploads."
  },
  {
    question: "Can I share my files with others?",
    answer: "Absolutely. You can generate public share links for any file or folder. You can even set passwords and expiration dates for these links to ensure your data remains secure."
  }
];

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden transition-all duration-300 hover:bg-white/[0.04]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-6 text-left"
      >
        <span className="font-semibold text-lg text-zinc-100">{question}</span>
        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-zinc-400 leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ─── Main Landing Page ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="min-h-screen w-full bg-[#050505] text-zinc-50 overflow-x-hidden relative font-sans selection:bg-violet-500/30">
      
      {/* Ambient glows - Deep premium dark mode */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[800px] h-[500px] bg-violet-600/10 rounded-[100%] blur-[120px] mix-blend-screen" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-0 left-1/3 w-[800px] h-[600px] bg-purple-900/15 rounded-[100%] blur-[150px] mix-blend-screen" />
      </div>

      <FloatingParticles />

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-white/5 transition-all duration-300">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
               <img src="/logo-icon.png" alt="DriftIQ" className="h-6 w-6 object-contain" onError={(e) => {
                 (e.target as HTMLImageElement).style.display = 'none';
               }} />
            </div>
            <span className="font-black text-2xl tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">IQ</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium">
            <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#how" className="text-zinc-400 hover:text-white transition-colors">How it works</a>
            <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">Start Free <ArrowRight className="w-4 h-4" /></span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-48 pb-32 px-4 text-center overflow-hidden">
        <motion.div 
          style={{ y: yHero, opacity: opacityHero }}
          className="max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-300 mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(124,58,237,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>The future of limitless storage is here</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-[5rem] font-extrabold tracking-tight leading-[1.1] mb-8"
          >
            <span className="text-white">Your personal cloud,</span><br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 animate-shimmer">
              without the monthly bill.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Secure, lightning-fast file storage powered by Telegram. Upload your files once, access them anywhere, and never pay for S3 again.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-2xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] text-base overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">Create Free Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
            <a
              href="#how"
              className="flex items-center gap-2 px-8 py-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold rounded-2xl transition-all text-base backdrop-blur-md"
            >
              See How It Works
            </a>
          </motion.div>
        </motion.div>

        {/* Floating Mockup Component */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring" }}
          className="mx-auto mt-24 max-w-4xl relative perspective-1000"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent z-20 h-full w-full pointer-events-none" />
          
          <div className="relative rounded-t-3xl border border-white/10 bg-zinc-900/80 backdrop-blur-2xl p-2 shadow-[0_0_50px_rgba(124,58,237,0.2)] overflow-hidden transform-gpu rotate-x-12 scale-100 hover:rotate-x-0 transition-transform duration-700 ease-out">
            <div className="rounded-t-2xl bg-[#09090B] border border-white/5 h-full w-full flex flex-col">
              {/* Fake Browser Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 max-w-md mx-auto">
                  <div className="bg-white/5 rounded-md text-center py-1 text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3 text-emerald-500" /> driftiq.com/drive
                  </div>
                </div>
                <div className="w-16"></div>
              </div>
              
              {/* Fake App Body */}
              <div className="flex p-6 gap-6 text-left h-[300px]">
                {/* Sidebar */}
                <div className="w-48 hidden sm:flex flex-col gap-2 border-r border-white/5 pr-4">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Storage</div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-violet-500/10 text-violet-400 rounded-lg text-sm font-medium">
                    <HardDrive className="w-4 h-4" /> My Drive
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white rounded-lg text-sm font-medium transition-colors">
                    <Star className="w-4 h-4" /> Starred
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white rounded-lg text-sm font-medium transition-colors">
                    <LinkIcon className="w-4 h-4" /> Shared
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Recent Files</h2>
                    <div className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-md flex items-center gap-2">
                      + New
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'Pitch_Deck_Final.pdf', size: '4.5 MB', icon: <FolderGit2 className="text-blue-400" /> },
                      { name: 'Project_Assets.zip', size: '1.2 GB', icon: <Server className="text-purple-400" /> },
                      { name: 'Meeting_Recording.mp4', size: '245 MB', icon: <Zap className="text-yellow-400" /> },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition cursor-pointer">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium text-zinc-200 truncate">{item.name}</span>
                        </div>
                        <div className="flex justify-between items-center mt-auto text-xs text-zinc-500">
                          <span>{item.size}</span>
                          <span className="px-2 py-0.5 rounded bg-white/5">Just now</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── LOGO CLOUD ─────────────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/5 bg-zinc-950/50 backdrop-blur-md relative z-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-6">Powered by modern tech stack</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-xl text-white"><Zap className="text-[#2AABEE]" /> Telegram API</div>
            <div className="flex items-center gap-2 font-bold text-xl text-white"><Server className="text-[#E0234E]" /> NestJS</div>
            <div className="flex items-center gap-2 font-bold text-xl text-white"><RefreshCw className="text-[#61DAFB]" /> React</div>
            <div className="flex items-center gap-2 font-bold text-xl text-white"><HardDrive className="text-[#3ECF8E]" /> Supabase</div>
          </div>
        </div>
      </section>

      {/* ── BENTO GRID FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">Everything you need.<br/>Nothing you don't.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">DriftIQ combines the familiar interface of Google Drive with the limitless backend of Telegram, creating a perfect symbiosis of design and utility.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 auto-rows-[250px]">
            
            {/* Bento Item 1 - Large */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2AABEE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-[#2AABEE]/20 border border-[#2AABEE]/30 flex items-center justify-center text-[#2AABEE] mb-6">
                  <Send className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Telegram Sync Backend</h3>
                <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                  We don't use S3. Your files are securely chunked, encrypted, and stored in a private Telegram channel. This allows us to offer massive storage quotas for free.
                </p>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#2AABEE]/10 rounded-full blur-[50px] pointer-events-none" />
            </motion.div>

            {/* Bento Item 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-white/10 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Deep Nesting</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Organize exactly how you want with infinite nested folders and drag-and-drop capabilities.
                </p>
              </div>
            </motion.div>

            {/* Bento Item 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Secure Sharing</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Generate public links with passwords and auto-expiring timers for total control over your data.
                </p>
              </div>
            </motion.div>

            {/* Bento Item 4 - Wide */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-white/10 relative overflow-hidden group flex items-center justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-tl from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Real-time Everything</h3>
                <p className="text-zinc-400 text-base leading-relaxed">
                  Built on WebSockets. Upload on your phone, see it instantly on your desktop. Delete a file, watch it vanish everywhere instantly.
                </p>
              </div>
              {/* Abstract visual */}
              <div className="hidden sm:flex relative w-48 h-48 justify-center items-center">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl border border-white/20 z-10 shadow-2xl flex items-center justify-center">
                  <HardDrive className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how" className="py-32 px-4 relative z-10 border-t border-white/5 bg-gradient-to-b from-transparent to-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">Three steps to freedom</h2>
            <p className="text-zinc-400 text-lg">Leave storage limits behind.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
            
            {[
              { num: '01', title: 'Sign up for free', desc: 'Create your account in seconds. No credit card required, ever.', icon: <CheckCircle2 className="w-6 h-6" /> },
              { num: '02', title: 'Link Telegram bot', desc: 'Follow a simple webhook to connect your private Telegram storage channel.', icon: <Send className="w-6 h-6" /> },
              { num: '03', title: 'Start uploading', desc: 'Drag, drop, and manage files through our beautiful web interface.', icon: <Sparkles className="w-6 h-6" /> },
            ].map((step, idx) => (
              <motion.div 
                key={step.num} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-[#0A0A0A] border border-white/10 flex flex-col items-center justify-center mb-8 relative z-10 shadow-2xl shadow-violet-500/10 group-hover:border-violet-500/50 transition-colors duration-300">
                  <div className="text-violet-400 mb-1">{step.icon}</div>
                  <span className="text-xl font-black text-white">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-base text-zinc-400 leading-relaxed max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-32 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-zinc-400">Everything you need to know about DriftIQ.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-white/10 p-12 sm:p-24 text-center glass-panel">
            {/* Background Glow inside CTA */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 blur-3xl -z-10 mix-blend-screen" />
            
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white mb-8 tracking-tight">Ready to ditch S3?</h2>
            <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">
              Join thousands of smart developers and users who have discovered the secret to free, limitless cloud storage.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-black font-bold rounded-2xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.4)] text-lg flex items-center gap-2"
              >
                Get Started Now <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-zinc-400 font-medium">Free forever. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 py-16 px-4 bg-[#050505]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
                 <img src="/logo-icon.png" alt="DriftIQ" className="h-5 w-5 object-contain" onError={(e) => {
                   (e.target as HTMLImageElement).style.display = 'none';
                 }} />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">DriftIQ</span>
            </div>
            <p className="text-zinc-500 max-w-xs leading-relaxed mb-6">
              The smart, secure, and infinitely scalable cloud storage platform powered by the Telegram Bot API.
            </p>
            <div className="text-sm text-zinc-600 font-medium">
              &copy; {new Date().getFullYear()} DriftIQ. All rights reserved.
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Pricing (It's Free)</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Acceptable Use</a></li>
            </ul>
          </div>
          
        </div>
      </footer>
    </div>
  );
}
