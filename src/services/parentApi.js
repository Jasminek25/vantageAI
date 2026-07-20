import demoData from '../data/parent-demo.json';
import { getSharedFamilyContext, saveSharedFamilyContext } from './sharedPlan.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const demoResponse = value => new Promise(resolve => window.setTimeout(() => resolve(structuredClone(value)), 120));

async function request(path, options) {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options
    });
    if (!response.ok) throw new Error(`Parent API request failed: ${response.status}`);
    return response.json();
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export async function getParentDashboard() {
  try {
    return (await request('/parent/dashboard')) || demoResponse(demoData);
  } catch {
    return demoResponse(demoData);
  }
}

export async function saveReadinessAssessment(payload) {
  return (await request('/parent/readiness/assessment', { method: 'POST', body: JSON.stringify(payload) })) || demoResponse({ saved: true, score: payload.score });
}

export async function saveTransferScenario(payload) {
  return (await request('/parent/transfer/scenarios', { method: 'POST', body: JSON.stringify(payload) })) || demoResponse({ saved: true, scenarioId: `demo-${Date.now()}` });
}

export async function assignHeirLearningGoal(heirId, resource) {
  const previous = getSharedFamilyContext() || {};
  saveSharedFamilyContext({
    ...previous,
    recipient: heirId === 'maya' ? 'Maya Rivera' : heirId,
    learningGoal: resource
  });
  return (await request(`/parent/heirs/${heirId}/recommendations`, { method: 'POST', body: JSON.stringify({ resource }) })) || demoResponse({ saved: true, heirId, resource, delivery: 'saved on this device' });
}

export const integrationMode = API_BASE_URL ? 'connected backend' : 'safe demo data';
