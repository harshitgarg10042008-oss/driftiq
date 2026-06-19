import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuthStore } from './store/useAuthStore'

// Lazy loaded components for performance
const FileExplorer = lazy(() => import('./components/FileExplorer/FileExplorer').then(module => ({ default: module.FileExplorer })))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const ShareView = lazy(() => import('./pages/ShareView'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const TelegramConnect = lazy(() => import('./pages/TelegramConnect'))

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-zinc-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-9 h-9 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-zinc-600 font-medium tracking-widest uppercase">Loading</p>
    </div>
  </div>
);

export default function App() {
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public landing */}
          <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />

          {/* Auth pages */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public share view */}
          <Route path="/share/:token" element={<ShareView />} />

          {/* Telegram connect (semi-protected — accessible right after register) */}
          <Route path="/telegram-connect" element={<TelegramConnect />} />

          {/* Protected: main dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 h-full overflow-hidden">
                  <FileExplorer />
                </div>
              </ProtectedRoute>
            }
          />

          {/* Protected: settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 h-full overflow-hidden">
                  <Settings />
                </div>
              </ProtectedRoute>
            }
          />

          {/* Protected: admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <div className="flex flex-1 h-full overflow-hidden">
                  <AdminDashboard />
                </div>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  )
}
