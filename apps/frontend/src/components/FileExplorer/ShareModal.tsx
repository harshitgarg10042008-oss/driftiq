import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  Copy, Link as LinkIcon, Shield, Clock, Download, Check,
} from 'lucide-react';
import api from '../../lib/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export function ShareModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}: ShareModalProps) {
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState('');
  const [useExpiry, setUseExpiry] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState<number | ''>('');
  const [useLimit, setUseLimit] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const payload: any = { fileId };

      if (usePassword && password) {
        payload.password = password;
      }

      if (useExpiry && expiresIn) {
        const expiresDate = new Date(expiresIn);
        const secondsFromNow = Math.floor(
          (expiresDate.getTime() - Date.now()) / 1000,
        );
        if (secondsFromNow > 0) {
          payload.expiresIn = secondsFromNow;
        }
      }

      if (useLimit && downloadLimit) {
        payload.downloadLimit = Number(downloadLimit);
      }

      // Use /shares endpoint with fileId in body (not /files/:id/share)
      const { data } = await api.post('/shares', payload);

      // Backend may return share_token or token
      const token = data?.share_token || data?.token;
      const shareUrl = token
        ? `${window.location.origin}/share/${token}`
        : data?.share_url || '';

      setShareLink(shareUrl);
      toast.show('Share link created!', 'success');
    } catch (err: any) {
      toast.show(
        err?.response?.data?.message || 'Failed to create share link',
        'error',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAndClose = () => {
    setShareLink(null);
    setPassword('');
    setUsePassword(false);
    setExpiresIn('');
    setUseExpiry(false);
    setDownloadLimit('');
    setUseLimit(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Share File">
      <div className="mb-6">
        <p className="text-sm font-medium text-zinc-300 truncate bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
          <LinkIcon className="w-4 h-4 inline-block mr-2 text-violet-400" />
          {fileName}
        </p>
      </div>

      {!shareLink ? (
        <form onSubmit={handleCreateShare} className="space-y-5">
          {/* Password Protection */}
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">
                  Password Protection
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={() => setUsePassword(!usePassword)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
              </label>
            </div>
            {usePassword && (
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={usePassword}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-violet-500 outline-none transition"
              />
            )}
          </div>

          {/* Expiration Date */}
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">
                  Link Expiration
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExpiry}
                  onChange={() => setUseExpiry(!useExpiry)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
              </label>
            </div>
            {useExpiry && (
              <input
                type="datetime-local"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                required={useExpiry}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-violet-500 outline-none transition [color-scheme:dark]"
              />
            )}
          </div>

          {/* Download Limit */}
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">
                  Download Limit
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLimit}
                  onChange={() => setUseLimit(!useLimit)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
              </label>
            </div>
            {useLimit && (
              <input
                type="number"
                min="1"
                placeholder="Max downloads..."
                value={downloadLimit}
                onChange={(e) =>
                  setDownloadLimit(e.target.value ? Number(e.target.value) : '')
                }
                required={useLimit}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-violet-500 outline-none transition"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-5 py-2.5 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition font-medium text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2.5 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white transition font-medium disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Share Link'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Share Link
            </p>
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl p-3">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-transparent text-sm text-zinc-300 outline-none min-w-0"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyToClipboard}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-zinc-100 shrink-0"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-emerald-400 mt-1.5">
                ✓ Copied to clipboard!
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={resetAndClose}
              className="px-5 py-2.5 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition font-medium text-zinc-300"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
