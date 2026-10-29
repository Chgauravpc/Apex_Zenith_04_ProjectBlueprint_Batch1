import React from 'react';
import { API_ORIGIN } from '../../api/client';
import { FileTextIcon } from './Icons';

/** Printable playbook of one machine: safety, stop signs, every approved step and its tips. */
export const playbookUrl = (machineId) => `${API_ORIGIN}/api/reports/handbook/${machineId}`;

export default function PlaybookLink({ machineId, machineName }) {
  if (!machineId) return null;
  return (
    <a
      href={playbookUrl(machineId)}
      target="_blank"
      rel="noopener noreferrer"
      title="Safety, stop signs and every approved step, ready to print"
      className="btn-touch px-4 py-2.5 bg-white hover:bg-slate-50 text-maroon-800 border border-maroon-200 font-semibold rounded-xl shadow-xs transition-all flex items-center space-x-2 text-sm active:scale-[0.98]"
    >
      <FileTextIcon className="w-4 h-4 text-maroon-700" />
      <span>{machineName ? `${machineName} Playbook` : 'Machine Playbook'}</span>
    </a>
  );
}
