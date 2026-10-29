import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHandoverPlan, getRisk } from '../api/transfer';
import LoadState from '../components/common/LoadState';
import HandoverPlan from '../components/transfer/HandoverPlan';
import InterviewSession from '../components/transfer/InterviewSession';
import RoutedQuestions from '../components/transfer/RoutedQuestions';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { PageHead, Reveal, ExpertTag } from '../components/common';
import { PERSONAS } from '../mock/data';
import { CalendarClock, Mic, HelpCircle, Users } from 'lucide-react';

const TASK_PAGES = { record_setup: '/capture', validate: '/review' };

export default function Handover() {
  const { currentUser, language } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('plan');

  const risk = useApi((signal) => getRisk(signal), []);
  const isOld = currentUser.role === 'old_employee';
  const leaving = (risk.data || []).find((c) => c.expert_leaving_on);
  const planEmployeeId = isOld ? currentUser.id : leaving ? leaving.expert_id : null;
  const plan = useApi(
    (signal) => (planEmployeeId ? getHandoverPlan(planEmployeeId, signal) : Promise.resolve(null)),
    [planEmployeeId]
  );

  const handleStartTask = (task) => {
    if (TASK_PAGES[task.category]) navigate(TASK_PAGES[task.category]);
    else setActiveTab('interview');
  };

  const refresh = () => {
    plan.reload();
    risk.reload();
  };

  const tabs = [
    { id: 'plan', label: 'Handover Plan & Countdown', icon: CalendarClock, testid: 'tab-plan' },
    { id: 'interview', label: 'AI Tacit Interview', icon: Mic, testid: 'tab-interview' },
    { id: 'questions', label: 'Routed Questions', icon: HelpCircle, testid: 'tab-questions' },
  ];

  const daysLeft = plan.data?.days_left || 14;
  const progress = plan.data?.progress || 62;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <PageHead
        eyebrow="Lane 04 · Structured Retirement Handover"
        title="Experience preserved before it retires."
        sub="Structured knowledge preservation before old employee retirement. Close bus-factor-1 gaps."
      />

      {/* Top Countdown Banner */}
      <Reveal delay={0.05}>
        <div className="mb-8 grid gap-6 rounded-3xl border border-ink bg-gradient-to-br from-ink to-slate-900 p-8 text-white shadow-xl lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Handover countdown</p>
            <div className="mt-3 flex items-end gap-3">
              <p data-testid="handover-countdown-badge" className="font-mono text-7xl font-semibold leading-none">{daysLeft}</p>
              <p className="pb-2 text-sm text-slate-300">days until<br />Ramesh's last shift</p>
            </div>
            <ExpertTag person={PERSONAS.ramesh} className="mt-5 border-white/20 bg-white/10 [&_span]:text-amber-200" />
          </div>
          <div className="flex flex-col justify-center lg:col-span-7">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span>Knowledge digitised</span>
              <span className="text-copper">{progress}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-copper" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {[["2", "bus-factor-1 machines"], ["9", "critical gaps left"], ["3", "buddies paired"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <p className="font-mono text-2xl font-semibold text-copper">{v}</p>
                  <p className="mt-0.5 text-[11px] text-slate-300">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Mode Tabs */}
      <Reveal delay={0.08}>
        <div className="mb-8 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testid}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? 'bg-ink text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <Icon size={17} className={active ? 'text-copper' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* Active Tab Content */}
      <Reveal delay={0.14}>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {activeTab !== 'questions' && (
            <LoadState
              loading={risk.loading || plan.loading}
              error={risk.error || plan.error}
              onRetry={refresh}
              label="Loading handover plan…"
            />
          )}
          {activeTab !== 'questions' && !risk.loading && !plan.loading && !plan.error && !plan.data && (
            <div className="p-8 text-center text-slate-500 text-xs bg-canvas border border-slate-200 rounded-2xl">
              Nobody with know-how is leaving soon, so there is no handover plan.
            </div>
          )}
          {activeTab === 'plan' && plan.data && (
            <HandoverPlan plan={plan.data} riskCells={risk.data || []} onStartTask={handleStartTask} />
          )}
          {activeTab === 'interview' && plan.data && (
            <InterviewSession
              employeeId={plan.data.employee_id}
              employeeName={plan.data.employee}
              language={language}
              onCardCreated={refresh}
            />
          )}
          {activeTab === 'questions' && <RoutedQuestions employeeId={isOld ? currentUser.id : null} />}
        </div>
      </Reveal>
    </div>
  );
}
