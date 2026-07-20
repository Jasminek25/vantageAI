import React from 'react';

export default function FutureFeature({ onBack }) {
  return (
    <main className="future-feature-page">
      <button type="button" onClick={onBack}>← Back to role selection</button>
      <section>
        <span>HEIRLINE FOR PROFESSIONALS · COMING SOON</span>
        <h1>Wealth Manager Dashboard</h1>
        <p>A professional workspace for following household readiness, coordinating review milestones, and supporting families at the moments that matter.</p>
        <div><article><b>01</b><h2>Household overview</h2><p>Consent-based status across linked parent and heir accounts.</p></article><article><b>02</b><h2>Review milestones</h2><p>Upcoming professional reviews, document gaps, and life events.</p></article><article><b>03</b><h2>Interventions</h2><p>Human follow-up when education or coordination needs attention.</p></article></div>
        <button className="future-back" type="button" onClick={onBack}>Explore available dashboards</button>
      </section>
    </main>
  );
}
