import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Logo } from './components/Logo';
import { Layout } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { FeesPage } from './pages/FeesPage';
import { LoginPage } from './pages/LoginPage';
import { MarksPage } from './pages/MarksPage';
import { PortalPage } from './pages/PortalPage';
import { ScannerPage } from './pages/ScannerPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { StudentsPage } from './pages/StudentsPage';

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Logo />
      <p className="font-display text-2xl">Opening the class…</p>
    </div>
  );
}

function ServerDown() {
  const { error, reload } = useApp();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-8 text-center">
        <Logo className="mx-auto" />
        <h1 className="mt-4 font-display text-3xl">Server is quiet</h1>
        <p className="mt-2 text-sm text-ink/70">{error || 'The class server is not running.'}</p>
        <button type="button" className="btn-primary mt-5" onClick={() => void reload()}>
          Try again
        </button>
      </div>
    </div>
  );
}

function AdminRoute() {
  const { config, role, exitTo } = useApp();
  if (exitTo) return <Navigate to={exitTo} replace />;
  if (role === 'student') return <Navigate to="/student" replace />;
  if (config?.authRequired && role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

function StudentRoute() {
  const { role, exitTo } = useApp();
  if (exitTo) return <Navigate to={exitTo} replace />;
  if (role !== 'student') return <Navigate to="/student/login" replace />;
  return <Outlet />;
}

function Gate() {
  const { ready, error, config } = useApp();
  if (!ready) return <Splash />;
  if (error || !config) return <ServerDown />;
  return (
    <Routes>
      <Route path="/" element={<PortalPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route element={<AdminRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<ScannerPage />} />
          <Route path="/admin/students" element={<StudentsPage />} />
          <Route path="/admin/fees" element={<FeesPage />} />
          <Route path="/admin/marks" element={<MarksPage />} />
        </Route>
      </Route>
      <Route element={<StudentRoute />}>
        <Route path="/student" element={<StudentDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AppProvider>
  );
}
