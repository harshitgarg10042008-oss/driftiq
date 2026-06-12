import { motion } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { formatBytes, getMimeIcon } from '../../lib/utils';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
  onDownload: (id: string) => void;
}

export function FilePreviewModal({ isOpen, onClose, file, onDownload }: FilePreviewModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !file) return null;

  const isImage = file.mime_type?.startsWith('image/');
  const isVideo = file.mime_type?.startsWith('video/');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    
    const fetchPreview = async () => {
      if (!file || (!isImage && !isVideo)) return;
      try {
        const response = await api.get(`/files/${file.id}/stream`, { responseType: 'blob' });
        objectUrl = window.URL.createObjectURL(new Blob([response.data]));
        setPreviewUrl(objectUrl);
      } catch {
        setError(true);
      }
    };

    fetchPreview();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [file, isImage, isVideo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-zinc-950/90 backdrop-blur-sm">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 shrink-0">
          <div className="text-2xl shrink-0">{getMimeIcon(file.mime_type)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">{file.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{formatBytes(file.size)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onDownload(file.id)}
              className="btn-ghost"
              title="Download"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-zinc-950/50 min-h-[300px] p-8">
          {error ? (
             <div className="flex flex-col items-center justify-center text-zinc-500 text-center">
               <div className="text-8xl mb-6 opacity-60">{getMimeIcon(file.mime_type)}</div>
               <p className="text-lg font-semibold text-zinc-300 mb-2">Preview unavailable</p>
               <button onClick={() => onDownload(file.id)} className="btn-secondary mt-4">
                 <Download className="w-4 h-4 mr-2" /> Download
               </button>
             </div>
          ) : isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
            />
          ) : isVideo && previewUrl ? (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-[65vh] rounded-xl shadow-lg"
            />
          ) : (isImage || isVideo) && !previewUrl ? (
            <div className="animate-pulse text-zinc-500">Loading preview...</div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 text-center">
              <div className="text-8xl mb-6 opacity-60">{getMimeIcon(file.mime_type)}</div>
              <p className="text-lg font-semibold text-zinc-300 mb-2">No preview available</p>
              <p className="text-sm text-zinc-500 mb-8">This file type cannot be previewed in the browser.</p>
              <button
                onClick={() => onDownload(file.id)}
                className="btn-secondary"
              >
                <Download className="w-4 h-4" /> Download to view
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
