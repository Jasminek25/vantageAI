import React, { useEffect, useState } from 'react';
import {
  assignHeirLearningGoal,
  getParentDashboard,
  saveReadinessAssessment,
  saveTransferScenario
} from './services/parentApi.js';
import LandingPage from './components/LandingPage.jsx';
import HeirDashboard from './components/HeirDashboard.jsx';
import FutureFeature from './components/FutureFeature.jsx';
import { trackEvent } from './services/analytics.js';
import { getSavedReadiness, saveReadinessLocally, saveSharedFamilyContext } from './services/sharedPlan.js';

const validRoles = new Set(['landing', 'parent', 'heir', 'manager']);

function roleFromHash() {
  const role = window.location.hash.replace('#', '') || 'landing';
  return validRoles.has(role) ? role : 'landing';
}

export default function App() {
  const [role, setRole] = useState(roleFromHash);

  useEffect(() => {
    const syncRole = () => setRole(roleFromHash());
    window.addEventListener('hashchange', syncRole);
    return () => window.removeEventListener('hashchange', syncRole);
  }, []);

  useEffect(() => { trackEvent('page_view', { experience: role }); }, [role]);

  function chooseRole(nextRole) {
    const safeRole = validRoles.has(nextRole) ? nextRole : 'landing';
    window.location.hash = safeRole === 'landing' ? '' : safeRole;
    setRole(safeRole);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (role === 'parent') return <ParentDashboard onSwitchRole={() => chooseRole('landing')} />;
  if (role === 'heir') return <HeirDashboard onSwitchRole={() => chooseRole('landing')} />;
  if (role === 'manager') return <FutureFeature onBack={() => chooseRole('landing')} />;
  return <LandingPage onChooseRole={chooseRole} />;
}

const features = [
  { id: 'home', short: 'Home', label: 'Parent home', number: '00', glyph: '⌂' },
  { id: 'readiness', short: 'Readiness', label: 'Readiness assessment', number: '01', glyph: '✓' },
  { id: 'transfer', short: 'Transfer lab', label: 'Wealth transfer simulator', number: '02', glyph: '⇄' },
  { id: 'documents', short: 'Coordination', label: 'Professional coordination', number: '03', glyph: '▤' },
  { id: 'legacy', short: 'Legacy plan', label: 'Parent legacy plan', number: '04', glyph: '✦' },
  { id: 'family', short: 'Family', label: 'Family overview', number: '05', glyph: '◇' },
  { id: 'jurisdictions', short: 'Locations', label: 'Jurisdiction map', number: '06', glyph: '◎' }
];

const featureDescriptions = {
  readiness: 'Review plan completeness, calculate a transparent score, and turn gaps into next actions.',
  transfer: 'Compare hypothetical equal, trust, and staggered distribution structures before professional review.',
  documents: 'Keep documents, review dates, milestones, and professional contacts in one coordinated checklist.',
  legacy: 'Clarify what the family is passing on, why it matters, and which approved context heirs should receive.',
  family: 'See consent-based heir engagement and assign learning goals to the connected heir experience.',
  jurisdictions: 'Group assets by location and surface cross-border questions for qualified professionals.'
};

const readinessQuestions = [
  { prompt: 'Is your signed will current and accessible?', help: 'A current signed will establishes core instructions.', action: 'Update or locate the signed will', owner: 'Estate attorney', options: [['Yes, reviewed recently', 18], ['On file, but old', 9], ['No or unsure', 0]] },
  { prompt: 'When was your trust or estate plan last reviewed?', help: 'Life events and law changes can make old plans inaccurate.', action: 'Schedule an estate-plan review', owner: 'Estate attorney', options: [['Within 3 years', 18], ['More than 3 years ago', 8], ['Never / no trust', 2]] },
  { prompt: 'Are beneficiary forms confirmed across key accounts?', help: 'Account forms can override instructions in a will.', action: 'Confirm beneficiary designations', owner: 'Wealth advisor', options: [['All confirmed', 18], ['Some need review', 8], ['Not confirmed', 0]] },
  { prompt: 'Do you have a signed healthcare directive?', help: 'This records wishes for medical decisions and agents.', action: 'Complete a healthcare directive', owner: 'Estate attorney', options: [['Yes', 18], ['Draft only', 8], ['No', 0]] }
];

function statusLabel(status) {
  return { complete: 'Current', review: 'Review due', attention: 'Needs attention', missing: 'Missing' }[status];
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function ParentDashboard({ onSwitchRole }) {
  const [view, setView] = useState('home');
  const [data, setData] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [readiness, setReadiness] = useState(getSavedReadiness);

  useEffect(() => { getParentDashboard().then(setData); }, []);

  function navigate(next) {
    setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  }

  if (!data) return <div className="loading-screen"><span className="brand-mark" /><strong>Preparing parent workspace…</strong></div>;

  const activeFeature = features.find(item => item.id === view);

  return (
    <div className="app-shell">
      <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
        <button className="brand" type="button" onClick={onSwitchRole} aria-label="Return to Heirline home">
          <span className="brand-mark" /><span><strong>Heirline</strong><small>FAMILY WEALTH PLANNING</small></span>
        </button>

        <div className="workspace-switcher"><span>ER</span><div><small>WORKSPACE</small><strong>Rivera family</strong></div><b>⌄</b></div>

        <nav aria-label="Parent dashboard features">
          <p className="nav-label">Parent dashboard</p>
          {features.map(item => (
            <button className={view === item.id ? 'nav-item active' : 'nav-item'} type="button" key={item.id} onClick={() => navigate(item.id)}>
              <span>{item.glyph}</span><div><strong>{item.short}</strong>{item.id !== 'home' && <small>Feature {item.number}</small>}</div>
            </button>
          ))}
        </nav>

        <div className="integration-card"><span className="sync-dot" /><p>PRIVATE WORKSPACE</p><strong>Your family plan</strong><small>Only information you choose to share is visible across connected family accounts.</small></div>
        <div className="user-card"><span>ER</span><div><strong>Elena Rivera</strong><small>Plan owner</small></div><b>•••</b></div>
      </aside>
      {mobileNav && <button className="scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main>
        <header className="topbar">
          <button className="menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileNav(true)}>☰</button>
          <div className="breadcrumb"><span>Parent dashboard</span><i>/</i><strong>{activeFeature.label}</strong></div>
          <div className="top-actions"><span className="demo-badge"><i /> FICTIONAL DEMO DATA</span><button className="outline-button" type="button" onClick={onSwitchRole}>All dashboards</button><button className="primary-button compact" type="button" onClick={() => navigate('home')}>Parent home</button></div>
        </header>

        <div className="page-stage">
          {view === 'home' && <Home data={data} readiness={readiness} onNavigate={navigate} />}
          {view === 'readiness' && <Readiness data={data} stored={readiness} onSaved={setReadiness} notify={notify} />}
          {view === 'transfer' && <TransferLab data={data} notify={notify} />}
          {view === 'documents' && <CoordinationHub data={data} notify={notify} />}
          {view === 'legacy' && <LegacyPlanner notify={notify} />}
          {view === 'family' && <FamilyOverview data={data} notify={notify} />}
          {view === 'jurisdictions' && <JurisdictionMap data={data} />}
        </div>
      </main>
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </div>
  );
}

function PageIntro({ number, eyebrow, title, description, children }) {
  return <section className="page-intro"><div className="feature-number">{number}</div><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children && <div className="intro-actions">{children}</div>}</section>;
}

function Home({ data, readiness, onNavigate }) {
  const current = data.documents.filter(item => item.status === 'complete').length;
  const score = readiness?.score ?? 58;
  return (
    <div className="page home-page">
      <PageIntro number="00" eyebrow="PARENT DASHBOARD" title="One clear plan for everything you’re preparing to pass on." description="Organize your estate plan, compare transfer choices, coordinate professional reviews, and prepare your family for what comes next.">
        <button className="primary-button" type="button" onClick={() => onNavigate('readiness')}>Start with readiness →</button>
      </PageIntro>

      <section className="home-hero">
        <div className="readiness-summary">
          <p className="eyebrow light">FAMILY PLAN SNAPSHOT</p><h2>Readiness score</h2>
          <div className="score-row"><div className="score-ring" style={{ '--score': `${score * 3.6}deg` }}><strong>{score}</strong><small>OUT OF 100</small></div><div><span className="plan-state">{score >= 75 ? 'Strong foundation' : score >= 50 ? 'Foundation in place' : 'Important gaps found'}</span><p>{readiness ? `Your saved assessment identified ${readiness.actions.length} priority ${readiness.actions.length === 1 ? 'action' : 'actions'}.` : `${current} of ${data.documents.length} tracked documents are current. Run the assessment to create your personalized review list.`}</p><button type="button" onClick={() => onNavigate('readiness')}>{readiness ? 'Review saved result' : 'Calculate your score'} →</button></div></div>
        </div>
        <div className="priority-actions"><div className="card-heading"><div><p className="eyebrow">NEXT BEST ACTIONS</p><h3>What needs attention now</h3></div><span>3 OPEN</span></div><div className="action-list"><button type="button" onClick={() => onNavigate('documents')}><b>01</b><span><strong>Confirm beneficiary designations</strong><small>401(k) and insurance forms are unverified</small></span><em>High</em><i>→</i></button><button type="button" onClick={() => onNavigate('documents')}><b>02</b><span><strong>Review the family trust</strong><small>Last professional review was in 2016</small></span><em>Due</em><i>→</i></button><button type="button" onClick={() => onNavigate('documents')}><b>03</b><span><strong>Create healthcare directive</strong><small>No signed directive is on file</small></span><em>Missing</em><i>→</i></button></div></div>
      </section>

      <section className="feature-guide">
        <div className="section-heading"><div><p className="eyebrow">YOUR FAMILY PLAN</p><h2>Six connected features. One understandable flow.</h2></div><p>Move from assessing readiness to organizing the people, documents, and decisions that shape your legacy.</p></div>
        <div className="feature-grid">{features.filter(item => item.id !== 'home').map(item => <button type="button" key={item.id} onClick={() => onNavigate(item.id)}><span className="feature-code">{item.number}</span><i>{item.glyph}</i><h3>{item.label}</h3><p>{featureDescriptions[item.id]}</p><strong>Open feature →</strong></button>)}</div>
      </section>

      <section className="handoff-card"><div><p className="eyebrow light">A CONNECTED FAMILY JOURNEY</p><h2>Prepare together. Decide with confidence.</h2><p>Build a clear plan, help heirs develop financial confidence, and bring the right questions to your professional team.</p></div><div className="role-map"><article><span>01</span><p><strong>Organize</strong><small>Plans, documents, and priorities</small></p><b>START HERE</b></article><i>→</i><article><span>02</span><p><strong>Prepare heirs</strong><small>Learning goals and guidance</small></p><b>BUILD CONFIDENCE</b></article><i>→</i><article><span>03</span><p><strong>Review</strong><small>Coordinate with professionals</small></p><b>TAKE ACTION</b></article></div></section>
      <Disclaimer />
    </div>
  );
}

function Readiness({ data, stored, onSaved, notify }) {
  const [step, setStep] = useState(stored ? readinessQuestions.length : -1);
  const [answers, setAnswers] = useState(stored?.answers || []);
  const score = answers.length ? Math.min(96, 20 + answers.reduce((sum, answer) => sum + answer.points, 0)) : 58;
  const complete = step === readinessQuestions.length;
  const actions = complete ? readinessQuestions.flatMap((question, index) => (answers[index]?.points || 0) < 18 ? [{ title: question.action, owner: question.owner }] : []) : [];

  function start() { setAnswers([]); setStep(0); }
  async function answer(label, points) {
    const next = [...answers, { label, points }];
    setAnswers(next);
    if (step === readinessQuestions.length - 1) {
      const nextScore = Math.min(96, 20 + next.reduce((sum, item) => sum + item.points, 0));
      setStep(readinessQuestions.length);
      const nextActions = readinessQuestions.flatMap((question, index) => next[index].points < 18 ? [{ title: question.action, owner: question.owner }] : []);
      await saveReadinessAssessment({ answers: next, score: nextScore, actions: nextActions });
      const saved = saveReadinessLocally({ answers: next, score: nextScore, actions: nextActions });
      onSaved(saved);
      trackEvent('readiness_completed', { score: nextScore, actionCount: nextActions.length });
      notify('Assessment and action plan saved');
    } else setStep(step + 1);
  }

  return (
    <div className="page">
      <PageIntro number="01" eyebrow="PRIORITY 1 · PLAN COMPLETENESS" title="Inheritance readiness assessment" description="A transparent score explains what is current, what is missing, and what a parent should review with a qualified professional."><button className="outline-button" type="button" onClick={start}>{step >= 0 ? 'Restart assessment' : 'Run assessment'}</button></PageIntro>
      <section className="readiness-layout">
        <article className="readiness-score-card"><p className="eyebrow light">CURRENT SCORE</p><div className="large-ring" style={{ '--score': `${score * 3.6}deg` }}><strong>{score}</strong><span>/100</span></div><h2>{score >= 75 ? 'Strong foundation' : score >= 50 ? 'Foundation in place' : 'Immediate gaps'}</h2><p>The score measures documented plan completeness—not the legal quality or suitability of the plan.</p><div className="score-legend"><span><i className="complete" /> Current</span><span><i className="review" /> Review</span><span><i className="missing" /> Missing</span></div></article>
        <article className="assessment-card">
          {step === -1 && <><p className="eyebrow">HOW IT WORKS</p><h2>Four questions turn uncertainty into a review list.</h2><p>Answer using the fictional sample family. The result updates the readiness score and generates clear next actions.</p><div className="assessment-steps"><div><span>1</span><p><strong>Answer</strong><small>Will, trust, beneficiaries, healthcare</small></p></div><div><span>2</span><p><strong>Score</strong><small>Transparent points, not a black box</small></p></div><div><span>3</span><p><strong>Act</strong><small>Review gaps with the right professional</small></p></div></div><button className="primary-button" type="button" onClick={start}>Begin assessment →</button></>}
          {step >= 0 && !complete && <><div className="progress-header"><span>QUESTION {step + 1} OF {readinessQuestions.length}</span><b>{Math.round(((step + 1) / readinessQuestions.length) * 100)}%</b></div><div className="progress-track"><i style={{ width: `${((step + 1) / readinessQuestions.length) * 100}%` }} /></div><p className="eyebrow">READINESS CHECK</p><h2>{readinessQuestions[step].prompt}</h2><p>{readinessQuestions[step].help}</p><div className="answer-list">{readinessQuestions[step].options.map(([label, points]) => <button type="button" key={label} onClick={() => answer(label, points)}>{label}<span>→</span></button>)}</div></>}
          {complete && <><span className="complete-mark">✓</span><p className="eyebrow">ASSESSMENT SAVED</p><h2>Your readiness score is {score}/100.</h2><p>Your answers are saved on this device. The priorities below explain exactly what lowered the score and who should help review each item.</p><div className="result-actions">{actions.length ? actions.map((action, index) => <div key={action.title}><b>{index + 1}</b><span><strong>{action.title}</strong><small>Review with: {action.owner}</small></span></div>) : <div><b>✓</b><span><strong>No immediate gaps in these four areas</strong><small>Continue periodic professional reviews</small></span></div>}</div><button className="outline-button" type="button" onClick={start}>Retake assessment</button></>}
        </article>
      </section>
      <section className="document-snapshot"><div className="card-heading"><div><p className="eyebrow">EVIDENCE BEHIND THE SCORE</p><h3>Tracked plan items</h3></div><button type="button">Open coordination hub →</button></div><div className="document-mini-grid">{data.documents.map(item => <div key={item.id}><span className={`status-symbol ${item.status}`}>{item.status === 'complete' ? '✓' : item.status === 'missing' ? '×' : '!'}</span><p><strong>{item.name}</strong><small>{item.lastReviewed}</small></p><b className={`status-pill ${item.status}`}>{statusLabel(item.status)}</b></div>)}</div></section>
      <Disclaimer />
    </div>
  );
}

function TransferLab({ notify }) {
  const [estate, setEstate] = useState(8000000);
  const [mode, setMode] = useState('equal');
  const [saved, setSaved] = useState(false);
  const heirs = ['Maya', 'Arjun', 'Leena'];
  const shares = mode === 'equal' ? [1 / 3, 1 / 3, 1 / 3] : [0.4, 0.35, 0.25];
  const modes = {
    equal: ['Equal inheritance', 'Each heir receives the same total share directly.'],
    trust: ['Trust distributions', 'Different shares are held and released under trustee oversight.'],
    staggered: ['Staggered distributions', 'Shares are released in three hypothetical age-based stages.']
  };
  async function save() { await saveTransferScenario({ estate, mode, shares }); setSaved(true); notify('Hypothetical scenario saved'); }
  return (
    <div className="page">
      <PageIntro number="02" eyebrow="PRIORITY 2 · HYPOTHETICAL MODELING" title="Wealth transfer simulator" description="Parents can compare structures visually, understand tradeoffs, and bring a clearer question—not a final decision—to their professionals."><button className="primary-button" type="button" onClick={save}>{saved ? '✓ Scenario saved' : 'Save scenario'}</button></PageIntro>
      <section className="simulator-layout">
        <article className="sim-controls"><p className="eyebrow">SCENARIO INPUTS</p><label><span><strong>Illustrative estate value</strong><b>{money(estate)}</b></span><input type="range" min="3000000" max="20000000" step="500000" value={estate} onChange={event => { setEstate(Number(event.target.value)); setSaved(false); }} /></label><div className="mode-options"><p>Distribution structure</p>{Object.entries(modes).map(([id, [title, description]]) => <button className={mode === id ? 'active' : ''} type="button" key={id} onClick={() => { setMode(id); setSaved(false); }}><span>{mode === id ? '●' : '○'}</span><p><strong>{title}</strong><small>{description}</small></p></button>)}</div><div className="sim-warning"><span>i</span><p><strong>Educational comparison only.</strong> This simulator does not calculate taxes, legal eligibility, investment returns, or suitability.</p></div></article>
        <article className="sim-output"><div className="card-heading"><div><p className="eyebrow">SCENARIO OUTPUT</p><h3>{modes[mode][0]}</h3></div><span className="draft-pill">DRAFT</span></div><div className="allocation-total"><small>TOTAL MODELED</small><strong>{money(estate)}</strong><span>Across {heirs.length} heirs</span></div><div className="allocation-list">{heirs.map((heir, index) => <div key={heir}><span className={`heir-dot h${index + 1}`}>{heir[0]}</span><p><strong>{heir} Rivera</strong><small>{Math.round(shares[index] * 100)}% share</small></p><div className="allocation-bar"><i style={{ width: `${shares[index] * 100}%` }} /></div><b>{money(estate * shares[index])}</b></div>)}</div>{mode === 'staggered' ? <div className="distribution-timeline"><p className="eyebrow">ILLUSTRATIVE RELEASE SCHEDULE</p><div><span><b>25%</b><small>Age 25</small></span><i /><span><b>50%</b><small>Age 30</small></span><i /><span><b>25%</b><small>Age 35</small></span></div></div> : <div className="scenario-note"><p className="eyebrow">WHAT CHANGES IN THIS MODEL</p><p>{mode === 'equal' ? 'The visual is simple and balanced, but equal amounts may not reflect different needs, responsibilities, or asset types.' : 'Trust oversight can stage access and attach instructions, but trustee selection, costs, and governing terms require professional advice.'}</p></div>}<footer><span>Next step</span><p>Bring this draft to an estate attorney and tax advisor for legal structure, tax impact, and jurisdiction review.</p></footer></article>
      </section>
      <Disclaimer />
    </div>
  );
}

function CoordinationHub({ data, notify }) {
  const [documents, setDocuments] = useState(data.documents);
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? documents : documents.filter(item => item.status !== 'complete');
  function markReviewed(id) { setDocuments(items => items.map(item => item.id === id ? { ...item, status: 'complete', lastReviewed: '2026-07-13', nextAction: 'No immediate action due' } : item)); notify('Demo document status updated'); }
  return (
    <div className="page">
      <PageIntro number="03" eyebrow="PRIORITY 3 · PROFESSIONAL COORDINATION" title="Documents, advisors, and deadlines in one place" description="The coordination hub tracks whether important items exist and when they were reviewed. It does not upload or analyze real files in this demo."><button className="outline-button" type="button" onClick={() => notify('Demo add-document flow opened')}>+ Add document</button></PageIntro>
      <section className="coord-stats"><article><span>6</span><p><strong>Tracked items</strong><small>Across estate, accounts, and healthcare</small></p></article><article><span>3</span><p><strong>Current</strong><small>Reviewed and on file</small></p></article><article><span>3</span><p><strong>Need action</strong><small>Review, confirm, or create</small></p></article><article><span>2</span><p><strong>Professionals</strong><small>Attorney and wealth advisor</small></p></article></section>
      <section className="document-table-card"><div className="table-toolbar"><div><p className="eyebrow">PLAN CHECKLIST</p><h3>Professional coordination hub</h3></div><div className="segmented"><button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>All items</button><button className={filter === 'action' ? 'active' : ''} type="button" onClick={() => setFilter('action')}>Action needed</button></div></div><div className="document-table"><div className="table-head"><span>Plan item</span><span>Status</span><span>Last reviewed</span><span>Professional</span><span>Next action</span><span /></div>{visible.map(item => <div className="table-row" key={item.id}><span className="doc-name"><i>{item.name[0]}</i><p><strong>{item.name}</strong><small>{item.category}</small></p></span><span><b className={`status-pill ${item.status}`}>{statusLabel(item.status)}</b></span><span>{item.lastReviewed}</span><span>{item.advisor}</span><span>{item.nextAction}</span><span>{item.status !== 'complete' ? <button type="button" onClick={() => markReviewed(item.id)}>Mark reviewed</button> : '•••'}</span></div>)}</div></section>
      <section className="milestone-grid"><article><p className="eyebrow">LIFE-EVENT MONITOR</p><h3>Major events should trigger review—not automatic advice.</h3><div className="milestone"><span>＋</span><p><strong>Add life event</strong><small>Marriage, child, move, sale, or health change</small></p><button type="button">Record event →</button></div></article><article><p className="eyebrow">PROFESSIONAL DIRECTORY</p><h3>People responsible for the next review</h3><div className="professional"><span>ML</span><p><strong>Morgan Lee</strong><small>Estate attorney · Trust + directives</small></p><b>2 actions</b></div><div className="professional"><span>DK</span><p><strong>Dana Kim</strong><small>Wealth advisor · Accounts + insurance</small></p><b>1 action</b></div></article></section>
      <Disclaimer />
    </div>
  );
}

function LegacyPlanner({ notify }) {
  const [values, setValues] = useState(['Education', 'Independence', 'Family stewardship']);
  const [goals, setGoals] = useState([true, false, false]);
  const [instructions, setInstructions] = useState('Use the trust to support education, a first home, and long-term stability. Before any major withdrawal, meet with the family advisor and review how the decision affects the long-term plan.');
  const valueOptions = ['Education', 'Independence', 'Family stewardship', 'Entrepreneurship', 'Community giving', 'Long-term security'];
  const goalOptions = ['Complete graduate degree without debt', 'Build a six-month emergency fund', 'Understand trust distribution rules'];
  function toggleValue(value) { setValues(list => list.includes(value) ? list.filter(item => item !== value) : [...list, value]); }
  function sharePlan() {
    saveSharedFamilyContext({
      recipient: 'Maya Rivera',
      purpose: values,
      parentContext: instructions,
      learningGoal: goalOptions.find((goal, index) => goals[index]) || 'Understand trust distribution rules'
    });
    trackEvent('family_context_shared', { recipient: 'maya', valueCount: values.length });
    notify('Approved context shared with Maya’s roadmap');
  }
  return (
    <div className="page">
      <PageIntro number="04" eyebrow="PRIORITY 4 · FAMILY INTENTIONS" title="Parent legacy plan" description="Clarify what you are preparing to transfer, why it matters, and which context your family should receive alongside the financial plan."><button className="primary-button" type="button" onClick={sharePlan}>Approve &amp; share with Maya</button></PageIntro>
      <section className="legacy-layout"><div className="legacy-main"><article><p className="eyebrow">PURPOSE OF THE LEGACY</p><h2>What should this wealth make possible?</h2><p>Select the values that should shape family conversations and the support you want future generations to understand.</p><div className="value-chips">{valueOptions.map(value => <button className={values.includes(value) ? 'active' : ''} type="button" key={value} onClick={() => toggleValue(value)}>{values.includes(value) ? '✓ ' : '+ '}{value}</button>)}</div></article><article><p className="eyebrow">APPROVED FAMILY CONTEXT</p><h2>Explain the intention, not the private details.</h2><textarea value={instructions} onChange={event => setInstructions(event.target.value)} aria-label="Parent legacy instructions" /><small>This context reaches Maya only when you choose “Approve &amp; share.” Private plan details remain in the parent workspace.</small></article></div><aside className="legacy-roadmap"><p className="eyebrow light">PARENT PLAN</p><h2>From intention to a responsible handoff</h2><div className="roadmap-list">{[['Define what is being prepared', 'Complete'], ['Explain purpose and conditions', 'In progress'], ['Choose approved heir context', 'Ready to share'], ['Review with professionals', 'Next step']].map(([label, status], index) => <div key={label}><span>{index + 1}</span><p><strong>{label}</strong><small>{status}</small></p><i className={index === 0 ? 'done' : ''}>{index === 0 ? '✓' : '○'}</i></div>)}</div><div className="goal-checklist"><p className="eyebrow light">LEARNING PRIORITY FOR MAYA</p>{goalOptions.map((goal, index) => <label key={goal}><input type="radio" name="maya-goal" checked={goals[index]} onChange={() => setGoals(goalOptions.map((_, i) => i === index))} /><span>{goal}</span></label>)}</div></aside></section>
      <Disclaimer />
    </div>
  );
}

function FamilyOverview({ data, notify }) {
  const [assignments, setAssignments] = useState({});
  async function assign(heir) { const resource = heir.learningGoal; await assignHeirLearningGoal(heir.id, resource); setAssignments(current => ({ ...current, [heir.id]: resource })); notify(`${resource} assigned in demo mode`); }
  return (
    <div className="page">
      <PageIntro number="05" eyebrow="FAMILY PREPARATION" title="Family overview" description="See consent-based participation signals, recommend learning goals, and help each heir prepare at their own pace."><span className="handoff-badge"><i /> 3 FAMILY PROFILES</span></PageIntro>
      <section className="privacy-banner"><span>⌾</span><p><strong>Designed for boundaries.</strong> Parents see engagement summaries and assigned goals—not private AI-coach conversations, quiz answers, or personal financial decisions.</p></section>
      <section className="heir-grid">{data.heirs.map((heir, index) => <article className="heir-card" key={heir.id}><header><span className={`heir-avatar c${index + 1}`}>{heir.name.split(' ').map(part => part[0]).join('')}</span><div><h3>{heir.name}</h3><p>{heir.relationship}</p></div><b className={`connection ${heir.connection}`}>{heir.connection}</b></header><div className="engagement-stats"><span><small>ENGAGEMENT</small><strong>{heir.engagement ? `${heir.engagement}%` : '—'}</strong></span><span><small>FINANCIAL LITERACY</small><strong>{heir.literacy ? `${heir.literacy}%` : '—'}</strong></span></div><div className="engagement-bar"><i style={{ width: `${heir.engagement}%` }} /></div><div className="heir-recommendation"><p className="eyebrow">PARENT RECOMMENDATION</p><strong>{heir.recommendation}</strong><span>Suggested goal: {heir.learningGoal}</span></div><footer><button className="primary-button" type="button" disabled={heir.connection !== 'connected'} onClick={() => assign(heir)}>{assignments[heir.id] ? '✓ Assigned' : heir.connection === 'connected' ? 'Assign learning goal' : 'Awaiting consent'}</button><button className="outline-button" type="button">View profile →</button></footer></article>)}</section>
      <section className="api-handoff"><div><p className="eyebrow light">FAMILY PRIVACY</p><h2>Share what helps. Keep private what does not.</h2></div><div className="handoff-flow"><article><span>01</span><p><strong>Choose context</strong><small>Name, relationship, and learning goal</small></p></article><i>→</i><article><span>02</span><p><strong>Support learning</strong><small>Heirs receive relevant educational guidance</small></p></article><i>→</i><article><span>03</span><p><strong>See progress</strong><small>Only consented engagement status returns</small></p></article></div></section>
      <Disclaimer />
    </div>
  );
}

function JurisdictionMap({ data }) {
  const [selectedId, setSelectedId] = useState(data.jurisdictions[0].id);
  const selected = data.jurisdictions.find(item => item.id === selectedId);
  return (
    <div className="page">
      <PageIntro number="06" eyebrow="CROSS-BORDER ORGANIZATION" title="Jurisdiction map" description="Locations extracted or entered for assets are grouped into a review map. The system flags questions; licensed professionals provide the answers." />
      <section className="jurisdiction-layout"><div className="location-list"><p className="eyebrow">KNOWN LOCATIONS</p><h2>{data.jurisdictions.length} jurisdictions in the demo plan</h2>{data.jurisdictions.map(item => <button className={selectedId === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><span>{item.id === 'california' ? 'US' : item.id === 'singapore' ? 'SG' : 'MY'}</span><p><strong>{item.label}</strong><small>{item.type} · {item.assets.length} asset groups</small></p><i>→</i></button>)}</div><article className="jurisdiction-detail"><header><div><p className="eyebrow light">SELECTED JURISDICTION</p><h2>{selected.label}</h2><span>{selected.type}</span></div><div className="map-orbit"><i /><i /><b>{selected.id === 'california' ? 'US' : selected.id === 'singapore' ? 'SG' : 'MY'}</b></div></header><section><p className="eyebrow">ASSETS CONNECTED HERE</p><div className="asset-tags">{selected.assets.map(asset => <span key={asset}>{asset}</span>)}</div></section><section><p className="eyebrow">QUESTIONS TO REVIEW</p><div className="flag-list">{selected.flags.map((flag, index) => <div key={flag}><span>0{index + 1}</span><p>{flag}</p><b>REVIEW</b></div>)}</div></section><footer><span>Recommended professional</span><strong>{selected.professional}</strong><button className="outline-button" type="button">Add to review agenda →</button></footer></article></section>
      <section className="jurisdiction-warning"><span>!</span><p><strong>No automatic legal conclusions.</strong> Citizenship, residency, asset type, title, tax status, and local law can interact in ways Heirline cannot determine automatically. Use this view to organize location context and prepare questions for counsel.</p></section>
      <Disclaimer />
    </div>
  );
}

function Disclaimer() {
  return <p className="disclaimer">Illustrative information only. Heirline provides organizational and educational support—not legal, tax, or financial advice.</p>;
}
