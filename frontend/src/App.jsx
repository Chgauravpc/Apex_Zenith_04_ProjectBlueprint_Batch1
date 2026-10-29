import { FaReact } from 'react-icons/fa';
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
        <div className="w-10 h-10 border-4 border-maroon-100 border-t-maroon-700 rounded-full animate-spin" />
        <span className="text-slate-500 text-sm font-medium">Loading Blueprint...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                    <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
                    <p className="text-slate-500 mt-2">The requested route does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="border-t border-[#DADCE0] bg-white/90 backdrop-blur-sm py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="font-medium text-slate-700">Project Blueprint — CNC/VMC Machine Knowledge Transfer</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Offline-first Shop Floor Assistant • v0.1.0 • <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-sans"><FaReact className="w-3.5 h-3.5 text-cyan-500 animate-[spin_10s_linear_infinite]" /> React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
