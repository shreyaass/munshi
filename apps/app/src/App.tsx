import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SyncProvider } from './lib/SyncProvider';
import { Add } from './pages/Add';
import { Accounts } from './pages/Accounts';
import { History } from './pages/History';
import { Goals } from './pages/Goals';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Tour } from './pages/Tour';
import { Landing } from './pages/Landing';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

// Charts are the only heavy dependency; keep them out of the first paint so
// "open app, type amount, save" stays fast on a mid-range phone.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));

function PageFallback() {
  return (
    <div className="space-y-3 pt-2">
      <div className="h-28 animate-pulse rounded-2xl bg-surface-muted " />
      <div className="h-24 animate-pulse rounded-xl bg-surface-muted " />
      <div className="h-40 animate-pulse rounded-xl bg-surface-muted " />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <SyncProvider>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/connect" element={<Navigate to="/tour?step=5" replace />} />
          <Route path="/welcome" element={<Onboarding />} />
          <Route path="/tour" element={<Tour />} />
          <Route element={<Layout />}>
            <Route index element={<Add />} />
            <Route path="history" element={<History />} />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route path="accounts" element={<Accounts />} />
            <Route path="goals" element={<Goals />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SyncProvider>
    </HashRouter>
  );
}
