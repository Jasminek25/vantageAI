import React from 'react';

const roles = [
  {
    id: 'parent',
    owner: 'Vedang',
    icon: '◆',
    title: 'Parent / Wealth Holder',
    description: 'Assess readiness, compare transfer structures, coordinate professionals, and prepare heirs with clear family context.',
    features: ['Readiness assessment', 'Legacy and transfer planning', 'Family and jurisdiction overview'],
    action: 'Enter parent dashboard'
  },
  {
    id: 'heir',
    owner: 'Aayush',
    icon: '◇',
    title: 'Heir',
    description: 'Learn through an inheritance coach, organize inherited assets, review filing documents, and build a financial roadmap.',
    features: ['AI inheritance coach', 'Asset and financial planner', 'State document checklist'],
    action: 'Enter heir dashboard'
  },
  {
    id: 'manager',
    owner: 'Future scope',
    icon: '▣',
    title: 'Wealth Manager',
    description: 'A future professional view for monitoring consented household progress and coordinating review milestones.',
    features: ['Household overview', 'Progress monitoring', 'Professional interventions'],
    action: 'View future feature',
    future: true
  }
];

const capabilities = [
  ['01', 'Prepare', 'Parents organize plans, documents, values, and transfer questions.'],
  ['02', 'Educate', 'Heirs build financial literacy before making inheritance decisions.'],
  ['03', 'Connect', 'Only approved context moves between the two private experiences.'],
  ['04', 'Review', 'Professionals remain responsible for legal, tax, and financial advice.']
];

export default function LandingPage({ onChooseRole }) {
  function scrollToRoles() {
    document.getElementById('role-selection')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="integrated-landing">
      <header className="landing-nav">
        <button className="landing-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>V</span><strong>Vantage AI</strong>
        </button>
        <div>
          <button className="landing-link" type="button" onClick={() => document.getElementById('platform-flow')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          <button className="landing-primary compact" type="button" onClick={scrollToRoles}>Choose dashboard</button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker">✦ AI-GUIDED ESTATE &amp; WEALTH TRANSFER PLANNING</p>
            <h1>Plan the handoff.<br />Prepare the next generation.</h1>
            <p>One connected prototype for the family member preparing wealth and the heir learning how to receive it responsibly.</p>
            <div className="landing-actions">
              <button className="landing-primary" type="button" onClick={scrollToRoles}>Choose your dashboard →</button>
              <button className="landing-secondary" type="button" onClick={() => document.getElementById('platform-flow')?.scrollIntoView({ behavior: 'smooth' })}>See the product flow</button>
            </div>
            <div className="landing-proof"><span><i /> ONE SHARED WEBSITE</span><span>2 WORKING EXPERIENCES</span><span>FICTIONAL DEMO DATA</span></div>
          </div>
          <div className="landing-preview" aria-label="Integrated product status">
            <div className="preview-heading"><span className="preview-mark">V</span><div><small>RIVERA FAMILY</small><strong>Integration snapshot</strong></div><b>DEMO</b></div>
            <div className="preview-score"><div><small>PLAN READINESS</small><strong>58<span>/100</span></strong></div><div className="preview-ring"><span>58</span></div></div>
            <div className="preview-rows">
              <div><span>Parent dashboard</span><b className="ready">Working</b></div>
              <div><span>Heir tools + backend</span><b className="ready">Connected</b></div>
              <div><span>Shared consent boundary</span><b className="ready">Defined</b></div>
              <div><span>Wealth manager view</span><b>Future</b></div>
            </div>
          </div>
        </section>

        <section className="landing-flow" id="platform-flow">
          {capabilities.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></article>)}
        </section>

        <section className="role-selection" id="role-selection">
          <div className="role-heading"><p className="landing-kicker">CHOOSE A VANTAGE POINT</p><h2>One platform. Clear ownership.</h2><p>The final prototype keeps each teammate's work identifiable while making the experience feel like one product.</p></div>
          <div className="integrated-role-grid">
            {roles.map(role => (
              <article className={role.future ? 'integrated-role-card future' : 'integrated-role-card'} key={role.id}>
                <header><span>{role.icon}</span><b>{role.owner}</b></header>
                <h3>{role.title}</h3><p>{role.description}</p>
                <ul>{role.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                <button type="button" onClick={() => onChooseRole(role.id)}>{role.action} <span>→</span></button>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-boundary">
          <div><p className="landing-kicker light">DESIGNED AROUND TRUST</p><h2>Connected does not mean exposed.</h2></div>
          <p>The parent can share goals and approved context. The heir's private coach questions, financial decisions, and uploaded records remain outside the parent view.</p>
          <span>Educational prototype · Not legal, tax, or financial advice</span>
        </section>
      </main>
      <footer className="landing-footer"><strong>Vantage AI</strong><span>Shared frontend by Jasmine · Parent dashboard by Vedang · Heir backend by Aayush</span></footer>
    </div>
  );
}
