import React from 'react';
import { Link } from 'react-router-dom';
import { getReviewQueue } from '../api/capture';
import { getBriefing } from '../api/guide';
import { getHandoverPlan, getMetrics, getRisk, getRoutedQuestions } from '../api/transfer';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';

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
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/70 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-semibold mb-2 border border-cyan-500/30">
              <span>● Active Shift</span>
              <span>•</span>
              <span>Machine: {currentUser.machine}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {currentUser.roleLabel} • {currentUser.experience} on shop floor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/capture"
              className="btn-touch px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-md transition flex items-center space-x-2 text-sm"
            >
              <span>🎙️</span>
              <span>Record Know-How</span>
            </Link>
            <Link
              to="/ask"
              className="btn-touch px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-xl transition flex items-center space-x-2 text-sm"
            >
              <span>💡</span>
              <span>Ask Experience</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role-Adaptive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {currentUser.role === 'new_employee' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">📋</span>
              <h2 className="text-lg font-bold text-white mt-2">Daily Briefing</h2>
              <p className="text-slate-400 text-xs mt-1">
                {briefingText}
              </p>
              <Link
                to="/guide"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Start Guided Job →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">🛡️</span>
              <h2 className="text-lg font-bold text-white mt-2">Active Guardrails</h2>
              <p className="text-slate-400 text-xs mt-1">
                {guardText}
              </p>
              <Link
                to="/capture"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Log Shift Note →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">🔍</span>
              <h2 className="text-lg font-bold text-white mt-2">Chatter & Chips</h2>
              <p className="text-slate-400 text-xs mt-1">
                Record sound or photo to find stable RPM sweet spots or chip overheat.
              </p>
              <Link
                to="/ask"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Diagnose Issue →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'old_employee' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">🤝</span>
              <h2 className="text-lg font-bold text-white mt-2">Handover Plan</h2>
              <p className="text-slate-400 text-xs mt-1">
                {planText}
              </p>
              <Link
                to="/handover"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                View Handover Plan →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">✅</span>
              <h2 className="text-lg font-bold text-white mt-2">Verification Queue</h2>
              <p className="text-slate-400 text-xs mt-1">
                {reviewText}
              </p>
              <Link
                to="/review"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Open Review Queue →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">❓</span>
              <h2 className="text-lg font-bold text-white mt-2">Questions for You</h2>
              <p className="text-slate-400 text-xs mt-1">
                {routedText}
              </p>
              <Link
                to="/handover"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Answer by Voice →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'supervisor' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">📊</span>
              <h2 className="text-lg font-bold text-white mt-2">Knowledge-at-Risk</h2>
              <p className="text-slate-400 text-xs mt-1">
                {riskText}
              </p>
              <Link
                to="/dashboard"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                View Risk Heatmap →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">⚙️</span>
              <h2 className="text-lg font-bold text-white mt-2">Machine Health Map</h2>
              <p className="text-slate-400 text-xs mt-1">
                Interactive 3D model with incident heatmaps and pinned tips.
              </p>
              <Link
                to="/map"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Explore 3D Map →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">📈</span>
              <h2 className="text-lg font-bold text-white mt-2">Transfer Metrics</h2>
              <p className="text-slate-400 text-xs mt-1">
                {metricsText}
              </p>
              <Link
                to="/dashboard"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
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
