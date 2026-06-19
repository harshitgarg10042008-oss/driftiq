/// <reference types="vite/client" />

// Extend React's HTML input attributes to support webkitdirectory
// (used for folder uploads in FileExplorer)
declare namespace React {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    mozdirectory?: string;
  }
}
