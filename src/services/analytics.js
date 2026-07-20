const DATA_ENDPOINT = import.meta.env.VITE_DATA_ENDPOINT || '';
const EVENT_KEY = 'heirline-demo-events';
const LEAD_KEY = 'heirline-demo-leads';
const SESSION_KEY = 'heirline-demo-session';

function readList(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function writeList(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value.slice(-250)));
}

function sessionId() {
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = window.crypto?.randomUUID?.() || `session-${Date.now()}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function campaignContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || 'direct',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || ''
  };
}

async function deliver(payload) {
  if (!DATA_ENDPOINT) return false;
  try {
    await fetch(DATA_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      keepalive: true
    });
    return true;
  } catch {
    return false;
  }
}

export async function trackEvent(name, details = {}) {
  const event = {
    recordType: 'event',
    name,
    details,
    sessionId: sessionId(),
    page: window.location.hash || '#home',
    timestamp: new Date().toISOString(),
    ...campaignContext()
  };
  writeList(EVENT_KEY, [...readList(EVENT_KEY), event]);
  await deliver(event);
  return event;
}

export async function submitInterest(form) {
  const lead = {
    recordType: 'lead',
    leadId: window.crypto?.randomUUID?.() || `lead-${Date.now()}`,
    email: form.email.trim(),
    audience: form.audience,
    organization: form.organization.trim(),
    priority: form.priority,
    consent: Boolean(form.consent),
    sessionId: sessionId(),
    timestamp: new Date().toISOString(),
    ...campaignContext()
  };
  writeList(LEAD_KEY, [...readList(LEAD_KEY), lead]);
  const delivered = await deliver(lead);
  await trackEvent('interest_submitted', { audience: lead.audience, delivered });
  return { saved: true, delivered, leadId: lead.leadId };
}

export function analyticsMode() {
  return DATA_ENDPOINT ? 'connected' : 'demo';
}
