import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy-load pages per ENGINEERING.md §3
const Home = lazy(() => import('./pages/Home'));
const Capture = lazy(() => import('./pages/Capture'));
const Ask = lazy(() => import('./pages/Ask'));
const GuidedJob = lazy(() => import('./pages/GuidedJob'));
const MachineMap = lazy(() => import('./pages/MachineMap'));
const Handover = lazy(() => import('./pages/Handover'));
const Review = lazy(() => import('./pages/Review'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm font-medium">Loading Blueprint...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary title="Section Error">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/capture" element={<Capture />} />
              <Route path="/ask" element={<Ask />} />
              <Route path="/guide" element={<GuidedJob />} />
              <Route path="/map" element={<MachineMap />} />
              <Route path="/handover" element={<Handover />} />
              <Route path="/review" element={<Review />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route
                path="*"
                element={
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold text-slate-200">Page Not Found</h2>
                    <p className="text-slate-400 mt-2">The requested route does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          Project Blueprint • CNC/VMC Machine Knowledge Transfer • Offline-first shop floor assistant
        </div>
      </footer>
    </div>
  );
}
