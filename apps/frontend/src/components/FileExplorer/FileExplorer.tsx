import { useEffect, useState, useCallback, useRef } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Upload, FolderPlus, Download, Trash2, Eye,
  Star, Edit3, Move, Search, Grid, List, HardDrive, Shield,
  RefreshCw, LogOut, Link as LinkIcon, Settings, Zap,
  Image, Film, Music, FileText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { formatBytes, formatDate, getMimeIcon } from '../../lib/utils';
import api from '../../lib/api';
import { FilePreviewModal } from './FilePreviewModal';
import { ShareModal } from './ShareModal';

type Section = 'drive' | 'starred' | 'trash' | 'documents' | 'pictures' | 'videos' | 'music';

/* ─── Avatar with initials ─────────────────────────────────────────────── */
function UserAvatar({ name }: { name?: string }) {
  const initials = (name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/20 shrink-0">
      {initials}
    </div>
  );
}

/* ─── Sidebar nav item ─────────────────────────────────────────────────── */
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}
function NavItem({ icon, label, active, onClick, count }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group ${active
          ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
        }`}
    >
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl bg-violet-500/10"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className={`relative z-10 ${active ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{icon}</span>
      <span className="relative z-10 flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className={`relative z-10 text-xs px-1.5 py-0.5 rounded-md font-semibold ${active ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-zinc-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── File skeleton loader ─────────────────────────────────────────────── */
function FileSkeleton({ mode }: { mode: 'grid' | 'list' }) {
  if (mode === 'grid') {
    return (
      <div className="flex flex-col items-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-white/5 mb-4" />
        <div className="w-20 h-3 bg-white/5 rounded-full mb-2" />
        <div className="w-12 h-2 bg-white/5 rounded-full" />
      </div>
    );
  }
  return (
    <div className="flex items-center px-5 py-3.5 rounded-xl border border-white/5 bg-white/[0.01] animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-white/5 mr-4" />
      <div className="flex-1 h-3 bg-white/5 rounded-full mr-6" />
      <div className="w-16 h-3 bg-white/5 rounded-full mr-4" />
      <div className="w-24 h-3 bg-white/5 rounded-full" />
    </div>
  );
}

/* ─── Inline file action buttons (list view) ───────────────────────────── */
interface FileActionsProps {
  file: any;
  onPreview: () => void;
  onRename: () => void;
  onMove: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onStar: () => void;
  isTrash?: boolean;
  onRestore?: () => void;
}
function FileActions({ file, onPreview, onRename, onMove, onDownload, onShare, onDelete, onStar, isTrash, onRestore }: FileActionsProps) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {!isTrash && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPreview(); }}
            title="Preview" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onStar(); }}
            title={file?.is_starred ? 'Unstar' : 'Star'} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Star className={`w-3.5 h-3.5 ${file?.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500 hover:text-yellow-400'}`} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRename(); }}
            title="Rename" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(); }}
            title="Move" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
            <Move className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }}
            title="Download" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onShare(); }}
            title="Share" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
        </>
      )}
      {isTrash && onRestore && (
        <button onClick={(e) => { e.stopPropagation(); onRestore(); }}
          title="Restore" className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title={isTrash ? 'Delete permanently' : 'Move to trash'}
        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────── */
export function FileExplorer() {
  const { user, logout } = useAuthStore();
  const {
    currentFolderId, breadcrumbs, files, folders,
    setFiles, setFolders, addFile, navigateToFolder, navigateToBreadcrumb,
  } = useFileStore();
  const toast = useToast();

  const [currentSection, setCurrentSection] = useState<Section>('drive');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Notepad
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [notepadText, setNotepadText] = useState(
    localStorage.getItem('driftiq-notes') || ''
  );

  // Modals
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveModal, setMoveModal] = useState<{ id: string; type: 'file' | 'folder' } | null>(null);
  const [moveToFolderId, setMoveToFolderId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<{ id: string; name: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; type: 'file' | 'folder' } | null>(null);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [stats, setStats] = useState<{ storageUsed: number, storageLimit: number } | null>(null);
  const [telegramConnected, setTelegramConnected] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ─── Fetch contents ──────────────────────────────────────────────────
  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      if (currentSection === 'drive') {
        const [filesRes, foldersRes] = await Promise.all([
          api.get('/files', { params: { folderId: currentFolderId || undefined } }),
          api.get('/folders', { params: { parentId: currentFolderId || undefined } }),
        ]);
        setFiles(filesRes.data);
        setFolders(foldersRes.data);
      } else if (currentSection === 'starred') {
        const { data } = await api.get('/files/starred');
        setFiles(data);
        setFolders([]);
      } else if (currentSection === 'trash') {
        const { data } = await api.get('/files/deleted');
        setFiles(data);
        setFolders([]);
      } else if (currentSection === 'pictures') {
        const { data } = await api.get('/files', { params: { mimeType: 'image' } });
        setFiles(data.filter((f: any) => f?.mime_type?.startsWith('image/')));
        setFolders([]);
      } else if (currentSection === 'videos') {
        const { data } = await api.get('/files', { params: { mimeType: 'video' } });
        setFiles(data.filter((f: any) => f?.mime_type?.startsWith('video/')));
        setFolders([]);
      } else if (currentSection === 'music') {
        const { data } = await api.get('/files', { params: { mimeType: 'audio' } });
        setFiles(data.filter((f: any) => f?.mime_type?.startsWith('audio/')));
        setFolders([]);
      } else if (currentSection === 'documents') {
        const { data } = await api.get('/files');
        setFiles(data.filter((f: any) =>
          f?.mime_type?.includes('pdf') ||
          f?.mime_type?.includes('document') ||
          f?.mime_type?.includes('word') ||
          f?.mime_type?.includes('text')
        ));
        setFolders([]);
      }
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, currentSection, setFiles, setFolders, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/files/stats');
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchTelegramStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/telegram-status');
      setTelegramConnected(
        data?.connected === true || data?.status === 'connected'
      );
    } catch {
      // Endpoint missing ya error — silently ignore, default false
      setTelegramConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
    fetchStats();
    setSelectedId(null);
  }, [fetchContents, fetchStats]);

  useEffect(() => {
    fetchTelegramStatus();
  }, [fetchTelegramStatus]);

  // WebSocket for real-time Telegram sync
  useEffect(() => {
    const wsUrl = (import.meta as any).env?.VITE_BACKEND_URL
      ? (import.meta as any).env.VITE_BACKEND_URL.replace('/api', '')
      : 'http://localhost:4000';

    let socket: any = null;

    try {
      socket = io(wsUrl, {
        query: { userId: user?.id },
        transports: ['polling'],
        reconnectionAttempts: 3,
        timeout: 5000,
      });

      socket.on('connect_error', () => {
        // silently ignore
      });

      socket.on('file_added', (newFile: any) => {
        if (
          currentSection === 'drive' &&
          newFile?.folder_id === currentFolderId
        ) {
          addFile(newFile);
        }
        toast.show(
          `New file "${newFile?.name}" synced from Telegram!`,
          'success'
        );
      });

      socketRef.current = socket;
    } catch {
      // ignore socket errors entirely
    }

    return () => {
      try {
        socket?.disconnect();
      } catch {}
    };
  }, [user?.id, currentSection, currentFolderId, addFile, toast]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/files/search', { params: { q: searchQuery } });
        setSearchResults(data);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Handlers — all original, untouched ─────────────────────────────
  const handleUpload = async (fileList: FileList) => {
    if (currentSection !== 'drive') {
      toast.show('You can only upload files to My Drive', 'error');
      return;
    }

    const createdFolders = new Map<string, string>();

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append('file', file);

      let targetFolderId = currentFolderId;

      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        parts.pop();

        if (parts.length > 0) {
          let parentId = currentFolderId || null;
          let currentPath = '';

          for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!createdFolders.has(currentPath)) {
              try {
                const { data } = await api.post('/folders', { name: part, parentId });
                createdFolders.set(currentPath, data.id);
                if (!parentId) {
                  const currentFolders = useFileStore.getState().folders;
                  setFolders([...currentFolders, data]);
                }
              } catch (err) {
                console.error('Error creating nested folder:', err);
              }
            }
            parentId = createdFolders.get(currentPath)!;
          }

          if (parentId) targetFolderId = parentId;
        }
      }

      if (targetFolderId) formData.append('folderId', targetFolderId);

      try {
        const { data } = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (targetFolderId === currentFolderId) addFile(data);
        toast.show(`Uploaded "${file.name}"`, 'success');
      } catch (err: any) {
        toast.show(`Failed to upload "${file.name}": ${err?.response?.data?.message || err.message}`, 'error');
      }
    }

    if (createdFolders.size > 0) fetchContents();
    fetchStats();
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  const handleRename = async (id: string, name: string, type: 'file' | 'folder') => {
    try {
      const endpoint = type === 'file' ? `/files/${id}/rename` : `/folders/${id}/rename`;
      await api.put(endpoint, { name });
      toast.show('Renamed successfully', 'success');
      fetchContents();
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Rename failed', 'error');
    }
    setRenameModal(null);
  };

  const handleDelete = async (id: string, type: 'file' | 'folder') => {
    try {
      const endpoint = type === 'file' ? `/files/${id}` : `/folders/${id}`;
      await api.delete(endpoint);
      toast.show(currentSection === 'trash' ? 'Permanently deleted' : 'Moved to trash', 'success');
      fetchContents();
      fetchStats();
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await api.delete('/files/trash/empty');
      toast.show('Trash emptied successfully', 'success');
      fetchContents();
      fetchStats();
      setSelectedId(null);
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Failed to empty trash', 'error');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/files/${id}/restore`);
      toast.show('File restored', 'success');
      fetchContents();
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Restore failed', 'error');
    }
  };

  const handleMove = async () => {
    if (!moveModal) return;
    try {
      const endpoint = moveModal.type === 'file' ? `/files/${moveModal.id}/move` : `/folders/${moveModal.id}/move`;
      await api.post(endpoint, { folderId: moveToFolderId });
      toast.show('Moved successfully', 'success');
      fetchContents();
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Move failed', 'error');
    }
    setMoveModal(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.post('/folders', { name: newFolderName, parentId: currentFolderId || undefined });
      toast.show(`Folder "${newFolderName}" created`, 'success');
      setNewFolderName('');
      setNewFolderModal(false);
      fetchContents();
    } catch (err: any) {
      toast.show(err?.response?.data?.message || 'Failed to create folder', 'error');
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const response = await api.get(`/files/${fileId}/stream`, { responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'] || '';
      const nameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      const fileName = nameMatch?.[1] || fileId;
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.show('Download failed', 'error');
    }
  };

  const handleStar = async (fileId: string, current: boolean) => {
    try {
      await api.put(`/files/${fileId}/star`, { isStarred: !current });
      fetchContents();
    } catch (err: any) {
      toast.show('Failed to update star', 'error');
    }
  };

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const displayFiles = searchResults !== null ? searchResults : files;
  const selectedFile = displayFiles.find(f => f?.id === selectedId);
  const selectedFolder = folders.find(f => f?.id === selectedId);
  const hasSelection = !!selectedFile || !!selectedFolder;

  const storagePercent = stats ? Math.min(100, (stats.storageUsed / stats.storageLimit) * 100) : 0;
  const sectionLabel = currentSection === 'drive' ? 'My Drive'
    : currentSection === 'starred' ? 'Starred'
      : currentSection === 'trash' ? 'Trash'
        : currentSection === 'documents' ? 'Documents'
          : currentSection === 'pictures' ? 'Pictures'
            : currentSection === 'videos' ? 'Videos'
              : 'Music';

  return (
    <div className="flex w-full h-full bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
      <div className="w-[240px] bg-zinc-950 border-r border-white/[0.06] flex flex-col shrink-0 relative z-20">

        {/* Logo */}
        <div className="h-[64px] flex items-center px-5 shrink-0 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="DriftIQ"
              className="w-7 h-7 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="font-black italic text-base tracking-tight select-none">
              <span className="text-white">Drift</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">IQ</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">

          {/* Main section */}
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-2">Main</p>
          <NavItem
            icon={<HardDrive className="w-4 h-4" />}
            label="My Drive"
            active={currentSection === 'drive'}
            onClick={() => { setCurrentSection('drive'); navigateToBreadcrumb(0); }}
          />
          <NavItem
            icon={<Star className="w-4 h-4" />}
            label="Starred"
            active={currentSection === 'starred'}
            onClick={() => setCurrentSection('starred')}
          />

          {/* Categories */}
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mt-4 mb-2">Categories</p>
          <NavItem
            icon={<FileText className="w-4 h-4" />}
            label="Documents"
            active={currentSection === 'documents'}
            onClick={() => setCurrentSection('documents')}
          />
          <NavItem
            icon={<Image className="w-4 h-4" />}
            label="Pictures"
            active={currentSection === 'pictures'}
            onClick={() => setCurrentSection('pictures')}
          />
          <NavItem
            icon={<Film className="w-4 h-4" />}
            label="Videos"
            active={currentSection === 'videos'}
            onClick={() => setCurrentSection('videos')}
          />
          <NavItem
            icon={<Music className="w-4 h-4" />}
            label="Music"
            active={currentSection === 'music'}
            onClick={() => setCurrentSection('music')}
          />

          {/* Other */}
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mt-4 mb-2">Other</p>
          <NavItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Trash"
            active={currentSection === 'trash'}
            onClick={() => setCurrentSection('trash')}
          />
          <Link to="/settings">
            <NavItem
              icon={<Settings className="w-4 h-4" />}
              label="Settings"
              active={false}
              onClick={() => { }}
            />
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin">
              <NavItem
                icon={<Shield className="w-4 h-4" />}
                label="Admin Panel"
                active={false}
                onClick={() => { }}
              />
            </Link>
          )}
          {telegramConnected === false && (
            <Link to="/telegram-connect">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2AABEE]/10 border border-[#2AABEE]/20 text-[#2AABEE] text-xs font-medium hover:bg-[#2AABEE]/20 transition mt-2">
                <Zap className="w-3.5 h-3.5" /> Connect Telegram
              </button>
            </Link>
          )}
        </div>

        {/* Storage bar */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-400">Storage</span>
              <span className="text-xs font-bold text-zinc-400">{storagePercent.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 mb-2">
              {stats && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: storagePercent > 80
                      ? 'linear-gradient(90deg, #ef4444, #f97316)'
                      : storagePercent > 50
                        ? 'linear-gradient(90deg, #8b5cf6, #f59e0b)'
                        : 'linear-gradient(90deg, #7c3aed, #6366f1)',
                  }}
                />
              )}
            </div>
            <div className="text-[11px] text-zinc-600 font-medium">
              {stats
                ? `${formatBytes(stats.storageUsed)} of ${formatBytes(stats.storageLimit)}`
                : 'Loading...'}
            </div>
          </div>
        </div>

        {/* User card */}
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">
          {/* Telegram status */}
          {telegramConnected !== null && (
            telegramConnected ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <Zap className="w-3 h-3" />
                Telegram connected
              </div>
            ) : (
              <Link to="/telegram-connect" className="block mb-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-zinc-500 hover:bg-white/10 transition">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-600" />
                  <Zap className="w-3 h-3" />
                  Telegram not linked
                </div>
              </Link>
            )
          )}

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <UserAvatar name={user?.full_name || user?.username} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.full_name || user?.username || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[11px] text-zinc-600 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0 relative bg-zinc-950"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setSelectedId(null)}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && currentSection === 'drive' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-4 z-30 bg-violet-500/8 border-2 border-dashed border-violet-500/50 rounded-3xl flex items-center justify-center backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-lg font-semibold text-violet-300">Drop files to upload</p>
                <p className="text-sm text-violet-400/60 mt-1">Release to upload to {sectionLabel}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
        <input ref={folderInputRef} type="file" className="hidden" webkitdirectory="" onChange={(e) => e.target.files && handleUpload(e.target.files)} />

        {/* Top bar */}
        <div className="h-[64px] flex items-center justify-between px-6 shrink-0 border-b border-white/[0.06] bg-zinc-950/90 backdrop-blur-md sticky top-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-1 text-sm font-medium text-zinc-400 overflow-x-auto">
            {currentSection === 'drive' ? breadcrumbs.map((crumb, idx) => (
              <div key={crumb?.id || 'root'} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-4 h-4 text-zinc-700 mx-1" />}
                <button
                  className={`hover:text-zinc-100 transition whitespace-nowrap px-2 py-1 rounded-lg hover:bg-white/5 ${idx === breadcrumbs.length - 1 ? 'text-zinc-100 font-semibold' : ''}`}
                  onClick={(e) => { e.stopPropagation(); navigateToBreadcrumb(idx); }}
                >
                  {crumb?.name}
                </button>
              </div>
            )) : (
              <span className="text-zinc-100 font-semibold px-2">{sectionLabel}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="text"
                placeholder="Search files..."
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2 text-xs w-44 focus:w-60 transition-all duration-200 focus:ring-1 focus:ring-violet-500/50 outline-none text-zinc-200 placeholder-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/[0.08]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentSection === 'drive' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewFolderModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium rounded-xl transition border border-white/[0.08]"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> New Folder
                </button>
                <div className="flex rounded-xl overflow-hidden border border-violet-500/30">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 transition text-xs font-semibold border-r border-white/10"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    title="Upload Folder"
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-3 py-2 transition text-xs font-semibold"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {currentSection === 'trash' && (
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl transition border border-red-500/20 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Empty Trash
              </button>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        {/* Trash info banner */}
        {currentSection === 'trash' && (
          <div className="bg-amber-500/5 border-b border-amber-500/10 py-2.5 px-6 text-center">
            <p className="text-xs text-amber-400/80 font-medium">
              Items in trash are permanently deleted after 30 days.
            </p>
          </div>
        )}

        {/* ── LIST HEADER (list mode) ───────────────────────────────────── */}
        {!loading && viewMode === 'list' && (displayFiles.length > 0 || folders.length > 0) && (
          <div className="flex items-center px-6 py-2 border-b border-white/[0.04] text-[11px] font-semibold text-zinc-600 uppercase tracking-widest">
            <span className="w-8 mr-4" />
            <span className="flex-1">Name</span>
            <span className="w-28 text-right mr-6">Modified</span>
            <span className="w-20 text-right mr-6">Size</span>
            <span className="w-32 text-right">Actions</span>
          </div>
        )}

        {/* ── FILE LIST / GRID ──────────────────────────────────────────── */}
        {loading ? (
          <div className={`flex-1 overflow-y-auto p-6 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-min' : 'flex flex-col gap-1.5'}`}>
            {Array.from({ length: 8 }).map((_, i) => <FileSkeleton key={i} mode={viewMode} />)}
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto ${viewMode === 'grid' ? 'p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-min' : 'px-3 py-3 flex flex-col gap-1'}`}>

            {/* ── FOLDERS ─────────────────────────────────────────────── */}
            {searchResults === null && folders.map((folder: any) => (
              viewMode === 'grid' ? (
                <motion.div
                  key={folder?.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all cursor-pointer select-none group relative ${selectedId === folder?.id
                      ? 'bg-violet-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(folder?.id); }}
                  onDoubleClick={() => navigateToFolder(folder?.id, folder?.name)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: 'folder' }); }}
                >
                  <div className="text-4xl mb-3 transform transition-transform duration-200 group-hover:-translate-y-1">📁</div>
                  <span className="truncate w-full text-center text-xs font-semibold text-zinc-300 group-hover:text-zinc-100">{folder?.name}</span>
                  <span className="text-[10px] text-zinc-600 mt-1">{formatDate(folder?.created_at)}</span>
                </motion.div>
              ) : (
                <div
                  key={folder?.id}
                  className={`flex items-center px-4 py-2.5 rounded-xl cursor-pointer transition-all group border ${selectedId === folder?.id
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]'
                    }`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(folder?.id); }}
                  onDoubleClick={() => navigateToFolder(folder?.id, folder?.name)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: 'folder' }); }}
                >
                  <span className="text-xl mr-4 w-8 text-center shrink-0">📁</span>
                  <span className="flex-1 truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{folder?.name}</span>
                  <span className="text-xs text-zinc-600 w-28 text-right mr-6 shrink-0">{formatDate(folder?.created_at)}</span>
                  <span className="text-xs text-zinc-600 w-20 text-right mr-6 shrink-0">—</span>
                  {/* Folder actions */}
                  <div className="w-32 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setRenameModal({ id: folder?.id, name: folder?.name, type: 'folder' }); }}
                      title="Rename" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMoveModal({ id: folder?.id, type: 'folder' }); }}
                      title="Move" className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(folder?.id, 'folder'); }}
                      title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            ))}

            {/* ── FILES ───────────────────────────────────────────────── */}
            {displayFiles.map((file: any) => (
              viewMode === 'grid' ? (
                <motion.div
                  key={file?.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all cursor-pointer select-none group relative ${selectedId === file?.id
                      ? 'bg-violet-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(file?.id); }}
                  onDoubleClick={() => { if (currentSection !== 'trash') setPreviewFile(file); }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); }}
                >
                  <div className="text-4xl mb-3 transform transition-transform duration-200 group-hover:-translate-y-1">{getMimeIcon(file?.mime_type)}</div>
                  <span className="truncate w-full text-center text-xs font-semibold text-zinc-300 group-hover:text-zinc-100">{file?.name}</span>
                  <span className="text-[10px] text-zinc-600 mt-1">{formatBytes(file?.size)}</span>

                  {currentSection !== 'trash' && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStar(file?.id, file?.is_starred); }}
                        className="p-1.5 bg-zinc-900/90 rounded-lg hover:bg-zinc-800 transition border border-white/10"
                      >
                        <Star className={`w-3 h-3 ${file?.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500'}`} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* ── LIST ROW ─────────────────────────────────────────── */
                <div
                  key={file?.id}
                  className={`flex items-center px-4 py-2.5 rounded-xl cursor-pointer transition-all group border hover:border-l-2 hover:border-l-violet-500 ${selectedId === file?.id
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-y-white/[0.06] hover:border-r-white/[0.06]'
                    }`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(file?.id); }}
                  onDoubleClick={() => { if (currentSection !== 'trash') setPreviewFile(file); }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); }}
                >
                  <span className="text-lg mr-4 w-8 text-center shrink-0">{getMimeIcon(file?.mime_type)}</span>
                  <span className="flex-1 truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{file?.name}</span>
                  <span className="text-xs text-zinc-600 w-28 text-right mr-6 shrink-0">{formatDate(file?.created_at)}</span>
                  <span className="text-xs text-zinc-600 w-20 text-right mr-6 shrink-0">{formatBytes(file?.size)}</span>
                  <div className="w-32 flex justify-end shrink-0">
                    <FileActions
                      file={file}
                      onPreview={() => setPreviewFile(file)}
                      onRename={() => setRenameModal({ id: file?.id, name: file?.name, type: 'file' })}
                      onMove={() => setMoveModal({ id: file?.id, type: 'file' })}
                      onDownload={() => handleDownload(file?.id)}
                      onShare={() => setShareModal({ id: file?.id, name: file?.name })}
                      onDelete={() => handleDelete(file?.id, 'file')}
                      onStar={() => handleStar(file?.id, file?.is_starred)}
                      isTrash={currentSection === 'trash'}
                      onRestore={() => handleRestore(file?.id)}
                    />
                  </div>
                </div>
              )
            ))}

            {/* Empty state */}
            {displayFiles.length === 0 && folders.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-zinc-600">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex flex-col items-center p-12 rounded-3xl border-2 border-dashed transition-colors ${
                    isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(124,58,237,0.2)]">
                      <Upload className="w-10 h-10 text-violet-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400 mb-2">
                    {currentSection === 'trash' ? 'Trash is empty' : 'Drop files to get started'}
                  </h3>
                  {currentSection === 'drive' && (
                    <>
                      <p className="text-sm text-zinc-500 mb-8 text-center max-w-sm">
                        Drag & drop files here, or use the buttons below to upload files or create a new folder.
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all"
                        >
                          <Upload className="w-4 h-4" /> Upload File
                        </button>
                        <button
                          onClick={() => setNewFolderModal(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-xl border border-white/10 transition-all"
                        >
                          <FolderPlus className="w-4 h-4" /> New Folder
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT METADATA PANEL ───────────────────────────────────────── */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="bg-zinc-950 border-l border-white/[0.06] flex flex-col shrink-0 overflow-hidden relative z-20"
          >
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-center mb-6 pt-2">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-5xl">
                  {selectedFile ? getMimeIcon(selectedFile?.mime_type) : '📁'}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-center mb-6 break-words text-zinc-100 leading-snug">
                {selectedFile?.name || selectedFolder?.name}
              </h3>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3 text-xs mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium">Type</span>
                  <span className="text-zinc-300 bg-white/5 px-2 py-1 rounded-lg font-mono text-[10px]">
                    {selectedFile ? (selectedFile?.mime_type || 'Unknown') : 'Folder'}
                  </span>
                </div>
                {selectedFile && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Size</span>
                    <span className="text-zinc-300 font-semibold">{formatBytes(selectedFile?.size)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium">Created</span>
                  <span className="text-zinc-300">{formatDate(selectedFile?.created_at || selectedFolder?.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {currentSection !== 'trash' && selectedFile && (
                  <button onClick={() => setPreviewFile(selectedFile)} className="col-span-2 flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-xl transition text-xs font-semibold border border-white/[0.06]">
                    <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                  </button>
                )}
                {currentSection !== 'trash' && selectedFile && (
                  <button onClick={() => handleDownload(selectedFile?.id)} className="col-span-2 flex items-center justify-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition text-xs font-semibold">
                    <Download className="w-3.5 h-3.5 mr-2" /> Download
                  </button>
                )}
                {currentSection !== 'trash' && (
                  <button onClick={() => setRenameModal({ id: selectedId!, name: selectedFile?.name || selectedFolder?.name || '', type: selectedFile ? 'file' : 'folder' })} className="flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition text-xs font-semibold border border-white/[0.06]">
                    <Edit3 className="w-3.5 h-3.5 mr-2" /> Rename
                  </button>
                )}
                {currentSection !== 'trash' && selectedFile && (
                  <button onClick={() => setShareModal({ id: selectedId!, name: selectedFile?.name })} className="flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition text-xs font-semibold border border-white/[0.06]">
                    <LinkIcon className="w-3.5 h-3.5 mr-2" /> Share
                  </button>
                )}
                {currentSection !== 'trash' && (
                  <button onClick={() => setMoveModal({ id: selectedId!, type: selectedFile ? 'file' : 'folder' })} className="col-span-2 flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition text-xs font-semibold border border-white/[0.06]">
                    <Move className="w-3.5 h-3.5 mr-2" /> Move
                  </button>
                )}
                {currentSection === 'trash' && selectedFile && (
                  <button onClick={() => handleRestore(selectedFile?.id)} className="flex items-center justify-center py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition text-xs font-semibold border border-emerald-500/20">
                    <RefreshCw className="w-3.5 h-3.5 mr-2" /> Restore
                  </button>
                )}
                <button onClick={() => handleDelete(selectedId!, selectedFile ? 'file' : 'folder')} className={`col-span-2 flex items-center justify-center py-2.5 rounded-xl transition text-xs font-semibold border ${currentSection === 'trash' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' : 'bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10'}`}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  {currentSection === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTEXT MENU ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 w-52 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {currentSection !== 'trash' && (
              <>
                {contextMenu.type === 'file' && (
                  <button className="w-full flex items-center px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setPreviewFile(contextMenu.item); setContextMenu(null); }}>
                    <Eye className="w-3.5 h-3.5 mr-3 text-zinc-500" /> Preview
                  </button>
                )}
                <button className="w-full flex items-center px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setRenameModal({ id: contextMenu.item?.id, name: contextMenu.item?.name, type: contextMenu.type }); setContextMenu(null); }}>
                  <Edit3 className="w-3.5 h-3.5 mr-3 text-zinc-500" /> Rename
                </button>
                <button className="w-full flex items-center px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setMoveModal({ id: contextMenu.item?.id, type: contextMenu.type }); setContextMenu(null); }}>
                  <Move className="w-3.5 h-3.5 mr-3 text-zinc-500" /> Move
                </button>
                {contextMenu.type === 'file' && (
                  <>
                    <button className="w-full flex items-center px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { handleDownload(contextMenu.item?.id); setContextMenu(null); }}>
                      <Download className="w-3.5 h-3.5 mr-3 text-zinc-500" /> Download
                    </button>
                    <button className="w-full flex items-center px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setShareModal({ id: contextMenu.item?.id, name: contextMenu.item?.name }); setContextMenu(null); }}>
                      <LinkIcon className="w-3.5 h-3.5 mr-3 text-zinc-500" /> Share
                    </button>
                    <button className="w-full flex items-center px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { handleStar(contextMenu.item?.id, contextMenu.item?.is_starred); setContextMenu(null); }}>
                      <Star className={`w-3.5 h-3.5 mr-3 ${contextMenu.item?.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500'}`} />
                      {contextMenu.item?.is_starred ? 'Unstar' : 'Star'}
                    </button>
                  </>
                )}
                <div className="border-t border-white/5 my-1.5" />
              </>
            )}

            {currentSection === 'trash' && contextMenu.type === 'file' && (
              <button className="w-full flex items-center px-4 py-2.5 text-xs hover:bg-emerald-500/10 transition text-left text-emerald-400" onClick={() => { handleRestore(contextMenu.item?.id); setContextMenu(null); }}>
                <RefreshCw className="w-3.5 h-3.5 mr-3" /> Restore
              </button>
            )}

            <button className="w-full flex items-center px-4 py-2.5 text-xs hover:bg-red-500/10 transition text-red-400 text-left" onClick={() => { handleDelete(contextMenu.item?.id, contextMenu.type); setContextMenu(null); }}>
              <Trash2 className="w-3.5 h-3.5 mr-3" />
              {currentSection === 'trash' ? 'Delete Permanently' : 'Delete'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}
      <Modal isOpen={!!renameModal} onClose={() => setRenameModal(null)} title="Rename">
        {renameModal && (
          <form onSubmit={(e) => { e.preventDefault(); handleRename(renameModal.id, renameModal.name, renameModal.type); }}>
            <input
              type="text"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-violet-500 outline-none mb-6 text-sm"
              value={renameModal.name}
              onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setRenameModal(null)} className="px-5 py-2.5 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition font-medium">Cancel</button>
              <button type="submit" className="px-5 py-2.5 text-sm bg-violet-600 rounded-xl hover:bg-violet-500 text-white transition font-medium">Rename</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={newFolderModal} onClose={() => setNewFolderModal(false)} title="New Folder">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}>
          <input
            type="text"
            placeholder="Folder name"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-violet-500 outline-none mb-6 text-sm"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setNewFolderModal(false)} className="px-5 py-2.5 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition font-medium">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm bg-violet-600 rounded-xl hover:bg-violet-500 text-white transition font-medium">Create</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!moveModal} onClose={() => setMoveModal(null)} title="Move to">
        <div className="space-y-1 mb-6 max-h-60 overflow-y-auto pr-2">
          <button
            onClick={() => setMoveToFolderId(null)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center transition-colors font-medium ${moveToFolderId === null ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-zinc-300 hover:bg-white/5 border border-transparent'}`}
          >
            <HardDrive className="w-4 h-4 mr-3" /> Root Directory
          </button>
          {folders.filter(f => f?.id !== moveModal?.id).map((folder: any) => (
            <button
              key={folder?.id}
              onClick={() => setMoveToFolderId(folder?.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center transition-colors font-medium mt-1 ${moveToFolderId === folder?.id ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-zinc-300 hover:bg-white/5 border border-transparent'}`}
            >
              <FolderPlus className="w-4 h-4 mr-3" /> {folder?.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-white/5">
          <button type="button" onClick={() => setMoveModal(null)} className="px-5 py-2.5 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition font-medium">Cancel</button>
          <button type="button" onClick={handleMove} className="px-5 py-2.5 text-sm bg-violet-600 rounded-xl hover:bg-violet-500 text-white transition font-medium">Move Here</button>
        </div>
      </Modal>

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onDownload={handleDownload}
      />

      {shareModal && (
        <ShareModal
          isOpen={!!shareModal}
          onClose={() => setShareModal(null)}
          fileId={shareModal.id}
          fileName={shareModal.name}
        />
      )}

      {/* Notepad panel */}
      <AnimatePresence>
        {notepadOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-zinc-300">Quick Notes</span>
              </div>
              <button onClick={() => setNotepadOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={notepadText}
              onChange={(e) => {
                setNotepadText(e.target.value);
                localStorage.setItem('driftiq-notes', e.target.value);
              }}
              placeholder="Jot down something..."
              className="w-full h-52 bg-transparent px-4 py-3 text-xs text-zinc-300 placeholder-zinc-600 resize-none outline-none"
            />
            <div className="px-4 py-2 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-zinc-600">Auto-saved</span>
              <button
                onClick={() => {
                  setNotepadText('');
                  localStorage.removeItem('driftiq-notes');
                }}
                className="text-[10px] text-zinc-600 hover:text-red-400 transition"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notepad FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setNotepadOpen(!notepadOpen)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 flex items-center justify-center"
        >
          <Edit3 className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  );
}
