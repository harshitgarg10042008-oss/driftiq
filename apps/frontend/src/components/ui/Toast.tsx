import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const config: Record<ToastType, { icon: React.ReactNode; accent: string }> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    accent: 'border-l-emerald-500',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
    accent: 'border-l-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    accent: 'border-l-amber-500',
  },
  info: {
    icon: <Info className="w-4 h-4 text-violet-400 shrink-0" />,
    accent: 'border-l-violet-500',
  },
};

export function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3.5 bg-zinc-900 border border-white/10 border-l-2 rounded-xl shadow-2xl max-w-sm w-full ${config[toast.type].accent}`}
          >
            {config[toast.type].icon}
            <p className="text-sm text-zinc-200 flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
