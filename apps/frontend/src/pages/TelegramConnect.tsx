import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

/* ─── Step indicator ─────────────────────────────────────────────────── */
interface StepProps {
  number: number;
  done: boolean;
  active: boolean;
}

function StepIndicator({ number, done, active }: StepProps) {
  return (
    <div className="relative">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
          done
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : active
            ? 'bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white shadow-lg shadow-violet-500/30'
            : 'bg-white/5 border border-white/10 text-zinc-500'
        }`}
      >
        <AnimatePresence mode="wait">
          {done ? (
            <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
              <Check className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="num" initial={{ scale: 0 }} animate={{ scale: 1 }}>{number}</motion.span>
          )}
        </AnimatePresence>
      </div>
      {active && !done && (
        <span className="absolute inset-0 rounded-full border-2 border-violet-500/40 animate-ping" />
      )}
    </div>
  );
}

/* ─── Copy button ─────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-[#7C3AED]/10 text-[#C084FC] border border-[#7C3AED]/20 hover:bg-[#7C3AED]/20'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied! ✓' : 'Copy'}
    </button>
  );
}

export default function TelegramConnect() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);
  const [codeError, setCodeError] = useState('');
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const [step, setStep] = useState(1);

  const BOT_USERNAME = (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || 'DriftIQBot';

  useEffect(() => {
    const fetchCode = async () => {
      try {
        setLoadingCode(true);
        const { data } = await api.get('/auth/telegram-link-code');
        setLinkCode(data?.code ?? data);
      } catch (err: any) {
        setCodeError(err?.response?.data?.message || 'Could not fetch link code. You can skip for now.');
      } finally {
        setLoadingCode(false);
      }
    };
    fetchCode();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/telegram-status');
      if (data?.connected === true || data?.status === 'connected') {
        setConnected(true);
        setPolling(false);
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch {
      // ignore
    }
  }, [navigate]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  const handleOpenBot = () => {
    window.open(`https://t.me/${BOT_USERNAME}`, '_blank');
    setStep(2);
  };

  const handleSentCode = () => {
    setStep(3);
    setPolling(true);
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#4C1D95]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-indigo-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/[0.03] border border-[#7C3AED]/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-violet-900/20"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/logo-icon.png" alt="DriftIQ" className="h-10 w-10 object-contain" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
              <span className="font-black italic text-2xl tracking-tight select-none">
                <span className="text-white">Drift</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">Connect your Telegram</h1>
            <p className="text-[#C084FC] text-sm font-medium">Required to start uploading files</p>
          </div>

          {/* Steps */}
          <div className="flex justify-center items-center gap-4 mb-10">
            <StepIndicator number={1} done={step > 1} active={step === 1} />
            <div className={`w-12 h-px ${step > 1 ? 'bg-[#7C3AED]' : 'bg-white/10'}`} />
            <StepIndicator number={2} done={step > 2} active={step === 2} />
            <div className={`w-12 h-px ${step > 2 ? 'bg-[#7C3AED]' : 'bg-white/10'}`} />
            <StepIndicator number={3} done={connected} active={step === 3 && !connected} />
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
              <button
                onClick={handleOpenBot}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#2AABEE]/20"
              >
                Open @{BOT_USERNAME} on Telegram
                <ExternalLink className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {loadingCode ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-8 h-8 text-[#A855F7] animate-spin" />
                </div>
              ) : codeError ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {codeError}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-6 p-6 rounded-2xl bg-[#09090B]/50 border border-white/10 flex flex-col items-center gap-4 shadow-inner">
                    <div className="font-mono text-4xl font-bold text-zinc-100 tracking-wider">
                      {linkCode}
                    </div>
                    <CopyButton text={String(linkCode)} />
                  </div>
                  <p className="text-sm text-zinc-400 mb-6">Send this code to the bot in Telegram</p>
                  <button
                    onClick={handleSentCode}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-500/30"
                  >
                    I've sent the code <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              {!connected ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-[#7C3AED]/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-[#A855F7] border-t-transparent animate-spin" />
                    <Loader2 className="w-6 h-6 text-[#A855F7] animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">Waiting for Telegram connection...</p>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                    <Check className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold text-emerald-400">Connection Successful!</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Skip link */}
          <div className="mt-8 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
            >
              Skip for now <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
            </button>
            <p className="text-xs text-zinc-600 mt-2">You can connect Telegram later from Settings</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
