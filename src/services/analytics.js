import { initializeAdTracking, trackMeasurementEvent } from './adTracking.js';

const DEFAULT_DATA_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyodapk7ohVY9_iStL0V7WqT9Bd-o4wIdbt5o7_OEL_Cw6lT8Ynzb_F_h7xAtw0wXan/exec';

const DATA_ENDPOINT = import.meta.env.VITE_DATA_ENDPOINT || DEFAULT_DATA_ENDPOINT;
const EVENT_KEY = 'heirline-demo-events';
const LEAD_KEY = 'heirline-demo-leads';
const SESSION_KEY = 'heirline-demo-session';
const CONSENT_KEY = 'heirline-pilot-tracking-consent';
const SCROLL_MILESTONES = [25, 50, 75];
const ENGAGEMENT_MILESTONES = [10, 30, 60];

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
  if (!measurementAllowed()) return null;
  initializeAdTracking();
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
  trackMeasurementEvent(name, {
    experience: details.experience || details.role || window.location.hash.slice(1) || 'landing',
    role: details.role || '',
    feature: details.feature || '',
    cta: details.cta || '',
    percent: details.percent,
    active_seconds: details.activeSeconds,
    max_scroll: details.maxScroll,
    audience: details.audience || '',
    source: event.source,
    campaign: event.campaign,
    content: event.content
  });
  await deliver(event);
  return event;
}

export function measurementAllowed() {
  return window.localStorage.getItem(CONSENT_KEY) === 'granted';
}

export function startBehaviorTracking(experience) {
  if (!measurementAllowed()) return () => {};

  const recordedScroll = new Set();
  const recordedEngagement = new Set();
  let maxScroll = 0;
  let activeSeconds = 0;
  let ended = false;

  trackEvent('page_view', { experience });

  function recordScroll() {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
    maxScroll = Math.max(maxScroll, percent);

    SCROLL_MILESTONES.forEach(milestone => {
      if (percent >= milestone && !recordedScroll.has(milestone)) {
        recordedScroll.add(milestone);
        trackEvent(`scroll_${milestone}`, { experience, percent: milestone });
      }
    });
  }

  function countEngagement() {
    if (document.visibilityState !== 'visible') return;
    activeSeconds += 1;
    ENGAGEMENT_MILESTONES.forEach(seconds => {
      if (activeSeconds >= seconds && !recordedEngagement.has(seconds)) {
        recordedEngagement.add(seconds);
        trackEvent(`engaged_${seconds}_seconds`, { experience, seconds });
      }
    });
  }

  function finish(reason) {
    if (ended) return;
    ended = true;
    if (activeSeconds > 0 || maxScroll > 0) {
      trackEvent('session_summary', { experience, activeSeconds, maxScroll, reason });
    }
  }

  const engagementTimer = window.setInterval(countEngagement, 1000);
  const onPageHide = () => finish('pagehide');
  window.addEventListener('scroll', recordScroll, { passive: true });
  window.addEventListener('pagehide', onPageHide);

  return () => {
    window.clearInterval(engagementTimer);
    window.removeEventListener('scroll', recordScroll);
    window.removeEventListener('pagehide', onPageHide);
    finish('experience_change');
  };
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
