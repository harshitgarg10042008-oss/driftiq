/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Download, Lock, Shield, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { formatBytes, getMimeIcon } from '../lib/utils';

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || '/api';

export default function ShareView() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchShare = async (pass?: string) => {
    try {
      setError('');
      setLoading(true);
      const { data } = await axios.post(
        `${backendUrl}/shares/public/${token}`,
        { password: pass || undefined },
      );
      setShareData(data);
      setNeedsPassword(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to load share';
      if (
        msg === 'Password required' ||
        msg === 'Invalid password' ||
        msg?.toLowerCase().includes('password')
      ) {
        setNeedsPassword(true);
        if (pass) setError('Incorrect password. Please try again.');
      } else {
        setError(msg);
        setNeedsPassword(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShare(password);
  };

  const handleDownload = async () => {
    if (!shareData?.file) return;
    setDownloading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/shares/public/${token}/download-url`,
        { password: password || undefined },
        { responseType: 'blob' },
      );

      // Try to get the filename from the Content-Disposition header
      const contentDisposition = response.headers?.['content-disposition'] || '';
      const nameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
      const finalName = nameMatch?.[1] || shareData?.file?.name || 'download';

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', finalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      let msg = 'Download failed. Please try again.';
      if (err?.response?.data instanceof Blob) {
        // Server returned a JSON error wrapped in a blob (responseType: 'blob')
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed?.message || msg;
        } catch { }
      } else {
        msg = err?.response?.data?.message || err?.message || msg;
      }
      setError(msg);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading share...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-6">
      {/* Ambient gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md"
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
              IQ
            </span>
          </span>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${needsPassword ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-violet-500/10 border border-violet-500/20'
                }`}
            >
              {needsPassword
                ? '🔒'
                : shareData?.file
                  ? getMimeIcon(shareData.file.mime_type)
                  : '📁'}
            </div>
          </div>

          <h1 className="text-xl font-bold text-center text-zinc-100 tracking-tight mb-1">
            {needsPassword ? 'Protected File' : 'Shared with you'}
          </h1>
          <p className="text-sm text-center text-zinc-500 mb-6">
            {needsPassword
              ? 'Enter the password to access this file.'
              : 'Someone shared a file with you via DriftIQ.'}
          </p>

          {/* General error state */}
          {error && !needsPassword && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {error.toLowerCase().includes('expired')
                  ? '⏰ This share link has expired.'
                  : error.toLowerCase().includes('limit')
                    ? '🚫 Download limit has been reached.'
                    : error.toLowerCase().includes('not found') || error.toLowerCase().includes('deleted')
                      ? '❌ Share link not found or has been deleted.'
                      : error}
              </span>
            </div>
          )}

          {/* Password form */}
          {needsPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Enter link password"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Unlock File
              </button>
            </form>
          ) : shareData?.file ? (
            <div className="space-y-4">
              {/* File card */}
              <div className="bg-zinc-950/80 border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="text-3xl shrink-0">
                    {getMimeIcon(shareData.file.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">
                      {shareData.file.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatBytes(shareData.file.size || 0)}
                      {shareData.file.mime_type &&
                        ` · ${shareData.file.mime_type.split('/')[1]?.toUpperCase() || ''}`}
                    </p>
                  </div>
                </div>

                {(shareData.expiresAt || shareData.downloadLimit) && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap gap-4 text-xs text-zinc-500 font-medium">
                    {shareData.expiresAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Expires {new Date(shareData.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                    {shareData.downloadLimit && (
                      <div className="flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        {shareData.downloadCount || 0}/{shareData.downloadLimit} downloads
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download File
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-2xl">🔗</p>
              <p className="text-zinc-400 font-medium">Invalid share link</p>
              <p className="text-zinc-600 text-sm">
                This share link is invalid or has been removed.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Secured by DriftIQ · Files stored via Telegram
        </p>
      </motion.div>
    </div>
  );
}
