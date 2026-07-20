import React, { useEffect, useMemo, useState } from 'react';
import {
  askInheritanceCoach,
  calculateHeirPlan,
  getDocumentChecklist,
  getHeirDashboard
} from '../services/heirApi.js';

const navItems = [
  ['home', '⌂', 'Overview'],
  ['coach', '✦', 'AI financial coach'],
  ['assets', '◇', 'Asset manager'],
  ['plan', '↗', 'Personalized wealth roadmap'],
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
        <button className="heir-brand" type="button" onClick={onSwitchRole} aria-label="Return to Heirline home"><span>H</span><div><strong>Heirline</strong><small>HEIR EXPERIENCE</small></div></button>
        <div className="heir-profile"><span>MR</span><div><small>CONNECTED HEIR</small><strong>{data.profile.name}</strong><p>{data.profile.relationship}</p></div></div>
        <nav aria-label="Heir dashboard features">{navItems.map(([id, icon, label]) => <button className={view === id ? 'active' : ''} type="button" key={id} onClick={() => navigate(id)}><span>{icon}</span><strong>{label}</strong></button>)}</nav>
        <div className="heir-mode"><i /><small>PRIVATE BY DESIGN</small><strong>Your learning space</strong><p>Your coach questions and personal planning choices are not shown in the parent dashboard.</p></div>
        <button className="heir-switch" type="button" onClick={onSwitchRole}>← All dashboards</button>
      </aside>
      <main className="heir-main">
        <header className="heir-topbar"><div><small>HEIR DASHBOARD</small><strong>{navItems.find(item => item[0] === view)?.[2]}</strong></div><span>FICTIONAL DEMO DATA</span><button type="button" onClick={onSwitchRole}>All dashboards</button></header>
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
  return <div className="heir-page"><Intro code="00" label="YOUR HEIR DASHBOARD" title={`Welcome, ${data.profile.name.split(' ')[0]}.`} description="Learn before acting, organize what you received, and turn uncertainty into specific questions for the right professionals." />
    <section className="heir-summary-grid"><article className="heir-hero-card"><p>YOUR LEARNING PRIORITY</p><h2>{data.profile.learningGoal}</h2><div><span><b>{data.summary.literacy}%</b><small>Literacy score</small></span><span><b>{data.summary.roadmap}%</b><small>Roadmap progress</small></span><span><b>{money(total)}</b><small>Demo assets logged</small></span></div><button type="button" onClick={() => navigate('coach')}>Ask the inheritance coach →</button></article><article className="heir-next-card"><p>NEXT BEST STEPS</p>{[['01', 'Review the distribution notice', 'Confirm timing and restrictions'], ['02', 'Complete the document checklist', `${data.summary.documentsComplete} of ${data.summary.documentsTotal} organized`], ['03', 'Run the financial planner', 'Separate near-term cash from long-term decisions']].map(([n,t,d]) => <div key={n}><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span></div>)}</article></section>
    <section className="heir-feature-grid">{navItems.slice(1).map(([id, icon, label], index) => <button type="button" key={id} onClick={() => navigate(id)}><span>{icon}</span><small>FEATURE 0{index + 1}</small><h2>{label}</h2><p>{['Get clear answers about inheritance, documents, and important next steps.','Organize inherited cash, accounts, property, and debts in one place.','Turn your financial picture into a practical, personalized roadmap.','Build a state-aware checklist to prepare for professional review.'][index]}</p><strong>Open feature →</strong></button>)}</section>
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

  return <div className="heir-page"><Intro code="01" label="AI FINANCIAL COACH" title="Understand before you decide." description="Ask questions about inheritance and personal finance, review common concepts, and prepare for conversations with the right professionals." />
    <section className="coach-layout"><aside><p>TRY A QUESTION</p>{data.coachPrompts.map(prompt => <button type="button" key={prompt} onClick={() => send(prompt)}>{prompt}<span>→</span></button>)}<div><strong>Your conversation is private</strong><p>Coach questions are not shown in the parent dashboard.</p></div></aside><article><header><span>✦</span><div><strong>AI financial coach</strong><small>Ready to help</small></div><i /></header><div className="coach-messages">{messages.map((message, index) => <div className={message.role} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'COACH' : 'YOU'}</span><p>{message.text}</p></div>)}{loading && <div className="assistant typing"><span>COACH</span><p>Preparing a response…</p></div>}</div><form onSubmit={event => { event.preventDefault(); send(); }}><label htmlFor="coach-question">Ask about inheritance, documents, or next steps</label><div><input id="coach-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="What should I review before accepting a distribution?" /><button type="submit">Send →</button></div></form></article></section><HeirDisclaimer /></div>;
}

function Assets({ assets, setAssets, notify }) {
  const [form, setForm] = useState({ name: '', category: 'Cash', value: '' });
  const total = assets.reduce((sum, asset) => sum + Number(asset.value), 0);
  function add(event) { event.preventDefault(); if (!form.name || !form.value) return; setAssets(items => [...items, { ...form, id: `demo-${Date.now()}`, value: Number(form.value), liquidity: form.category === 'Real estate' ? 'Illiquid' : 'Liquid' }]); setForm({ name: '', category: 'Cash', value: '' }); notify('Asset added'); }
  return <div className="heir-page"><Intro code="02" label="ASSET MANAGER" title="Know what you received." description="Keep inherited cash, accounts, property, and other assets organized in one clear inventory."><b className="heir-total">{money(total)}<small>TOTAL ASSETS</small></b></Intro><section className="asset-layout"><article><div className="heir-section-title"><div><p>ASSET INVENTORY</p><h2>{assets.length} items logged</h2></div><span>DEMO</span></div>{assets.map((asset, index) => <div className="asset-row" key={asset.id}><span>{String(index + 1).padStart(2,'0')}</span><div><strong>{asset.name}</strong><small>{asset.category} · {asset.liquidity}</small></div><b>{money(asset.value)}</b></div>)}</article><form onSubmit={add}><p>ADD AN ASSET</p><h2>Update your inventory</h2><label>Asset name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Example: inherited savings" /></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>Cash</option><option>Investments</option><option>Real estate</option><option>Physical asset</option></select></label><label>Estimated value<input type="number" min="0" value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} placeholder="50000" /></label><button type="submit">Add to inventory</button><small>For this demonstration, please use fictional information only.</small></form></section><HeirDisclaimer /></div>;
}

function Planner({ notify }) {
  const [form, setForm] = useState({ salary: 90000, expenses: 4200, debtPayment: 450, emergencyFund: 10000, risk: 'moderate' });
  const [result, setResult] = useState(null);
  async function calculate(event) { event.preventDefault(); setResult(await calculateHeirPlan(form)); notify('Your roadmap is ready'); }
  return <div className="heir-page"><Intro code="03" label="PERSONALIZED WEALTH ROADMAP" title="Turn the inheritance into a sequence." description="See how cash flow, emergency savings, debt, and risk preferences shape your next financial priorities." /><section className="planner-layout"><form onSubmit={calculate}><p>YOUR FINANCIAL PICTURE</p><div className="planner-fields"><label>Annual salary<input type="number" value={form.salary} onChange={e => setForm({...form,salary:Number(e.target.value)})} /></label><label>Monthly expenses<input type="number" value={form.expenses} onChange={e => setForm({...form,expenses:Number(e.target.value)})} /></label><label>Monthly debt payments<input type="number" value={form.debtPayment} onChange={e => setForm({...form,debtPayment:Number(e.target.value)})} /></label><label>Emergency fund<input type="number" value={form.emergencyFund} onChange={e => setForm({...form,emergencyFund:Number(e.target.value)})} /></label><label>Risk approach<select value={form.risk} onChange={e => setForm({...form,risk:e.target.value})}><option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option></select></label></div><button type="submit">Build my roadmap →</button></form><article>{!result ? <div className="planner-empty"><span>↗</span><h2>Your roadmap appears here.</h2><p>Build your roadmap to see cash-flow, reserve, and review priorities.</p></div> : <><div className="plan-metrics"><span><small>MONTHLY SURPLUS</small><strong>{money(result.monthlySurplus)}</strong></span><span><small>EMERGENCY TARGET</small><strong>{money(result.emergencyTarget)}</strong></span><span><small>RESERVE GAP</small><strong>{money(result.emergencyGap)}</strong></span><span><small>DEBT-TO-INCOME</small><strong>{result.debtToIncome.toFixed(1)}%</strong></span></div><div className="plan-steps">{result.steps.map((step,index) => <div key={step}><b>0{index+1}</b><p>{step}</p></div>)}</div></>}</article></section><HeirDisclaimer /></div>;
}

function Documents({ initial, notify }) {
  const [state, setState] = useState('California');
  const [documents, setDocuments] = useState(initial);
  const [mode, setMode] = useState('Ready to review');
  async function refresh() { const result = await getDocumentChecklist(state); setDocuments(result.documents); setMode('Updated just now'); notify(`${state} checklist loaded`); }
  function toggle(id) { setDocuments(items => items.map(item => item.id === id ? { ...item, status: item.status === 'complete' ? 'review' : 'complete' } : item)); }
  return <div className="heir-page"><Intro code="04" label="DOCUMENTATION CHECKLIST" title="Prepare the right questions and records." description="Build an organizing checklist for your state, then confirm requirements with the responsible attorney, trustee, institution, or tax professional."><div className="document-state"><select value={state} onChange={event => setState(event.target.value)}><option>California</option><option>New York</option><option>Texas</option><option>Florida</option></select><button type="button" onClick={refresh}>Load checklist</button></div></Intro><section className="document-layout"><article><div className="heir-section-title"><div><p>{state.toUpperCase()} · INHERITOR CHECKLIST</p><h2>Documents to organize</h2></div><span>{mode}</span></div>{documents.map(item => <button className="heir-doc-row" type="button" key={item.id} onClick={() => toggle(item.id)}><span className={item.status}>{item.status === 'complete' ? '✓' : item.status === 'missing' ? '×' : '!'}</span><div><strong>{item.name}</strong><small>{item.category}</small></div><b>{item.status === 'complete' ? 'Prepared' : item.status === 'missing' ? 'Professional review' : 'Review'}</b></button>)}</article><aside><span>!</span><h2>Confirm requirements before filing.</h2><p>Document requirements can vary by estate structure, institution, county, and individual circumstances.</p><ul><li>Confirm the estate structure.</li><li>Ask which originals or certified copies are required.</li><li>Track deadlines with the responsible professional.</li></ul></aside></section><HeirDisclaimer /></div>;
}

function HeirDisclaimer() { return <p className="heir-disclaimer">Illustrative information only. Heirline does not provide legal, tax, or financial advice.</p>; }
