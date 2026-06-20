import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Copy, Check, Zap, Loader2 } from 'lucide-react';
import api from '../lib/api';

type Step = 1 | 2 | 3;

export default function TelegramConnect() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [linkCode, setLinkCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch link code when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setLoadingCode(true);
    api.get('/auth/telegram-link-code')
      .then(({ data }) => setLinkCode(data?.code || ''))
      .catch(() => setLinkCode('ERROR'))
      .finally(() => setLoadingCode(false));
  }, [step]);

  // Poll for telegram status in step 3
  useEffect(() => {
    if (step !== 3) return;

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get('/auth/telegram-status');
        if (data?.connected === true || data?.status === 'connected') {
          setConnected(true);
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(linkCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const StepIndicator = ({ num, label }: { num: Step; label: string }) => {
    const isDone = step > num;
    const isActive = step === num;
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            isDone
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : isActive
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 animate-pulse'
              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
          }`}
        >
          {isDone ? <CheckCircle className="w-4 h-4" /> : num}
        </div>
        <span className={`text-xs font-medium ${isActive ? 'text-zinc-200' : 'text-zinc-600'}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#4C1D95]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-700/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
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

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Connect your Telegram</h1>
          <p className="text-sm text-zinc-500 text-center mb-8">
            Link your Telegram account to enable real-time file sync.
          </p>

          {/* Step indicators */}
          <div className="flex items-start justify-center gap-8 mb-10 relative">
            {/* Connecting line */}
            <div className="absolute top-4 left-[calc(50%-56px)] right-[calc(50%-56px)] h-px bg-zinc-800" />
            <StepIndicator num={1} label="Open Bot" />
            <StepIndicator num={2} label="Get Code" />
            <StepIndicator num={3} label="Connecting" />
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            {/* ── STEP 1 ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#2AABEE]/10 border border-[#2AABEE]/20 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-[#2AABEE]" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100 mb-2">Open DriftIQ Bot</h2>
                <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
                  Click the button below to open our Telegram bot. Start a chat — it will guide you through the connection process.
                </p>
                <button
                  onClick={() => {
                    window.open(
                      'https://t.me/' + ((import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || 'DriftIQBot'),
                      '_blank'
                    );
                    setStep(2);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#2AABEE]/20"
                >
                  <Zap className="w-4 h-4" />
                  Open @DriftIQBot on Telegram
                </button>
              </motion.div>
            )}

            {/* ── STEP 2 ─────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <h2 className="text-lg font-semibold text-zinc-100 mb-2">Send this code to the bot</h2>
                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                  Send the following code to the DriftIQ bot on Telegram to link your account.
                </p>

                {loadingCode ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  </div>
                ) : (
                  <div className="relative mb-6">
                    <div className="font-mono text-3xl font-bold text-white tracking-[0.3em] bg-zinc-900 border border-white/10 rounded-xl py-5 px-4 text-center select-all">
                      {linkCode}
                    </div>
                    <button
                      onClick={copyCode}
                      className="absolute top-1/2 -translate-y-1/2 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-zinc-100"
                      title="Copy code"
                    >
                      {copied ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <Check className="w-3.5 h-3.5" /> Copied!
                        </span>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

                <p className="text-xs text-zinc-600 mb-6">This code expires in 10 minutes.</p>

                <button
                  onClick={() => setStep(3)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
                >
                  I've sent the code →
                </button>
              </motion.div>
            )}

            {/* ── STEP 3 ─────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center py-4"
              >
                {connected ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-400 mb-2">Connected!</h2>
                    <p className="text-sm text-zinc-500">Redirecting to your dashboard...</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-2 border-violet-500/40 animate-ping" style={{ animationDelay: '0.3s' }} />
                      <div className="absolute inset-0 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-violet-400" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-100 mb-2">Waiting for confirmation…</h2>
                    <p className="text-sm text-zinc-500">
                      Once you send the code to the bot, this page will automatically update.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Skip button */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition underline underline-offset-4"
          >
            Skip for now — connect later from Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
