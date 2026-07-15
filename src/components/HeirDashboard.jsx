import React, { useEffect, useMemo, useState } from 'react';
import {
  askInheritanceCoach,
  calculateHeirPlan,
  getDocumentChecklist,
  getHeirDashboard,
  heirIntegrationMode
} from '../services/heirApi.js';

const navItems = [
  ['home', '⌂', 'Overview'],
  ['coach', '✦', 'AI inheritance coach'],
  ['assets', '◇', 'Asset manager'],
  ['plan', '↗', 'Future financial planner'],
  ['documents', '▤', 'Document tracker']
];

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function HeirDashboard({ onSwitchRole }) {
  const [view, setView] = useState('home');
  const [data, setData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [notice, setNotice] = useState('');

  useEffect(() => { getHeirDashboard().then(result => { setData(result); setAssets(result.assets); }); }, []);

  function navigate(next) { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function notify(message) { setNotice(message); window.setTimeout(() => setNotice(''), 2600); }

  if (!data) return <div className="heir-loading"><span>◇</span><strong>Preparing heir workspace…</strong></div>;

  return (
    <div className="heir-app">
      <aside className="heir-sidebar">
        <button className="heir-brand" type="button" onClick={() => navigate('home')}><span>V</span><div><strong>Vantage AI</strong><small>HEIR EXPERIENCE</small></div></button>
        <div className="heir-profile"><span>MR</span><div><small>CONNECTED HEIR</small><strong>{data.profile.name}</strong><p>{data.profile.relationship}</p></div></div>
        <nav aria-label="Heir dashboard features">{navItems.map(([id, icon, label]) => <button className={view === id ? 'active' : ''} type="button" key={id} onClick={() => navigate(id)}><span>{icon}</span><strong>{label}</strong></button>)}</nav>
        <div className="heir-mode"><i /><small>INTEGRATION MODE</small><strong>{heirIntegrationMode}</strong><p>Aayush's Python services remain server-side; this UI uses fictional data when no API is running.</p></div>
        <button className="heir-switch" type="button" onClick={onSwitchRole}>← Switch dashboard</button>
      </aside>
      <main className="heir-main">
        <header className="heir-topbar"><div><small>HEIR DASHBOARD</small><strong>{navItems.find(item => item[0] === view)?.[2]}</strong></div><span>FICTIONAL DEMO DATA</span><button type="button" onClick={onSwitchRole}>Switch role</button></header>
        {view === 'home' && <HeirHome data={data} assets={assets} navigate={navigate} />}
        {view === 'coach' && <Coach data={data} />}
        {view === 'assets' && <Assets assets={assets} setAssets={setAssets} notify={notify} />}
        {view === 'plan' && <Planner notify={notify} />}
        {view === 'documents' && <Documents initial={data.documents} notify={notify} />}
      </main>
      {notice && <div className="heir-toast">✓ {notice}</div>}
    </div>
  );
}

function Intro({ code, label, title, description, children }) {
  return <section className="heir-intro"><span>{code}</span><div><p>{label}</p><h1>{title}</h1><div>{description}</div></div>{children && <aside>{children}</aside>}</section>;
}

function HeirHome({ data, assets, navigate }) {
  const total = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.value), 0), [assets]);
  return <div className="heir-page"><Intro code="00" label="AAYUSH'S HEIR WORKSTREAM · INTEGRATED WEB FLOW" title={`Welcome, ${data.profile.name.split(' ')[0]}.`} description="Learn before acting, organize what you received, and turn uncertainty into specific questions for the right professionals." />
    <section className="heir-summary-grid"><article className="heir-hero-card"><p>YOUR LEARNING PRIORITY</p><h2>{data.profile.learningGoal}</h2><div><span><b>{data.summary.literacy}%</b><small>Literacy score</small></span><span><b>{data.summary.roadmap}%</b><small>Roadmap progress</small></span><span><b>{money(total)}</b><small>Demo assets logged</small></span></div><button type="button" onClick={() => navigate('coach')}>Ask the inheritance coach →</button></article><article className="heir-next-card"><p>NEXT BEST STEPS</p>{[['01', 'Review the distribution notice', 'Confirm timing and restrictions'], ['02', 'Complete the document checklist', `${data.summary.documentsComplete} of ${data.summary.documentsTotal} organized`], ['03', 'Run the financial planner', 'Separate near-term cash from long-term decisions']].map(([n,t,d]) => <div key={n}><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span></div>)}</article></section>
    <section className="heir-feature-grid">{navItems.slice(1).map(([id, icon, label], index) => <button type="button" key={id} onClick={() => navigate(id)}><span>{icon}</span><small>FEATURE 0{index + 1}</small><h2>{label}</h2><p>{['Educational answers with clear limits and optional document grounding.','A structured inventory for inherited cash, accounts, property, and debts.','Deterministic planning metrics before AI-generated explanation.','A state-aware organizing checklist for professional confirmation.'][index]}</p><strong>Open feature →</strong></button>)}</section>
    <HeirDisclaimer />
  </div>;
}

function Coach({ data }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: `Hi ${data.profile.name.split(' ')[0]}. I can explain inheritance concepts and help you prepare questions. I cannot provide legal, tax, or financial advice.` }]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(value = question) {
    const clean = value.trim(); if (!clean || loading) return;
    setMessages(current => [...current, { role: 'user', text: clean }]); setQuestion(''); setLoading(true);
    try { const answer = await askInheritanceCoach(clean); setMessages(current => [...current, { role: 'assistant', text: answer.text, meta: answer.mode }]); }
    catch { setMessages(current => [...current, { role: 'assistant', text: 'The live service is unavailable, so stay in demo mode and try one of the suggested questions.', meta: 'fallback' }]); }
    finally { setLoading(false); }
  }

  return <div className="heir-page"><Intro code="01" label="AI INHERITANCE COACH" title="Understand before you decide." description="Aayush's assistant routes general education and document-grounded questions while keeping the Gemini key on the server." />
    <section className="coach-layout"><aside><p>TRY A DEMO QUESTION</p>{data.coachPrompts.map(prompt => <button type="button" key={prompt} onClick={() => send(prompt)}>{prompt}<span>→</span></button>)}<div><strong>Privacy boundary</strong><p>Private coach conversations are not shown in the parent dashboard.</p></div></aside><article><header><span>✦</span><div><strong>Inheritance coach</strong><small>{heirIntegrationMode}</small></div><i /></header><div className="coach-messages">{messages.map((message, index) => <div className={message.role} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'AI' : 'YOU'}</span><p>{message.text}</p>{message.meta && <small>{message.meta}</small>}</div>)}{loading && <div className="assistant typing"><span>AI</span><p>Preparing an educational response…</p></div>}</div><form onSubmit={event => { event.preventDefault(); send(); }}><label htmlFor="coach-question">Ask about inheritance, documents, or next steps</label><div><input id="coach-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="What should I review before accepting a distribution?" /><button type="submit">Send →</button></div></form></article></section><HeirDisclaimer /></div>;
}

function Assets({ assets, setAssets, notify }) {
  const [form, setForm] = useState({ name: '', category: 'Cash', value: '' });
  const total = assets.reduce((sum, asset) => sum + Number(asset.value), 0);
  function add(event) { event.preventDefault(); if (!form.name || !form.value) return; setAssets(items => [...items, { ...form, id: `demo-${Date.now()}`, value: Number(form.value), liquidity: form.category === 'Real estate' ? 'Illiquid' : 'Liquid' }]); setForm({ name: '', category: 'Cash', value: '' }); notify('Demo asset added'); }
  return <div className="heir-page"><Intro code="02" label="ASSET MANAGER" title="Know what you received." description="A structured inventory adapted from Aayush's AssetManager service. Demo values remain local and fictional."><b className="heir-total">{money(total)}<small>TOTAL DEMO ASSETS</small></b></Intro><section className="asset-layout"><article><div className="heir-section-title"><div><p>ASSET INVENTORY</p><h2>{assets.length} items logged</h2></div><span>DEMO</span></div>{assets.map((asset, index) => <div className="asset-row" key={asset.id}><span>{String(index + 1).padStart(2,'0')}</span><div><strong>{asset.name}</strong><small>{asset.category} · {asset.liquidity}</small></div><b>{money(asset.value)}</b></div>)}</article><form onSubmit={add}><p>ADD FICTIONAL ASSET</p><h2>Extend the demo inventory</h2><label>Asset name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Example: inherited savings" /></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>Cash</option><option>Investments</option><option>Real estate</option><option>Physical asset</option></select></label><label>Illustrative value<input type="number" min="0" value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} placeholder="50000" /></label><button type="submit">Add to demo inventory</button><small>Do not enter real account numbers or personal records.</small></form></section><HeirDisclaimer /></div>;
}

function Planner({ notify }) {
  const [form, setForm] = useState({ salary: 90000, expenses: 4200, debtPayment: 450, emergencyFund: 10000, risk: 'moderate' });
  const [result, setResult] = useState(null);
  async function calculate(event) { event.preventDefault(); setResult(await calculateHeirPlan(form)); notify('Deterministic demo plan calculated'); }
  return <div className="heir-page"><Intro code="03" label="FUTURE FINANCIAL PLANNER" title="Turn the inheritance into a sequence." description="Aayush's PlanAhead principle keeps arithmetic deterministic. AI may explain the figures, but it does not invent or recompute them." /><section className="planner-layout"><form onSubmit={calculate}><p>ILLUSTRATIVE INPUTS</p><div className="planner-fields"><label>Annual salary<input type="number" value={form.salary} onChange={e => setForm({...form,salary:Number(e.target.value)})} /></label><label>Monthly expenses<input type="number" value={form.expenses} onChange={e => setForm({...form,expenses:Number(e.target.value)})} /></label><label>Monthly debt payments<input type="number" value={form.debtPayment} onChange={e => setForm({...form,debtPayment:Number(e.target.value)})} /></label><label>Emergency fund<input type="number" value={form.emergencyFund} onChange={e => setForm({...form,emergencyFund:Number(e.target.value)})} /></label><label>Risk approach<select value={form.risk} onChange={e => setForm({...form,risk:e.target.value})}><option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option></select></label></div><button type="submit">Calculate roadmap →</button></form><article>{!result ? <div className="planner-empty"><span>↗</span><h2>Your roadmap appears here.</h2><p>Run the deterministic calculation to see cash-flow, reserve, and review priorities.</p></div> : <><div className="plan-metrics"><span><small>MONTHLY SURPLUS</small><strong>{money(result.monthlySurplus)}</strong></span><span><small>EMERGENCY TARGET</small><strong>{money(result.emergencyTarget)}</strong></span><span><small>RESERVE GAP</small><strong>{money(result.emergencyGap)}</strong></span><span><small>DEBT-TO-INCOME</small><strong>{result.debtToIncome.toFixed(1)}%</strong></span></div><p className="plan-mode">{result.mode}</p><div className="plan-steps">{result.steps.map((step,index) => <div key={step}><b>0{index+1}</b><p>{step}</p></div>)}</div></>}</article></section><HeirDisclaimer /></div>;
}

function Documents({ initial, notify }) {
  const [state, setState] = useState('California');
  const [documents, setDocuments] = useState(initial);
  const [mode, setMode] = useState('demo checklist');
  async function refresh() { const result = await getDocumentChecklist(state); setDocuments(result.documents); setMode(result.mode); notify(`${state} organizing checklist loaded`); }
  function toggle(id) { setDocuments(items => items.map(item => item.id === id ? { ...item, status: item.status === 'complete' ? 'review' : 'complete' } : item)); }
  return <div className="heir-page"><Intro code="04" label="INHERITANCE DOCUMENT TRACKER" title="Prepare the right questions and records." description="A state-aware organizing checklist based on Aayush's DocTrack service. County, estate structure, and professional requirements can differ."><div className="document-state"><select value={state} onChange={event => setState(event.target.value)}><option>California</option><option>New York</option><option>Texas</option><option>Florida</option></select><button type="button" onClick={refresh}>Load checklist</button></div></Intro><section className="document-layout"><article><div className="heir-section-title"><div><p>{state.toUpperCase()} · INHERITOR SCOPE</p><h2>Organizing checklist</h2></div><span>{mode}</span></div>{documents.map(item => <button className="heir-doc-row" type="button" key={item.id} onClick={() => toggle(item.id)}><span className={item.status}>{item.status === 'complete' ? '✓' : item.status === 'missing' ? '×' : '!'}</span><div><strong>{item.name}</strong><small>{item.category}</small></div><b>{item.status === 'complete' ? 'Prepared' : item.status === 'missing' ? 'Professional review' : 'Review'}</b></button>)}</article><aside><span>!</span><h2>Checklist, not a filing determination.</h2><p>This feature organizes common records. It does not decide what a court, trustee, financial institution, county, or tax authority legally requires.</p><ul><li>Confirm the estate structure.</li><li>Ask which originals or certified copies are required.</li><li>Track deadlines with the responsible professional.</li></ul></aside></section><HeirDisclaimer /></div>;
}

function HeirDisclaimer() { return <p className="heir-disclaimer">Fictional prototype data. Educational and organizational support only—not legal, tax, or financial advice.</p>; }
