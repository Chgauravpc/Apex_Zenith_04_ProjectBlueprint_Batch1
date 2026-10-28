import React from 'react';
import { Link } from 'react-router-dom';
import { getReviewQueue } from '../api/capture';
import { getBriefing } from '../api/guide';
import { getHandoverPlan, getMetrics, getRisk, getRoutedQuestions } from '../api/transfer';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import {
  MicIcon,
  LightbulbIcon,
  ClipboardIcon,
  ShieldIcon,
  SearchIcon,
  UsersIcon,
  CheckCircleIcon,
  HelpCircleIcon,
  BarChartIcon,
  CogIcon,
  TrendingUpIcon,
} from '../components/common/Icons';

// Each role's cards come from its own endpoints; a failed call only blanks its card.
const LOADERS = {
  new_employee: (user, signal) => ({ briefing: getBriefing(user.id, signal) }),
  old_employee: (user, signal) => ({
    plan: getHandoverPlan(user.id, signal),
    review: getReviewQueue({ limit: 1 }, signal),
    routed: getRoutedQuestions({ employee_id: user.id }, signal),
  }),
  supervisor: (user, signal) => ({ risk: getRisk(signal), metrics: getMetrics(signal) }),
};

async function loadHome(user, signal) {
  const calls = (LOADERS[user.role] || (() => ({})))(user, signal);
  const keys = Object.keys(calls);
  const settled = await Promise.allSettled(keys.map((k) => calls[k]));
  return Object.fromEntries(keys.map((k, i) => [k, settled[i].value || null]));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function Home() {
  const { currentUser } = useAuthStore();
  const home = useApi((signal) => loadHome(currentUser, signal), [currentUser.id]);
  const d = home.data || {};
  const loadingText = home.loading ? 'Loading…' : null;

  const briefing = d.briefing;
  const briefingText =
    loadingText ||
    (briefing
      ? `${briefing.jobs.length ? `${plural(briefing.jobs.length, 'job')} today on ` : 'Your machines: '}` +
        `${briefing.machines.join(', ') || 'none assigned'}. ` +
        `${plural(briefing.open_warnings.length, 'open warning')} and ` +
        `${plural(briefing.known_issues.length, 'recent reject')} to know before you start.`
      : 'Briefing not available right now.');
  const guardText =
    loadingText ||
    (briefing
      ? briefing.open_warnings.length
        ? `${plural(briefing.open_warnings.length, 'open warning')}: ${briefing.open_warnings[0]}`
        : 'No open warnings on your machines. Every note you save is checked against history.'
      : 'Note Guardian checks every note you save against machine history.');

  const plan = d.plan;
  const tasksLeft = plan ? plan.tasks.filter((task) => task.status !== 'done').length : 0;
  const planText =
    loadingText ||
    (plan
      ? `Exit in ${plan.days_left} days: ${plural(tasksLeft, 'task')} left, handover ${plan.progress}% done.`
      : 'No handover plan: you are not leaving soon.');
  const reviewText =
    loadingText ||
    (d.review
      ? `${plural(d.review.total, 'captured card')} await your review and sign-off.`
      : 'Review queue not available right now.');
  const firstRouted = d.routed && d.routed.items[0];
  const routedText =
    loadingText ||
    (firstRouted
      ? `${firstRouted.asked_by || 'A new employee'} asked: “${firstRouted.question}”`
      : 'No questions waiting for you.');

  const critical = (d.risk || []).filter((c) => c.component_id !== null && c.status === 'critical');
  const experts = [...new Set(critical.map((c) => c.expert).filter(Boolean))];
  const riskText =
    loadingText ||
    (d.risk
      ? critical.length
        ? `${plural(critical.length, 'machine part')} depend on ${experts.join(', ')} alone.`
        : 'No machine part depends on one leaving person.'
      : 'Risk data not available right now.');
  const metricsText =
    loadingText ||
    (d.metrics
      ? `Coverage ${d.metrics.coverage}% • ${d.metrics.guardian_stops} Guardian stops • ` +
        `${d.metrics.questions_answered}/${d.metrics.questions_routed} routed questions answered.`
      : 'Metrics not available right now.');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/20">
        <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/30 font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              <span>Active Shift</span>
              <span className="text-cyan-600">•</span>
              <span>Machine: {currentUser.machine}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">
              {currentUser.roleLabel} • {currentUser.experience} on shop floor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/capture"
              className="btn-touch px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 transition-all flex items-center space-x-2 text-sm active:scale-[0.98]"
            >
              <MicIcon className="w-4 h-4 text-slate-950" />
              <span>Record Know-How</span>
            </Link>
            <Link
              to="/ask"
              className="btn-touch px-5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white font-semibold rounded-xl transition-all flex items-center space-x-2 text-sm active:scale-[0.98]"
            >
              <LightbulbIcon className="w-4 h-4 text-cyan-400" />
              <span>Ask Experience</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role-Adaptive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {currentUser.role === 'new_employee' && (
          <>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <ClipboardIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Daily Briefing</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {briefingText}
                </p>
              </div>
              <Link
                to="/guide"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Start Guided Job →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <ShieldIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Active Guardrails</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {guardText}
                </p>
              </div>
              <Link
                to="/capture"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Log Shift Note →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <SearchIcon className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Chatter & Chips</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Record sound or photo to find stable RPM sweet spots or chip overheat.
                </p>
              </div>
              <Link
                to="/ask"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Diagnose Issue →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'old_employee' && (
          <>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <UsersIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Handover Plan</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {planText}
                </p>
              </div>
              <Link
                to="/handover"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                View Handover Plan →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Verification Queue</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {reviewText}
                </p>
              </div>
              <Link
                to="/review"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Open Review Queue →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <HelpCircleIcon className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Questions for You</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {routedText}
                </p>
              </div>
              <Link
                to="/handover"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Answer by Voice →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'supervisor' && (
          <>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <BarChartIcon className="w-5 h-5 text-rose-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Knowledge-at-Risk</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {riskText}
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                View Risk Heatmap →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <CogIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Machine Health Map</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Interactive 3D model with incident heatmaps and pinned tips.
                </p>
              </div>
              <Link
                to="/map"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Explore 3D Map →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <TrendingUpIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Transfer Metrics</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {metricsText}
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                See Metrics →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
