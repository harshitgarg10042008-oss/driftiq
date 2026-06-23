import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Loader2, Zap } from 'lucide-react';
import api from '../lib/api';

export default function TelegramConnect() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const botUsername =
    (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || 'DriftIQBot';

  // Fetch link code when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setLoadingCode(true);
    api
      .get('/auth/telegram-link-code')
      .then((res) => setCode(res.data?.code || ''))
      .catch(() => setCode('ERROR'))
      .finally(() => setLoadingCode(false));
  }, [step]);

  // Poll for confirmation when in step 3
  useEffect(() => {
    if (step !== 3) return;

    intervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get('/auth/telegram-status');
        if (data?.connected === true || data?.status === 'connected') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setConnected(true);
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step, navigate]);

  const copyCode = () => {
    if (!code || code === 'ERROR') return;
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const StepIndicator = ({ n }: { n: 1 | 2 | 3 }) => {
    const isDone = step > n;
    const isActive = step === n;
    return (
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
          isDone
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : isActive
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 ring-4 ring-violet-500/20'
            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
        }`}
      >
        {isDone ? <Check className="w-4 h-4" /> : n}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#4C1D95]/15 rounded-full blur-[120px]" />
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
            className="h-10 w-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="font-black italic text-2xl tracking-tight select-none">
            <span className="text-white">Drift</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
              IQ
            </span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Connect Telegram
          </h1>
          <p className="text-sm text-zinc-500 text-center mb-8">
            Required to upload and sync files via DriftIQ.
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <StepIndicator n={1} />
            <div
              className={`h-px flex-1 max-w-[48px] transition-colors duration-300 ${
                step > 1 ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            />
            <StepIndicator n={2} />
            <div
              className={`h-px flex-1 max-w-[48px] transition-colors duration-300 ${
                step > 2 ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            />
            <StepIndicator n={3} />
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
                className="text-center space-y-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#2AABEE]/10 border border-[#2AABEE]/20 flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-[#2AABEE]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100 mb-2">
                    Open DriftIQ Bot
                  </h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Click the button below to open our Telegram bot and start a
                    chat. It will guide you through linking your account.
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.open(`https://t.me/${botUsername}`, '_blank');
                    setStep(2);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 font-semibold rounded-xl transition-all text-white shadow-lg shadow-[#2AABEE]/20 hover:opacity-90"
                  style={{ backgroundColor: '#2AABEE' }}
                >
                  <Zap className="w-4 h-4" />
                  Open @{botUsername} on Telegram
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
                className="text-center space-y-5"
              >
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100 mb-2">
                    Send this code to the bot
                  </h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Send the code below to the bot in Telegram — just type it
                    or use <code className="text-violet-400">/link YOUR_CODE</code>
                  </p>
                </div>

                {loadingCode ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
                  </div>
                ) : code === 'ERROR' ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                    Failed to generate code. Please refresh the page.
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-3 bg-zinc-950 border border-violet-500/30 rounded-xl px-4 py-4">
                      <span className="flex-1 text-3xl font-mono font-bold tracking-[0.35em] text-violet-300 select-all text-center">
                        {code}
                      </span>
                      <button
                        onClick={copyCode}
                        title="Copy code"
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-zinc-100 shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-emerald-400 mt-1.5 text-center">
                        ✓ Copied to clipboard!
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-zinc-600">This code expires in 10 minutes.</p>

                <button
                  onClick={() => setStep(3)}
                  disabled={!code || code === 'ERROR' || loadingCode}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-center py-4 space-y-6"
              >
                {connected ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="space-y-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <Check className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-400">
                      Connected!
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Redirecting to your dashboard...
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
                      <div
                        className="absolute inset-2 rounded-full border-2 border-violet-500/40 animate-ping"
                        style={{ animationDelay: '0.3s' }}
                      />
                      <div className="absolute inset-0 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-violet-400" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100 mb-2">
                        Waiting for confirmation…
                      </h2>
                      <p className="text-sm text-zinc-500">
                        Once you send the code to the bot, this page will
                        automatically update. Checking every 3 seconds...
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip button */}
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition underline underline-offset-4"
            >
              Skip for now — connect later from Settings
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
