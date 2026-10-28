import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHandoverPlan, getRisk } from '../api/transfer';
import LoadState from '../components/common/LoadState';
import HandoverPlan from '../components/transfer/HandoverPlan';
import InterviewSession from '../components/transfer/InterviewSession';
import RoutedQuestions from '../components/transfer/RoutedQuestions';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';
import { UsersIcon, MicIcon, HelpCircleIcon } from '../components/common/Icons';

// Pages a handover task is done on; interviews happen in the tab next door.
const TASK_PAGES = { record_setup: '/capture', validate: '/review' };

export default function Handover() {
  const { currentUser, language } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('plan');

  const risk = useApi((signal) => getRisk(signal), []);
  const isOld = currentUser.role === 'old_employee';
  // An old employee sees their own plan; others see the plan of whoever is leaving.
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
    { id: 'plan', label: 'Handover Plan & Countdown', icon: <UsersIcon className="w-3.5 h-3.5" /> },
    { id: 'interview', label: 'AI Tacit Interview', icon: <MicIcon className="w-3.5 h-3.5" /> },
    { id: 'questions', label: 'Routed Questions', icon: <HelpCircleIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <UsersIcon className="w-6 h-6 text-cyan-400" />
            <span>{t('navHandover', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Structured knowledge preservation before old employee retirement. Close bus-factor-1 gaps.
          </p>
        </div>
      </div>

      {/* Mode Tabs (Industrial Segmented Control) */}
      <div className="flex overflow-x-auto pb-1">
        <div className="inline-flex p-1 bg-slate-950/80 border border-slate-700/80 rounded-xl gap-1 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn-touch px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab !== 'questions' && (
          <LoadState
            loading={risk.loading || plan.loading}
            error={risk.error || plan.error}
            onRetry={refresh}
            label="Loading handover plan…"
          />
        )}
        {activeTab !== 'questions' && !risk.loading && !plan.loading && !plan.error && !plan.data && (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-800/60 border border-slate-800 rounded-2xl">
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
    </div>
  );
}
