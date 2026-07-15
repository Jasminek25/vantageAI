import demoData from '../data/heir-demo.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const clone = value => structuredClone(value);
const delay = value => new Promise(resolve => window.setTimeout(() => resolve(clone(value)), 180));

async function request(path, options) {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!response.ok) throw new Error(`Heir API request failed: ${response.status}`);
    return response.json();
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export async function getHeirDashboard() {
  try {
    return (await request('/heir/dashboard')) || delay(demoData);
  } catch {
    return delay(demoData);
  }
}

export async function askInheritanceCoach(question) {
  const connected = await request('/heir/coach', { method: 'POST', body: JSON.stringify({ question }) });
  if (connected) return connected;
  const lower = question.toLowerCase();
  const text = lower.includes('trust')
    ? 'A trust distribution is a transfer made under the trust document by its trustee. Before relying on an amount or date, ask for the relevant provision, confirm any conditions, and review tax consequences with qualified professionals.'
    : lower.includes('document')
      ? 'Start with identification, the notice naming you as an heir or beneficiary, account statements, and any claim forms you received. Requirements vary, so use the state checklist as an organizing guide and confirm it with the estate attorney.'
      : 'Before moving inherited money, pause large decisions, confirm where the assets are held, document any deadlines, keep emergency cash separate, and bring the complete picture to a fiduciary advisor and tax professional.';
  return delay({ text, route: 'educational-demo', grounded: false, citations: [], mode: 'offline demo' });
}

export async function calculateHeirPlan(payload) {
  const connected = await request('/heir/plan', { method: 'POST', body: JSON.stringify(payload) });
  if (connected) return connected;
  const monthlyGross = payload.salary / 12;
  const monthlySurplus = Math.max(0, monthlyGross - payload.expenses - payload.debtPayment);
  const target = payload.expenses * (payload.risk === 'conservative' ? 6 : payload.risk === 'aggressive' ? 3 : 5);
  return delay({
    monthlySurplus,
    emergencyTarget: target,
    emergencyGap: Math.max(0, target - payload.emergencyFund),
    debtToIncome: monthlyGross ? (payload.debtPayment / monthlyGross) * 100 : 0,
    steps: [
      'Keep near-term inheritance cash in a protected, liquid account while ownership and tax questions are confirmed.',
      payload.emergencyFund < target ? 'Build the emergency reserve before committing the full inheritance to long-term investments.' : 'The illustrative emergency reserve target is covered; verify the amount against actual obligations.',
      'Review debt interest rates, account basis, beneficiary restrictions, and investment risk with qualified professionals.'
    ],
    mode: 'deterministic demo'
  });
}

export async function getDocumentChecklist(state) {
  const connected = await request(`/heir/documents?state=${encodeURIComponent(state)}`);
  return connected || delay({ state, documents: demoData.documents, mode: 'curated demo checklist' });
}

export const heirIntegrationMode = API_BASE_URL ? 'Python API connected' : 'safe offline demo';
