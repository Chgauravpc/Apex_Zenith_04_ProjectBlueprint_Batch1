import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { Toaster } from 'sonner';
import { RoleProvider } from '@/store/RoleContext';
import NavBar from '@/components/layout/NavBar';
import ErrorBoundary from './components/common/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Capture = lazy(() => import('./pages/Capture'));
const Ask = lazy(() => import('./pages/Ask'));
const GuidedJob = lazy(() => import('./pages/GuidedJob'));
const MachineMap = lazy(() => import('./pages/MachineMap'));
const Handover = lazy(() => import('./pages/Handover'));
const Review = lazy(() => import('./pages/Review'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

let lenis;

function SmoothScroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
    let raf;
    const loop = (t) => {
      lenis?.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname]);
  return null;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center space-y-3 font-mono text-xs text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-copper rounded-full animate-spin" />
        <span>Loading Blueprint...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <SmoothScroll />
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
        <NavBar />
        <main className="flex-1">
          <ErrorBoundary title="Section Error">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/capture" element={<Capture />} />
                <Route path="/ask" element={<Ask />} />
                <Route path="/guided-job" element={<GuidedJob />} />
                <Route path="/guide" element={<GuidedJob />} />
                <Route path="/map" element={<MachineMap />} />
                <Route path="/handover" element={<Handover />} />
                <Route path="/review" element={<Review />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="*"
                  element={
                    <div className="text-center py-20">
                      <h2 className="font-display text-2xl font-bold text-ink">Page Not Found</h2>
                      <p className="text-slate-500 mt-2 text-sm">The requested route does not exist.</p>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#11161B", color: "#fff", border: "none" } }} />
    </RoleProvider>
  );
}
