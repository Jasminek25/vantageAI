import { readFileSync } from 'node:fs';

const parentFile = new URL('../src/data/parent-demo.json', import.meta.url);
const heirFile = new URL('../src/data/heir-demo.json', import.meta.url);
const data = JSON.parse(readFileSync(parentFile, 'utf8'));
const heirData = JSON.parse(readFileSync(heirFile, 'utf8'));
const errors = [];
const allowedDocumentStatuses = new Set(['complete', 'review', 'attention', 'missing']);

if (data.family?.mode !== 'fictional demo') errors.push('Family data must be explicitly marked as fictional demo data.');
if (!Array.isArray(data.documents) || data.documents.length < 6) errors.push('All six parent document examples are required.');
if (!Array.isArray(data.heirs) || data.heirs.length < 2) errors.push('At least two fictional heir records are required.');
if (!Array.isArray(data.jurisdictions) || data.jurisdictions.length < 2) errors.push('At least two jurisdiction examples are required.');

for (const item of data.documents || []) {
  for (const field of ['id', 'name', 'category', 'status', 'lastReviewed', 'advisor', 'nextAction']) {
    if (typeof item[field] !== 'string' || !item[field].trim()) errors.push(`Document ${item.id || 'unknown'} is missing ${field}.`);
  }
  if (!allowedDocumentStatuses.has(item.status)) errors.push(`Document ${item.id} has an invalid status.`);
}

for (const heir of data.heirs || []) {
  for (const field of ['id', 'name', 'relationship', 'connection', 'learningGoal', 'recommendation']) {
    if (typeof heir[field] !== 'string' || !heir[field].trim()) errors.push(`Heir ${heir.id || 'unknown'} is missing ${field}.`);
  }
  for (const field of ['engagement', 'literacy']) {
    if (!Number.isInteger(heir[field]) || heir[field] < 0 || heir[field] > 100) errors.push(`Heir ${heir.id} ${field} must be 0-100.`);
  }
}

for (const location of data.jurisdictions || []) {
  if (!Array.isArray(location.assets) || !location.assets.length) errors.push(`Jurisdiction ${location.id} needs an asset.`);
  if (!Array.isArray(location.flags) || location.flags.length < 2) errors.push(`Jurisdiction ${location.id} needs at least two review flags.`);
}

if (typeof heirData.profile?.name !== 'string' || !heirData.profile.name.trim()) errors.push('Heir demo profile requires a fictional name.');
if (!Array.isArray(heirData.assets) || heirData.assets.length < 3) errors.push('At least three fictional heir assets are required.');
if (!Array.isArray(heirData.documents) || heirData.documents.length < 6) errors.push('At least six heir checklist items are required.');
if (!Array.isArray(heirData.coachPrompts) || heirData.coachPrompts.length < 3) errors.push('At least three educational coach prompts are required.');

for (const asset of heirData.assets || []) {
  for (const field of ['id', 'name', 'category', 'liquidity']) {
    if (typeof asset[field] !== 'string' || !asset[field].trim()) errors.push(`Heir asset ${asset.id || 'unknown'} is missing ${field}.`);
  }
  if (!Number.isFinite(asset.value) || asset.value < 0) errors.push(`Heir asset ${asset.id} must have a non-negative fictional value.`);
}

for (const item of heirData.documents || []) {
  if (!['complete', 'review', 'missing'].includes(item.status)) errors.push(`Heir document ${item.id} has an invalid status.`);
}

if (errors.length) {
  console.error(`Parent demo validation failed with ${errors.length} error(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated parent data (${data.documents.length} documents, ${data.heirs.length} heirs, ${data.jurisdictions.length} jurisdictions) and heir data (${heirData.assets.length} assets, ${heirData.documents.length} checklist items) as fictional demo content.`);
