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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const isImage = file?.mime_type?.startsWith('image/');
  const isVideo = file?.mime_type?.startsWith('video/');
  const isPdf = file?.mime_type === 'application/pdf';
  // Default to text preview for any unknown file type to support previewing every file
  const isText = !isImage && !isVideo && !isPdf;

  useEffect(() => {
    if (!isOpen || !file) return;
    let objectUrl: string | null = null;
    setPreviewUrl(null);
    setTextContent(null);
    setPreviewError(false);

    const fetchPreview = async () => {
      if (!isImage && !isVideo && !isPdf && !isText) return;
      try {
        const response = await api.get(`/files/${file?.id}/stream`, { responseType: 'blob' });

        if (isText) {
          const text = await response.data.text();
          setTextContent(text);
        } else {
          objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: file?.mime_type }));
          setPreviewUrl(objectUrl);
        }
      } catch {
        setPreviewError(true);
      }
    };

    fetchPreview();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, file, isImage, isVideo, isPdf, isText]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full max-w-3xl bg-[#1A1A1A] border border-[#333] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[75vh] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#222] border-b border-[#333] shrink-0 cursor-move">
          <div className="text-xl shrink-0">{getMimeIcon(file?.mime_type)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-zinc-200 truncate">{file?.name}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onDownload(file?.id)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-md transition"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#1A1A1A] min-h-[300px] p-0">
          {previewError ? (
            <div className="flex flex-col items-center justify-center text-zinc-500 text-center">
              <div className="text-8xl mb-6 opacity-60">{getMimeIcon(file?.mime_type)}</div>
              <p className="text-lg font-semibold text-zinc-300 mb-2">Preview unavailable</p>
              <button onClick={() => onDownload(file?.id)} className="btn-secondary mt-4">
                <Download className="w-4 h-4 mr-2" /> Download
              </button>
            </div>
          ) : isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={file?.name}
              className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
            />
          ) : isVideo && previewUrl ? (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-[65vh] rounded-xl shadow-lg"
            />
          ) : isPdf && previewUrl ? (
            <iframe
              src={`${previewUrl}#toolbar=0`}
              title={file?.name}
              className="w-full h-full min-h-[65vh] rounded-xl bg-white shadow-lg border-0"
            />
          ) : isText && textContent !== null ? (
            <div className="w-full h-full min-h-[300px] max-h-[65vh] overflow-auto bg-[#1A1A1A] p-4 text-left">
              <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{textContent}</pre>
            </div>
          ) : (isImage || isVideo || isPdf || isText) && !previewUrl && textContent === null ? (
            <div className="animate-pulse text-zinc-500">Loading preview...</div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 text-center">
              <div className="text-8xl mb-6 opacity-60">{getMimeIcon(file?.mime_type)}</div>
              <p className="text-lg font-semibold text-zinc-300 mb-2">No preview available</p>
              <p className="text-sm text-zinc-500 mb-8">This file type cannot be previewed in the browser.</p>
              <button
                onClick={() => onDownload(file?.id)}
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