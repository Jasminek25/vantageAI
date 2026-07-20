const LEAD_HEADERS = ['timestamp', 'leadId', 'email', 'audience', 'organization', 'priority', 'consent', 'sessionId', 'source', 'medium', 'campaign', 'content'];
const EVENT_HEADERS = ['timestamp', 'name', 'sessionId', 'page', 'source', 'medium', 'campaign', 'content', 'details'];

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (payload.recordType === 'lead') appendLead_(spreadsheet, payload);
      else if (payload.recordType === 'event') appendEvent_(spreadsheet, payload);
      else throw new Error('Unsupported record type');
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function appendLead_(spreadsheet, payload) {
  const email = clean_(payload.email, 180).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Valid email required');
  if (payload.consent !== true) throw new Error('Consent required');
  const audience = ['family', 'advisor'].includes(payload.audience) ? payload.audience : 'unknown';
  const row = [
    clean_(payload.timestamp, 40), clean_(payload.leadId, 80), email, audience,
    clean_(payload.organization, 160), clean_(payload.priority, 180), true,
    clean_(payload.sessionId, 100), clean_(payload.source, 100), clean_(payload.medium, 100),
    clean_(payload.campaign, 120), clean_(payload.content, 120)
  ];
  sheet_(spreadsheet, 'Leads', LEAD_HEADERS).appendRow(row);
}

function appendEvent_(spreadsheet, payload) {
  const row = [
    clean_(payload.timestamp, 40), clean_(payload.name, 100), clean_(payload.sessionId, 100),
    clean_(payload.page, 100), clean_(payload.source, 100), clean_(payload.medium, 100),
    clean_(payload.campaign, 120), clean_(payload.content, 120),
    clean_(JSON.stringify(payload.details || {}), 1000)
  ];
  sheet_(spreadsheet, 'Events', EVENT_HEADERS).appendRow(row);
}

function sheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function clean_(value, maxLength) {
  const text = String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
