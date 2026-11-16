import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SyncProvider } from './lib/SyncProvider';
import { Add } from './pages/Add';
import { Connect } from './pages/Connect';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Tour } from './pages/Tour';

// Charts are the only heavy dependency; keep them out of the first paint so
// "open app, type amount, save" stays fast on a mid-range phone.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));

function PageFallback() {
  return (
    <div className="space-y-3 pt-2">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <SyncProvider>
        <Routes>
          <Route path="/connect" element={<Connect />} />
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
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SyncProvider>
    </HashRouter>
  );
}
