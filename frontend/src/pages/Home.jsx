import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReviewQueue } from '../api/capture';
import { getBriefing } from '../api/guide';
import { getHandoverPlan, getMetrics, getRisk, getRoutedQuestions } from '../api/transfer';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import PlaybookLink from '../components/common/PlaybookLink';
import { PageHead, Reveal } from '../components/common';
import {
  Mic,
  Lightbulb,
  ClipboardList,
  ShieldAlert,
  Search,
  Users,
  CheckCircle,
  HelpCircle,
  BarChart,
  Boxes,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';

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
  const { machines, loadMachines } = useMachineStore();

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const myMachine = (machines || []).find((m) => m.name === currentUser.machine);
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
  const leaving = critical.filter((c) => c.cards > 0);
  const unrecorded = critical.length - leaving.length;
  const experts = [...new Set(leaving.map((c) => c.expert).filter(Boolean))];
  const riskParts = [
    leaving.length && `${plural(leaving.length, 'machine part')} known only by people leaving (${experts.join(', ')})`,
    unrecorded && `${plural(unrecorded, 'part')} with nothing recorded`,
  ].filter(Boolean);
  const riskText =
    loadingText ||
    (d.risk
      ? riskParts.length
        ? `At risk: ${riskParts.join('; ')}.`
        : 'No machine part depends on one leaving person.'
      : 'Risk data not available right now.');
  const metricsText =
    loadingText ||
    (d.metrics
      ? `Coverage ${d.metrics.coverage}% • ${d.metrics.guardian_stops} Guardian stops • ` +
        `${d.metrics.questions_answered}/${d.metrics.questions_routed} routed questions answered.`
      : 'Metrics not available right now.');

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 space-y-8">
      {/* Welcome Banner */}
      <Reveal delay={0.05}>
        <div className="relative overflow-hidden bg-white border border-slate-200/90 shadow-sm rounded-3xl p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-semibold mb-3 border border-slate-200/80 font-mono shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span>Active Shift</span>
                <span className="text-slate-400">•</span>
                <span>Machine: {currentUser.machine}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-display">
                Welcome back, {currentUser.name}
              </h1>
              <p className="text-slate-600 text-sm mt-1.5 font-medium">
                {currentUser.roleLabel} • {currentUser.experience} on shop floor
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PlaybookLink machineId={myMachine && myMachine.id} machineName={myMachine && myMachine.name} />
              <Link
                to="/capture"
                className="btn-touch px-5 py-2.5 bg-ink hover:bg-copper text-white font-semibold rounded-full shadow-2xs transition-colors flex items-center space-x-2 text-sm"
              >
                <Mic className="w-4 h-4 text-white" />
                <span>Record Know-How</span>
              </Link>
              <Link
                to="/ask"
                className="btn-touch px-5 py-2.5 bg-canvas hover:bg-slate-100 border border-slate-200 text-ink font-semibold rounded-full shadow-2xs transition-colors flex items-center space-x-2 text-sm"
              >
                <Lightbulb className="w-4 h-4 text-copper" />
                <span>Ask Experience</span>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Role-Adaptive Live Workflow Cards */}
      <Reveal delay={0.1}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Personalized Shift Feed · {currentUser.roleLabel}
            </h2>
            <span className="text-xs text-copper font-medium">Live Database Sync</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {currentUser.role === 'new_employee' && (
              <>
                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-copper/10 border border-copper/20 flex items-center justify-center text-xl mb-3 text-copper">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Daily Briefing</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {briefingText}
                    </p>
                  </div>
                  <Link
                    to="/guide"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Start Guided Job →
                  </Link>
                </div>

                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl mb-3 text-emerald-700">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Active Guardrails</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {guardText}
                    </p>
                  </div>
                  <Link
                    to="/capture"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Log Shift Note →
                  </Link>
                </div>

                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl mb-3 text-amber-700">
                      <Search className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Chatter & Chips</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      Record sound or photo to find stable RPM sweet spots or chip overheat.
                    </p>
                  </div>
                  <Link
                    to="/ask"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Diagnose Issue →
                  </Link>
                </div>
              </>
            )}

            {currentUser.role === 'old_employee' && (
              <>
                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-copper/10 border border-copper/20 flex items-center justify-center text-xl mb-3 text-copper">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Handover Plan</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {planText}
                    </p>
                  </div>
                  <Link
                    to="/handover"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    View Handover Plan →
                  </Link>
                </div>

                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl mb-3 text-emerald-700">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Verification Queue</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {reviewText}
                    </p>
                  </div>
                  <Link
                    to="/review"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Open Review Queue →
                  </Link>
                </div>

                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-xl mb-3 text-purple-700">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Questions for You</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {routedText}
                    </p>
                  </div>
                  <Link
                    to="/handover"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Answer by Voice →
                  </Link>
                </div>
              </>
            )}

            {currentUser.role === 'supervisor' && (
              <>
                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl mb-3 text-rose-700">
                      <BarChart className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Knowledge-at-Risk</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {riskText}
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    View Risk Heatmap →
                  </Link>
                </div>

                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-copper/10 border border-copper/20 flex items-center justify-center text-xl mb-3 text-copper">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Machine Health Map</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      Interactive 3D model with incident heatmaps and pinned tips.
                    </p>
                  </div>
                  <Link
                    to="/map"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Explore 3D Map →
                  </Link>
                </div>

                <div className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-copper/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl mb-3 text-emerald-700">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-ink">Transfer Metrics</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {metricsText}
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center mt-5 text-xs font-semibold text-copper hover:underline"
                  >
                    Open ROI Analytics →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {/* Product Lanes Quick Access Bento Grid */}
      <Reveal delay={0.15}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Full Knowledge Architecture
            </h2>
            <span className="text-xs text-slate-400">6 Core Manufacturing Modules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                to: '/capture',
                title: 'Lane 01 · Multimodal Capture',
                desc: 'Voice in Hindi/Marathi/English, setup video, logbook OCR, and vibration sensors.',
                icon: Mic,
              },
              {
                to: '/ask',
                title: 'Lane 02 · Grounded Search & AI',
                desc: 'Cited answers from verified cards with receipts, Chatter Doctor, and chip thermal diagnosis.',
                icon: Search,
              },
              {
                to: '/map',
                title: 'Lane 03 · 3D Machine Map',
                desc: 'Procedural 3D CNC digital twin with component-level fault histories and tacit wisdom.',
                icon: Boxes,
              },
              {
                to: '/guided-job',
                title: 'Lane 04 · Adaptive Guided SOPs',
                desc: 'Operator step execution with ShadowTrace replay and Note Guardian tolerance gates.',
                icon: ClipboardList,
              },
              {
                to: '/handover',
                title: 'Lane 05 · Retirement Handover',
                desc: 'Retirement countdown, structured tacit AI exit interviews, and apprentice routing.',
                icon: Users,
              },
              {
                to: '/dashboard',
                title: 'Lane 06 · Operations Dashboard',
                desc: 'Bus-factor-1 risk heatmaps, machine timeline event stream, and transfer ROI analytics.',
                icon: BarChart,
              },
            ].map((lane) => (
              <Link
                key={lane.title}
                to={lane.to}
                className="group p-5 rounded-3xl border border-slate-200 bg-canvas hover:bg-white hover:border-copper/40 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-copper group-hover:bg-copper group-hover:text-white transition-colors mb-3">
                    <lane.icon size={18} />
                  </div>
                  <h4 className="font-display font-bold text-sm text-ink">{lane.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{lane.desc}</p>
                </div>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-copper group-hover:translate-x-1 transition-transform">
                  Enter Module <ArrowRight size={13} className="ml-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
