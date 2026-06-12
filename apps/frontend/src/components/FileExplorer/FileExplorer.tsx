import { useEffect, useState, useCallback, useRef } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Upload, FolderPlus, Download, Trash2, Eye,
  Star, Edit3, Move, Search, Grid, List, HardDrive, Shield, RefreshCw, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { formatBytes, formatDate, getMimeIcon } from '../../lib/utils';
import api from '../../lib/api';
import { FilePreviewModal } from './FilePreviewModal';

type Section = 'drive' | 'starred' | 'trash';

export function FileExplorer() {
  const { user, logout } = useAuthStore();
  const {
    currentFolderId, breadcrumbs, files, folders,
    setFiles, setFolders, addFile, navigateToFolder, navigateToBreadcrumb,
  } = useFileStore();
  const toast = useToast();

  const [currentSection, setCurrentSection] = useState<Section>('drive');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveModal, setMoveModal] = useState<{ id: string; type: 'file' | 'folder' } | null>(null);
  const [moveToFolderId, setMoveToFolderId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; type: 'file' | 'folder' } | null>(null);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

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
      }
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, currentSection, setFiles, setFolders, toast]);

  useEffect(() => {
    fetchContents();
    setSelectedId(null);
  }, [fetchContents]);

  // WebSocket for real-time Telegram sync
  useEffect(() => {
    // Socket.io connects directly to backend (not through Vite proxy)
    const wsUrl = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace('/api', '')
      : 'http://localhost:4000';

    const socket = io(wsUrl, {
      query: { userId: user?.id },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('file_added', (newFile: any) => {
      if (currentSection === 'drive' && newFile.folder_id === currentFolderId) {
        addFile(newFile);
      }
      toast.show(`New file "${newFile.name}" synced from Telegram!`, 'success');
    });

    return () => { socket.disconnect(); };
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

  const handleUpload = async (fileList: FileList) => {
    if (currentSection !== 'drive') {
      toast.show('You can only upload files to My Drive', 'error');
      return;
    }

    const createdFolders = new Map<string, string>(); // path -> folderId

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append('file', file);

      let targetFolderId = currentFolderId;

      // Handle nested folders if uploaded via directory upload
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        parts.pop(); // Remove the file name itself
        
        if (parts.length > 0) {
          let parentId = currentFolderId || null;
          let currentPath = '';

          for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            if (!createdFolders.has(currentPath)) {
              try {
                const { data } = await api.post('/folders', { name: part, parentId });
                createdFolders.set(currentPath, data.id);
                // If it's a root-level new folder (created in the current view), add it to UI
                if (!parentId) {
                  setFolders(prev => [...prev, data]);
                }
              } catch (err) {
                console.error('Error creating nested folder:', err);
              }
            }
            parentId = createdFolders.get(currentPath)!;
          }
          
          if (parentId) {
            targetFolderId = parentId;
          }
        }
      }

      if (targetFolderId) formData.append('folderId', targetFolderId);

      try {
        const { data } = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Only add to UI if uploaded to the current viewed folder
        if (targetFolderId === currentFolderId) {
          addFile(data);
        }
        toast.show(`Uploaded "${file.name}"`, 'success');
      } catch (err: any) {
        toast.show(`Failed to upload "${file.name}": ${err.response?.data?.message || err.message}`, 'error');
      }
    }
    
    // Refresh contents if we uploaded folders to ensure UI is completely in sync
    if (createdFolders.size > 0) {
      fetchContents();
    }
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
      toast.show(err.response?.data?.message || 'Rename failed', 'error');
    }
    setRenameModal(null);
  };

  const handleDelete = async (id: string, type: 'file' | 'folder') => {
    try {
      const endpoint = type === 'file' ? `/files/${id}` : `/folders/${id}`;
      await api.delete(endpoint);
      toast.show(currentSection === 'trash' ? 'Permanently deleted' : 'Moved to trash', 'success');
      fetchContents();
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/files/${id}/restore`);
      toast.show('File restored', 'success');
      fetchContents();
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Restore failed', 'error');
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
      toast.show(err.response?.data?.message || 'Move failed', 'error');
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
      toast.show(err.response?.data?.message || 'Failed to create folder', 'error');
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      // Stream directly through the authenticated api instance
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
  const selectedFile = displayFiles.find(f => f.id === selectedId);
  const selectedFolder = folders.find(f => f.id === selectedId);
  const hasSelection = !!selectedFile || !!selectedFolder;

  return (
    <div className="flex w-full h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      
      {/* LEFT SIDEBAR (Unified App Layout) */}
      <div className="w-64 bg-zinc-950 border-r border-white/5 flex flex-col shrink-0 relative z-20">
        
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 shrink-0 border-b border-white/5">
          <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-500 tracking-tight">
            DriftIQ
          </Link>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-1 flex-1 overflow-y-auto">
          <button
            onClick={() => { setCurrentSection('drive'); navigateToBreadcrumb(0); }}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${currentSection === 'drive' ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            <HardDrive className="w-4 h-4 mr-3" />
            My Drive
          </button>
          <button
            onClick={() => setCurrentSection('starred')}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${currentSection === 'starred' ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            <Star className="w-4 h-4 mr-3" />
            Starred
          </button>
          <button
            onClick={() => setCurrentSection('trash')}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${currentSection === 'trash' ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Trash
          </button>
        </div>

        {/* User Profile Area at Bottom */}
        <div className="p-4 border-t border-white/5 bg-zinc-950">
          {user?.role === 'admin' && (
            <Link to="/admin" className="w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all mb-1">
              <Shield className="w-4 h-4 mr-3" /> Admin Panel
            </Link>
          )}
          <div className="flex items-center px-4 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium text-zinc-200 truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div
        className="flex-1 flex flex-col min-w-0 relative bg-zinc-950"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setSelectedId(null)}
      >
        <AnimatePresence>
          {isDragging && currentSection === 'drive' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-violet-500/10 border-2 border-dashed border-violet-500/50 rounded-2xl flex items-center justify-center backdrop-blur-sm m-6"
            >
              <div className="text-center">
                <Upload className="w-16 h-16 text-violet-400 mx-auto mb-4" />
                <p className="text-xl font-medium text-violet-300 tracking-tight">Drop files to upload</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header / Action Bar */}
        <div className="h-20 flex items-center justify-between px-8 shrink-0 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center space-x-1 text-sm font-medium text-zinc-400 overflow-x-auto">
            {currentSection === 'drive' ? breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id || 'root'} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-4 h-4 text-zinc-600 mx-2" />}
                <button
                  className={`hover:text-zinc-100 transition whitespace-nowrap px-3 py-1.5 rounded-md hover:bg-white/5 ${idx === breadcrumbs.length - 1 ? 'text-zinc-100' : ''}`}
                  onClick={(e) => { e.stopPropagation(); navigateToBreadcrumb(idx); }}
                >
                  {crumb.name}
                </button>
              </div>
            )) : (
              <span className="text-zinc-100 text-lg font-medium capitalize px-3">{currentSection}</span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-violet-400" />
              <input
                type="text"
                placeholder="Search files..."
                className="bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm w-48 focus:w-64 transition-all focus:ring-1 focus:ring-violet-500 outline-none text-zinc-100 placeholder-zinc-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="h-6 w-px bg-white/10 mx-2"></div>

            <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="p-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-white/5 transition">
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>

            {currentSection === 'drive' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setNewFolderModal(true)} className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-zinc-200 px-4 py-2 rounded-lg transition border border-white/5 text-sm font-medium">
                  <FolderPlus className="w-4 h-4" /> <span>New Folder</span>
                </button>
                <div className="flex rounded-lg overflow-hidden border border-violet-500/30">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 transition text-sm font-medium border-r border-white/10">
                    <Upload className="w-4 h-4" /> <span>Upload File</span>
                  </button>
                  <button onClick={() => folderInputRef.current?.click()} className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-3 py-2 transition text-sm font-medium" title="Upload Folder">
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto p-8 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 auto-rows-min' : 'flex flex-col gap-2 max-w-5xl mx-auto w-full'}`}>
            
            {/* Display Folders First */}
            {searchResults === null && folders.map((folder: any) => (
              viewMode === 'grid' ? (
                <motion.div
                  key={folder.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer select-none group relative ${selectedId === folder.id ? 'bg-violet-500/10 border-violet-500/50' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(folder.id); }}
                  onDoubleClick={() => navigateToFolder(folder.id, folder.name)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: 'folder' }); }}
                >
                  <div className="text-5xl mb-4 transform transition-transform group-hover:-translate-y-1">📁</div>
                  <span className="truncate w-full text-center text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{folder.name}</span>
                </motion.div>
              ) : (
                <div
                  key={folder.id}
                  className={`flex items-center px-5 py-3.5 rounded-xl cursor-pointer transition-colors group border ${selectedId === folder.id ? 'bg-violet-500/10 border-violet-500/50' : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03] hover:border-white/10'}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(folder.id); }}
                  onDoubleClick={() => navigateToFolder(folder.id, folder.name)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: 'folder' }); }}
                >
                  <span className="text-2xl mr-4">📁</span>
                  <span className="flex-1 truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{folder.name}</span>
                  <span className="text-xs text-zinc-500 font-medium">{formatDate(folder.created_at)}</span>
                </div>
              )
            ))}

            {/* Display Files */}
            {displayFiles.map((file: any) => (
              viewMode === 'grid' ? (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer select-none group relative ${selectedId === file.id ? 'bg-violet-500/10 border-violet-500/50' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(file.id); }}
                  onDoubleClick={() => { if (currentSection !== 'trash') setPreviewFile(file); }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); }}
                >
                  <div className="text-5xl mb-4 transform transition-transform group-hover:-translate-y-1">{getMimeIcon(file.mime_type)}</div>
                  <span className="truncate w-full text-center text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{file.name}</span>
                  <span className="text-xs text-zinc-500 mt-1.5 font-medium">{formatBytes(file.size)}</span>
                  
                  {currentSection !== 'trash' && (
                    <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleStar(file.id, file.is_starred); }} className="p-1.5 bg-zinc-900/90 rounded-md hover:bg-zinc-800 transition shadow-sm border border-white/10">
                        <Star className={`w-3.5 h-3.5 ${file.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-400'}`} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div
                  key={file.id}
                  className={`flex items-center px-5 py-3.5 rounded-xl cursor-pointer transition-colors group border ${selectedId === file.id ? 'bg-violet-500/10 border-violet-500/50' : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03] hover:border-white/10'}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(file.id); }}
                  onDoubleClick={() => { if (currentSection !== 'trash') setPreviewFile(file); }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); }}
                >
                  <span className="text-2xl mr-4">{getMimeIcon(file.mime_type)}</span>
                  <span className="flex-1 truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{file.name}</span>
                  <span className="text-xs text-zinc-500 font-medium w-24 text-right mr-6">{formatBytes(file.size)}</span>
                  <span className="text-xs text-zinc-500 font-medium w-32 text-right mr-6">{formatDate(file.created_at)}</span>
                  
                  {currentSection !== 'trash' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStar(file.id, file.is_starred); }} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 rounded-md">
                      <Star className={`w-4 h-4 ${file.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500'}`} />
                    </button>
                  )}
                </div>
              )
            ))}

            {displayFiles.length === 0 && folders.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-600">
                <div className="bg-white/5 p-6 rounded-full mb-6">
                  <Upload className="w-10 h-10 opacity-80" />
                </div>
                <p className="text-lg font-medium text-zinc-400">This section is empty</p>
                {currentSection === 'drive' && <p className="text-sm mt-2">Drag and drop files here to upload</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR (METADATA) - Sleeker look */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-zinc-950 border-l border-white/5 flex flex-col shrink-0 overflow-hidden relative z-20"
          >
            <div className="p-8 flex-1 overflow-y-auto">
              <div className="flex justify-center mb-8 pt-4">
                <div className="text-7xl drop-shadow-2xl">
                  {selectedFile ? getMimeIcon(selectedFile.mime_type) : '📁'}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-center mb-8 break-words text-zinc-100 tracking-tight">
                {selectedFile?.name || selectedFolder?.name}
              </h3>

              <div className="space-y-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 text-sm font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Type</span>
                    <span className="text-zinc-300 bg-white/5 px-2 py-1 rounded-md">{selectedFile ? (selectedFile.mime_type || 'Unknown') : 'Folder'}</span>
                  </div>
                  {selectedFile && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Size</span>
                      <span className="text-zinc-300">{formatBytes(selectedFile.size)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Created</span>
                    <span className="text-zinc-300">{formatDate(selectedFile?.created_at || selectedFolder?.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {currentSection !== 'trash' && selectedFile && (
                    <button onClick={() => setPreviewFile(selectedFile)} className="col-span-2 flex items-center justify-center py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl transition text-sm font-medium border border-white/5">
                      <Eye className="w-4 h-4 mr-2" /> Preview
                    </button>
                  )}
                  {currentSection !== 'trash' && selectedFile && (
                    <button onClick={() => handleDownload(selectedFile.id)} className="col-span-2 flex items-center justify-center py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition text-sm font-medium">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </button>
                  )}
                  {currentSection !== 'trash' && (
                    <button onClick={() => setRenameModal({ id: selectedId!, name: selectedFile?.name || selectedFolder?.name || '', type: selectedFile ? 'file' : 'folder' })} className="flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition text-sm font-medium border border-white/5">
                      <Edit3 className="w-4 h-4 mr-2" /> Rename
                    </button>
                  )}
                  {currentSection !== 'trash' && (
                    <button onClick={() => setMoveModal({ id: selectedId!, type: selectedFile ? 'file' : 'folder' })} className="flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition text-sm font-medium border border-white/5">
                      <Move className="w-4 h-4 mr-2" /> Move
                    </button>
                  )}
                  {currentSection === 'trash' && selectedFile && (
                    <button onClick={() => handleRestore(selectedFile.id)} className="flex items-center justify-center py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition text-sm font-medium border border-emerald-500/20">
                      <RefreshCw className="w-4 h-4 mr-2" /> Restore
                    </button>
                  )}
                  <button onClick={() => handleDelete(selectedId!, selectedFile ? 'file' : 'folder')} className={`col-span-2 flex items-center justify-center py-2.5 rounded-xl transition text-sm font-medium border ${currentSection === 'trash' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' : 'bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10'}`}>
                    <Trash2 className="w-4 h-4 mr-2" /> {currentSection === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {currentSection !== 'trash' && (
              <>
                {contextMenu.type === 'file' && (
                  <button className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setPreviewFile(contextMenu.item); setContextMenu(null); }}>
                    <Eye className="w-4 h-4 mr-3 text-zinc-500" /> Preview
                  </button>
                )}
                <button className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setRenameModal({ id: contextMenu.item.id, name: contextMenu.item.name, type: contextMenu.type }); setContextMenu(null); }}>
                  <Edit3 className="w-4 h-4 mr-3 text-zinc-500" /> Rename
                </button>
                <button className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { setMoveModal({ id: contextMenu.item.id, type: contextMenu.type }); setContextMenu(null); }}>
                  <Move className="w-4 h-4 mr-3 text-zinc-500" /> Move
                </button>
                {contextMenu.type === 'file' && (
                  <>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { handleDownload(contextMenu.item.id); setContextMenu(null); }}>
                      <Download className="w-4 h-4 mr-3 text-zinc-500" /> Download
                    </button>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition text-left" onClick={() => { handleStar(contextMenu.item.id, contextMenu.item.is_starred); setContextMenu(null); }}>
                      <Star className={`w-4 h-4 mr-3 ${contextMenu.item.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500'}`} /> {contextMenu.item.is_starred ? 'Unstar' : 'Star'}
                    </button>
                  </>
                )}
                <div className="border-t border-white/5 my-2" />
              </>
            )}
            
            {currentSection === 'trash' && contextMenu.type === 'file' && (
              <button className="w-full flex items-center px-4 py-2 text-sm hover:bg-emerald-500/10 transition text-left text-emerald-400" onClick={() => { handleRestore(contextMenu.item.id); setContextMenu(null); }}>
                <RefreshCw className="w-4 h-4 mr-3" /> Restore
              </button>
            )}

            <button className="w-full flex items-center px-4 py-2 text-sm hover:bg-red-500/10 transition text-red-400 text-left" onClick={() => { handleDelete(contextMenu.item.id, contextMenu.type); setContextMenu(null); }}>
              <Trash2 className="w-4 h-4 mr-3" /> {currentSection === 'trash' ? 'Delete Permanently' : 'Delete'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
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

      {/* New Folder Modal */}
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

      {/* Move Modal */}
      <Modal isOpen={!!moveModal} onClose={() => setMoveModal(null)} title="Move to">
        <div className="space-y-1 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
          <button
            onClick={() => setMoveToFolderId(null)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center transition-colors font-medium ${moveToFolderId === null ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-zinc-300 hover:bg-white/5 border border-transparent'}`}
          >
            <HardDrive className="w-4 h-4 mr-3" /> Root Directory
          </button>
          {folders.filter(f => f.id !== moveModal?.id).map((folder: any) => (
            <button
              key={folder.id}
              onClick={() => setMoveToFolderId(folder.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center transition-colors font-medium mt-1 ${moveToFolderId === folder.id ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-zinc-300 hover:bg-white/5 border border-transparent'}`}
            >
              <FolderPlus className="w-4 h-4 mr-3" /> {folder.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-white/5">
          <button type="button" onClick={() => setMoveModal(null)} className="px-5 py-2.5 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition font-medium">Cancel</button>
          <button type="button" onClick={handleMove} className="px-5 py-2.5 text-sm bg-violet-600 rounded-xl hover:bg-violet-500 text-white transition font-medium">Move Here</button>
        </div>
      </Modal>

      {/* File Preview Modal */}
      <FilePreviewModal 
        isOpen={!!previewFile} 
        onClose={() => setPreviewFile(null)} 
        file={previewFile} 
        onDownload={handleDownload} 
      />

    </div>
  );
}
