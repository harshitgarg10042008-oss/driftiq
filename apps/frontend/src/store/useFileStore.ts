import { create } from 'zustand';

interface FileItem {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  is_starred: boolean;
  is_deleted?: boolean;
  folder_id?: string | null;
  created_at: string;
}

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  parent_id?: string | null;
  created_at?: string;
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

interface FileStore {
  currentFolderId: string | null;
  breadcrumbs: Breadcrumb[];
  files: FileItem[];
  folders: FolderItem[];
  setFiles: (files: FileItem[]) => void;
  setFolders: (folders: FolderItem[]) => void;
  addFile: (file: FileItem) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
  navigateToFolder: (folderId: string, folderName: string) => void;
  navigateToBreadcrumb: (index: number) => void;
  goUp: () => void;
  goToRoot: () => void;
}

export const useFileStore = create<FileStore>((set) => ({
  currentFolderId: null,
  breadcrumbs: [{ id: null, name: 'My Drive' }],
  files: [],
  folders: [],

  setFiles: (files) => set({ files }),
  setFolders: (folders) => set({ folders }),

  addFile: (file) => set((state) => ({ files: [file, ...state.files] })),

  removeFile: (fileId) => set((state) => ({
    files: state.files.filter((f) => f.id !== fileId),
  })),

  updateFile: (fileId, updates) => set((state) => ({
    files: state.files.map((f) => f.id === fileId ? { ...f, ...updates } : f),
  })),

  navigateToFolder: (folderId, folderName) => set((state) => {
    // Prevent duplicate breadcrumb if already there
    if (state.currentFolderId === folderId) return state;
    return {
      currentFolderId: folderId,
      breadcrumbs: [...state.breadcrumbs, { id: folderId, name: folderName }],
    };
  }),

  navigateToBreadcrumb: (index) => set((state) => {
    if (index < 0 || index >= state.breadcrumbs.length) return state;
    const newBreadcrumbs = state.breadcrumbs.slice(0, index + 1);
    const target = newBreadcrumbs[newBreadcrumbs.length - 1];
    return {
      breadcrumbs: newBreadcrumbs,
      currentFolderId: target.id,
    };
  }),

  goUp: () => set((state) => {
    if (state.breadcrumbs.length <= 1) return state;
    const newBreadcrumbs = state.breadcrumbs.slice(0, -1);
    const parentFolder = newBreadcrumbs[newBreadcrumbs.length - 1];
    return {
      breadcrumbs: newBreadcrumbs,
      currentFolderId: parentFolder.id,
    };
  }),

  goToRoot: () => set({
    currentFolderId: null,
    breadcrumbs: [{ id: null, name: 'My Drive' }],
  }),
}));
