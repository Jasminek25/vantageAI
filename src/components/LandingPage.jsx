import React from 'react';

const roles = [
  {
    id: 'parent',
    owner: 'Vedang',
    icon: '◆',
    title: 'Parent / Wealth Holder',
    description: "Assess estate readiness, plan your legacy, simulate transfer strategies, and supervise your heirs' progress.",
    features: ['Inheritance Readiness Assessment', 'Legacy Planner', 'Wealth Transfer Simulator', 'Professional Coordination Hub', 'Family Overview', 'Jurisdictional Location'],
    action: 'Enter Parent Dashboard'
  },
  {
    id: 'heir',
    owner: 'Aayush',
    icon: '◇',
    title: 'Heir',
    description: 'Learn from an AI financial coach, simulate what to do with an inheritance, and build a personalized wealth roadmap.',
    features: ['AI Financial Coach', 'Asset Manager', 'Personalized Wealth Roadmap', 'Documentation Checklist'],
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
  ['②', 'Legacy Planner', 'Document financial goals, family values, and inheritance instructions in one living plan.'],
  ['③', 'Wealth Transfer Simulator', 'Compare equal inheritance, trust distributions, and staggered distribution strategies.'],
  ['④', 'Professional Coordination Hub', 'Track legal documents, professional contacts, and life-event milestones in one checklist.'],
  ['⑤', 'Family Overview', 'See engagement and financial literacy across every linked heir account.'],
  ['⑥', 'Jurisdictional Location', "Surface cross-border legal and tax considerations tied to each asset's location."]
];

export default function LandingPage({ onChooseRole }) {
  const scrollToRoles = () => document.getElementById('role-selection')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="integrated-landing">
      <header className="landing-nav">
        <button className="landing-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>H</span><strong>Heirline</strong>
        </button>
        <nav aria-label="Main navigation">
          <button className="landing-link" type="button" onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          <button className="landing-primary compact" type="button" onClick={scrollToRoles}>Get started</button>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker">✦ AI-GUIDED ESTATE &amp; WEALTH TRANSFER PLANNING</p>
            <h1>Plan the handoff.<br />Prepare the next generation.</h1>
            <p>Heirline helps families organize wills, trusts, and beneficiary plans, simulate wealth transfer strategies, and prepare heirs to receive and manage what they inherit—all in one connected platform.</p>
            <div className="landing-actions">
              <button className="landing-primary" type="button" onClick={scrollToRoles}>Choose your dashboard</button>
              <button className="landing-secondary" type="button" onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}>See all features</button>
            </div>
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
                <header><span>{role.icon}</span><b>{role.owner}</b></header>
                <h3>{role.title}</h3><p>{role.description}</p>
                <ul>{role.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                <button type="button" onClick={() => onChooseRole(role.id)}>{role.action}<span>→</span></button>
              </article>
            ))}
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
    </div>
  );
}
