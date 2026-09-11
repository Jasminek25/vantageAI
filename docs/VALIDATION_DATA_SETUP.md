# Heirline validation data setup

This optional, no-paid-infrastructure setup connects the landing-page interest
form and product events to one Google Sheet. Until it is connected, the demo
safely stores submissions and events in the current browser so every flow still
works during a presentation.

## What is collected after measurement consent

- Leads: email, family/advisor audience, optional firm, selected priority,
  consent, and campaign tags.
- Acquisition events: anonymous session ID, page/CTA name, time, and campaign
  tags.
- Product-behavior events: 10/30/60-second active-engagement milestones,
  25/50/75-percent scroll milestones, dashboard selection, and named feature
  openings.
- Session summary: active visible time, maximum scroll depth, and the selected
  experience. Time in a background tab is not counted.

The form explicitly rejects financial, legal, account, and document details.
Coach conversations, dashboard answers, mouse coordinates, document contents,
and fictional financial values are never sent to analytics. Visitors can reject
measurement and continue using the site; contact-form consent is handled
separately.

## Connect a Google Sheet

1. Create a Google Sheet named `Heirline Pilot Validation`.
2. Open **Extensions → Apps Script** from that sheet.
3. Replace the editor contents with
   [`integrations/google-apps-script/Code.gs`](../integrations/google-apps-script/Code.gs).
4. Choose **Deploy → New deployment → Web app**. Run as yourself and allow the
   pilot audience to access the web app.
5. Copy the deployed `/exec` URL into a local `.env` file:

   ```text
   VITE_DATA_ENDPOINT=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
   ```

6. Rebuild and republish the website. The script creates `Leads` and `Events`
   tabs automatically on the first submissions.

The production build is currently connected to the Heirline pilot validation
collector through the public fallback URL in `src/services/analytics.js`. A
`VITE_DATA_ENDPOINT` value can replace it for another deployment. The Google
Sheet remains private; only the public collector URL is included in the client
build.

## Campaign review

Keep the Google Sheet in the team Drive folder. During a funded pilot, review:

- lead conversion by family vs. advisor audience;
- conversion by `utm_source`, `utm_campaign`, and `utm_content`;
- which CTA and dashboard experiences are opened most often;
- qualitative priority selections from each audience.

The `Product Behavior` tab separates production traffic from prelaunch QA and
shows the landing-to-dashboard funnel, parent-versus-heir interest, and feature
activity. This makes the same Sheet readable through the team's Google Drive
workflow for weekly summaries and trend analysis without adding a paid
database.
