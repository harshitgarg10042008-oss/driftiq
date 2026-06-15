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

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-zinc-950">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/share/:token" element={<ShareView />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="flex flex-1 h-full overflow-hidden">
                  <FileExplorer />
                </div>
              </ProtectedRoute>
            }
          />

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
