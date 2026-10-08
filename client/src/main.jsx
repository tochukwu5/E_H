import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './index.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicLayout, AppLayout } from './components/layout';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';
import ServerStatus from './components/ServerStatus';

const Jobs = lazy(() => import('./pages/Jobs'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const Pricing = lazy(() => import('./pages/Pricing'));
const AtsChecker = lazy(() => import('./pages/AtsChecker'));
const Sources = lazy(() => import('./pages/Sources'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/app/Onboarding'));
const Overview = lazy(() => import('./pages/app/Overview'));
const Matches = lazy(() => import('./pages/app/Matches'));
const Applications = lazy(() => import('./pages/app/Applications'));
const Searches = lazy(() => import('./pages/app/Searches'));
const Settings = lazy(() => import('./pages/app/Settings'));
const Admin = lazy(() => import('./pages/admin/Admin'));

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

const Loading = () => <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-7 w-7" /></div>;

function RequireAuth({ children, admin, allowUnonboarded }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/app" replace />;
  if (!allowUnonboarded && !user.onboarded && user.role !== 'admin') return <Navigate to="/app/onboarding" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/app" replace /> : children;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />;
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:slug" element={<JobDetail />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="tools/ats-checker" element={<AtsChecker />} />
          <Route path="sources" element={<Sources />} />
          <Route path="privacy" element={<Legal kind="privacy" />} />
          <Route path="terms" element={<Legal kind="terms" />} />
          <Route path="login" element={<GuestOnly><Auth mode="login" /></GuestOnly>} />
          <Route path="register" element={<GuestOnly><Auth mode="register" /></GuestOnly>} />
          <Route path="forgot-password" element={<Auth mode="forgot" />} />
          <Route path="reset-password" element={<Auth mode="reset" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="app/onboarding" element={<RequireAuth allowUnonboarded><Onboarding /></RequireAuth>} />
        <Route path="app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="matches" element={<Matches />} />
          <Route path="applications" element={<Applications />} />
          <Route path="searches" element={<Searches />} />
          <Route path="settings" element={<Navigate to="/app/settings/profile" replace />} />
          <Route path="settings/:tab" element={<Settings />} />
        </Route>
        <Route path="admin" element={<RequireAuth admin><AppLayout /></RequireAuth>}>
          <Route index element={<Admin />} />
          <Route path=":tab" element={<Admin />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ServerStatus />
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
            <ThemedToaster />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
