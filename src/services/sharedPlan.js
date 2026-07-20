const HANDOFF_KEY = 'heirline-shared-family-context';
const READINESS_KEY = 'heirline-readiness-assessment';

export function getSharedFamilyContext() {
  try { return JSON.parse(window.localStorage.getItem(HANDOFF_KEY) || 'null'); }
  catch { return null; }
}

export function saveSharedFamilyContext(context) {
  const record = { ...context, sharedAt: new Date().toISOString(), approved: true };
  window.localStorage.setItem(HANDOFF_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent('heirline:handoff', { detail: record }));
  return record;
}

export function getSavedReadiness() {
  try { return JSON.parse(window.localStorage.getItem(READINESS_KEY) || 'null'); }
  catch { return null; }
}

export function saveReadinessLocally(assessment) {
  const record = { ...assessment, savedAt: new Date().toISOString() };
  window.localStorage.setItem(READINESS_KEY, JSON.stringify(record));
  return record;
}
