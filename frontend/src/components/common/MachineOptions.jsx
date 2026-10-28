import React, { useEffect } from 'react';
import { useMachineStore } from '../../store/useMachineStore';

/**
 * <option>s for a machine <select>, from the real machine list (GET /api/machines).
 * Ids come from the database, so a choice always reaches the machine it names.
 */
export default function MachineOptions({ withRpm = false }) {
  const { machines, machinesError, loadMachines } = useMachineStore();

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  if (machines.length === 0) {
    return (
      <option value="" disabled>
        {machinesError ? `Machines not loaded: ${machinesError}` : 'Loading machines…'}
      </option>
    );
  }
  return machines.map((m) => (
    <option key={m.id} value={m.id}>
      {withRpm && m.rpm_min != null && m.rpm_max != null
        ? `${m.name} (${m.rpm_min}-${m.rpm_max} RPM)`
        : m.name}
    </option>
  ));
}
