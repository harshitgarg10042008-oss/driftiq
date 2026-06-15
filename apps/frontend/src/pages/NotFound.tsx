import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-8 max-w-md w-full bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl backdrop-blur-sm"
      >
        <div className="text-8xl mb-6">🛸</div>
        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-500 tracking-tight">
          404
        </h1>
        <h2 className="text-xl font-medium text-zinc-300 mb-6">Page Not Found</h2>
        <p className="text-zinc-500 mb-8 text-sm">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/25"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
