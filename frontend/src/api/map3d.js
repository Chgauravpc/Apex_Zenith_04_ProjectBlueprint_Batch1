import client from './client';
import {
  VMC_DEMO_COMPONENTS_LIST,
  COMPONENT_KNOWLEDGE_DEMO,
  getKnowledgeCounts,
} from '../data/componentKnowledgeDemo';

/**
 * 3D Machine Knowledge Map API client.
 * Connects to /machines/{id}/components and /components/{id}/knowledge.
 * Reference: PRD.md §9.4 and TASKS.md T12 / T21.
 */

/**
 * Seeded fallback components for VMC-3 when backend 3D router is offline or not yet mounted.
 * Sourced from clearly separated local demo dataset (authored by Ramesh).
 */
export const VMC_COMPONENTS_DATA = VMC_DEMO_COMPONENTS_LIST;

export { COMPONENT_KNOWLEDGE_DEMO, getKnowledgeCounts };

/**
 * Fetch all components for a machine, with real API call and robust fallback.
 * @param {number|string} machineId
 * @param {AbortSignal} [signal]
 */
export const getComponents = async (machineId = 1, signal) => {
  try {
    const res = await client.get(`/machines/${machineId}/components`, { signal });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (_err) {
    // Graceful offline fallback using separated domain demo data
  }
  return VMC_COMPONENTS_DATA;
};

/**
 * Fetch detailed knowledge, incidents, expert tips, and troubleshooting for a component.
 * @param {number|string} componentId
 * @param {Object} [params]
 * @param {AbortSignal} [signal]
 */
export const getComponentKnowledge = async (componentId, params, signal) => {
  try {
    const res = await client.get(`/components/${componentId}/knowledge`, { params, signal });
    if (res.data) {
      return res.data;
    }
  } catch (_err) {
    // Graceful offline fallback
  }

  const comp = VMC_COMPONENTS_DATA.find(
    (c) => c.id === Number(componentId) || c.mesh_name === componentId
  );
  if (comp) {
    return {
      component: comp,
      cards: comp.expert_tips || comp.expert_notes,
      incidents: comp.past_incidents,
      troubleshooting: comp.troubleshooting,
      knowledge_count: comp.knowledge_count,
      specs: comp.specs,
    };
  }
  return null;
};

/**
 * Create a new pinned knowledge note for a 3D component.
 * @param {number|string} componentId
 * @param {Object} pinData
 */
export const createPin = async (componentId, pinData) => {
  try {
    const res = await client.post(`/components/${componentId}/pins`, pinData);
    return res.data;
  } catch (_err) {
    // Offline simulation returning a compliant card
    return {
      id: Date.now(),
      component_id: Number(componentId),
      title: pinData.title || 'Pinned Knowledge Note',
      text: pinData.text || '',
      severity: pinData.severity || 'watch',
      author: pinData.author || 'Priya (New Employee)',
      date: new Date().toISOString().split('T')[0],
      verified: false,
    };
  }
};

export default {
  VMC_COMPONENTS_DATA,
  COMPONENT_KNOWLEDGE_DEMO,
  getKnowledgeCounts,
  getComponents,
  getComponentKnowledge,
  createPin,
};
