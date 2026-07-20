import React, { useState } from 'react';
import { analyticsMode, submitInterest, trackEvent } from '../services/analytics.js';

const roles = [
  {
    id: 'parent',
    icon: '◆',
    title: 'Parent / Wealth Holder',
    description: 'Assess estate readiness, shape the purpose of your legacy, compare transfer strategies, and prepare your family.',
    features: ['Inheritance Readiness Assessment', 'Parent Legacy Plan', 'Wealth Transfer Simulator', 'Professional Coordination Hub', 'Family Overview', 'Jurisdictional Location'],
    action: 'Enter Parent Dashboard'
  },
  {
    id: 'heir',
    icon: '◇',
    title: 'Heir',
    description: 'Learn from a private financial coach, organize what you receive, and build your own preparation roadmap.',
    features: ['Inheritance Coach', 'Asset Manager', 'Heir Financial Roadmap', 'Documentation Checklist'],
    action: 'Enter Heir Dashboard'
  },
  {
    id: 'manager',
    owner: 'Coming soon',
    icon: '▣',
    title: 'Wealth Manager',
    description: 'Track engagement across parent and heir accounts and step in with guided interventions when needed.',
    features: ['Client Household Overview', 'Parent & Heir Progress Tracking', 'Alerts & Interventions'],
    action: 'Preview Manager Dashboard',
    future: true
  }
];

const capabilities = [
  ['①', 'Readiness Assessment', 'Reviews wills, trusts, and beneficiary designations to generate a readiness score and next steps.'],
  ['②', 'Parent Legacy Plan', 'Clarify the purpose, conditions, and approved family context that should accompany a future transfer.'],
  ['③', 'Wealth Transfer Simulator', 'Compare equal inheritance, trust distributions, and staggered distribution strategies.'],
  ['④', 'Professional Coordination Hub', 'Track legal documents, professional contacts, and life-event milestones in one checklist.'],
  ['⑤', 'Family Overview', 'See engagement and financial literacy across every linked heir account.'],
  ['⑥', 'Jurisdictional Location', "Surface cross-border legal and tax considerations tied to each asset's location."]
];

export default function LandingPage({ onChooseRole }) {
  const [interestOpen, setInterestOpen] = useState(false);
  const [audience, setAudience] = useState('family');
  function openInterest(nextAudience = 'family') {
    setAudience(nextAudience);
    setInterestOpen(true);
    trackEvent('interest_form_opened', { audience: nextAudience });
  }

  function enterDashboard(role) {
    trackEvent('dashboard_selected', { role });
    onChooseRole(role);
  }

  return (
    <div className="integrated-landing">
      <header className="landing-nav">
        <button className="landing-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>H</span><strong>Heirline</strong>
        </button>
        <nav aria-label="Main navigation">
          <button className="landing-link" type="button" onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          <button className="landing-primary compact" type="button" onClick={() => openInterest('family')}>Join early access</button>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker">✦ AI-GUIDED ESTATE &amp; WEALTH TRANSFER PLANNING</p>
            <h1>Plan the handoff.<br />Prepare the next generation.</h1>
            <p>Heirline helps families organize wills, trusts, and beneficiary plans, simulate wealth transfer strategies, and prepare heirs to receive and manage what they inherit—all in one connected platform.</p>
            <div className="landing-actions">
              <button className="landing-primary" type="button" onClick={() => enterDashboard('parent')}>Check family readiness</button>
              <button className="landing-secondary" type="button" onClick={() => openInterest('family')}>Join early access</button>
            </div>
            <small className="landing-reassurance">Free early access · Fictional data is used throughout this demonstration</small>
          </div>

          <div className="landing-preview" aria-label="Family plan preview">
            <div className="preview-heading"><span className="preview-mark">H</span><div><small>RIVERA FAMILY</small><strong>Family plan snapshot</strong></div><b>DEMO</b></div>
            <div className="preview-score"><div><small>INHERITANCE READINESS SCORE</small><strong>58<span>/100</span></strong></div><div className="preview-ring"><span>58</span></div></div>
            <div className="preview-rows">
              <div><span>Legal documents on file</span><b className="ready">3 of 6</b></div>
              <div><span>Heirs linked to this plan</span><b className="ready">3</b></div>
              <div><span>Jurisdictions tracked</span><b className="ready">3</b></div>
              <div><span>Next milestone review</span><b>Sep 2026</b></div>
            </div>
          </div>
        </section>

        <section className="role-selection" id="role-selection">
          <div className="role-heading"><p className="landing-kicker">CHOOSE YOUR DASHBOARD</p><h2>One platform, three perspectives</h2><p>Select the experience that matches your role in the family wealth journey.</p></div>
          <div className="integrated-role-grid">
            {roles.map(role => (
              <article className={role.future ? 'integrated-role-card future' : 'integrated-role-card'} key={role.id}>
                <header><span>{role.icon}</span>{role.owner && <b>{role.owner}</b>}</header>
                <h3>{role.title}</h3><p>{role.description}</p>
                <ul>{role.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                <button type="button" onClick={() => enterDashboard(role.id)}>{role.action}<span>→</span></button>
              </article>
            ))}
          </div>
        </section>

        <section className="validation-cta" aria-labelledby="validation-title">
          <div><p className="landing-kicker">HELP SHAPE EARLY ACCESS</p><h2 id="validation-title">A better inheritance conversation starts before the handoff.</h2><p>Choose the path that fits you. Families can join early access, while wealth advisors can request a guided pilot for their clients.</p></div>
          <div className="validation-options">
            <button type="button" onClick={() => openInterest('family')}><small>FOR FAMILIES</small><strong>Join early access</strong><span>Share what would help your family prepare →</span></button>
            <button type="button" onClick={() => openInterest('advisor')}><small>FOR ADVISORS &amp; FIRMS</small><strong>Request a pilot</strong><span>Explore a branded client experience →</span></button>
          </div>
        </section>

        <section className="landing-feature-section" id="capabilities">
          <div className="landing-feature-inner">
            <p className="landing-kicker light">A CONNECTED FAMILY WEALTH WORKSPACE</p>
            <h2>What Heirline does</h2>
            <div className="landing-capability-grid">
              {capabilities.map(([icon, title, description]) => <article key={title}><span>{icon}</span><h3>{title}</h3><p>{description}</p></article>)}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer"><strong>Heirline</strong><span>Family wealth planning for every generation.</span></footer>
      {interestOpen && <InterestDialog initialAudience={audience} onClose={() => setInterestOpen(false)} />}
    </div>
  );
}

function InterestDialog({ initialAudience, onClose }) {
  const [form, setForm] = useState({ email: '', audience: initialAudience, organization: '', priority: '', consent: false });
  const [status, setStatus] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!form.email || !form.priority || !form.consent) return;
    setStatus('Saving your interest…');
    const result = await submitInterest(form);
    setStatus(result.delivered ? 'You’re on the list. We’ll be in touch.' : 'Saved for this demonstration. Campaign collection can be connected when the pilot begins.');
  }

  return <div className="interest-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="interest-dialog" role="dialog" aria-modal="true" aria-labelledby="interest-title">
      <button className="interest-close" type="button" aria-label="Close" onClick={onClose}>×</button>
      {status.startsWith('You') || status.startsWith('Saved') ? <div className="interest-success"><span>✓</span><p className="landing-kicker">INTEREST RECORDED</p><h2>Thank you for helping shape Heirline.</h2><p>{status}</p><button className="landing-primary" type="button" onClick={onClose}>Return to Heirline</button></div> : <>
        <p className="landing-kicker">EARLY ACCESS</p><h2 id="interest-title">Tell us where Heirline could help.</h2><p>We only collect what is needed to follow up. Do not enter financial, legal, or account information.</p>
        <form onSubmit={submit}>
          <fieldset><legend>I’m interested as a…</legend><label><input type="radio" name="audience" checked={form.audience === 'family'} onChange={() => setForm({ ...form, audience: 'family' })} /> Family member</label><label><input type="radio" name="audience" checked={form.audience === 'advisor'} onChange={() => setForm({ ...form, audience: 'advisor' })} /> Advisor or wealth firm</label></fieldset>
          <label>Email address<input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
          {form.audience === 'advisor' && <label>Organization <span>(optional)</span><input value={form.organization} onChange={event => setForm({ ...form, organization: event.target.value })} placeholder="Firm name" /></label>}
          <label>What matters most?<select required value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option value="">Choose one</option><option>Organizing estate readiness</option><option>Preparing heirs financially</option><option>Coordinating family and advisors</option><option>Offering a better client experience</option></select></label>
          <label className="interest-consent"><input type="checkbox" checked={form.consent} onChange={event => setForm({ ...form, consent: event.target.checked })} /> I agree to be contacted about Heirline early access or a pilot.</label>
          <button className="landing-primary" type="submit">{form.audience === 'advisor' ? 'Request pilot information' : 'Join early access'} →</button>
          {status && <small>{status}</small>}
        </form>
        <small className="interest-mode">{analyticsMode() === 'connected' ? 'Secure pilot collection is connected.' : 'Demonstration collection mode.'}</small>
      </>}
    </section>
  </div>;
}
