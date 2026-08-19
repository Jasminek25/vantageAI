# Heirline $200 Pilot — Approval and Launch Checklist

Updated: August 18, 2026

This is the operating checklist for the first Vantage AI-funded Heirline market
test. It deliberately separates work the student team can prepare from actions
that require Vantage AI ownership or approval.

## Current checkpoint

- `tryheirline.com` is purchased through Vantage AI, hosted on Vercel, and live
  over HTTPS.
- The Reddit Pixel is consent-gated and the first-party Google Sheet collector
  records tagged visits, leads, and anonymous product-behavior events.
- Prelaunch QA rows are retained as evidence but excluded from production-pilot
  totals. Paid results remain at zero until a campaign is launched.
- Reddit configuration and tagged-path QA are the active launch path. Meta is
  blocked because the provided Facebook account is disabled.
- No campaign has been launched and no advertising spend has occurred.

## Launch decision

- **Business-model direction:** B2B2C remains the long-term hypothesis. A wealth
  management firm would be the buyer or distribution partner, while parents and
  heirs use the experience.
- **Paid-test audience:** the first $200 test validates direct family interest.
  The budget is too small to split credibly across two buying audiences and two
  advertising platforms.
- **Advisor validation:** conduct direct, no-cost outreach to 10 independent
  advisors or firms during the same period. This tests the buyer hypothesis
  without diluting paid-media learning.
- **Paid channels:** Meta and Reddit only, as requested by Vantage AI.
- **Conversion:** a consented early-access form submission. The website and
  Google Sheets collector already record source, campaign, and creative.

## Exact $200 ceiling

| Use | Maximum | Control |
| --- | ---: | --- |
| `tryheirline.com` first year | $12.00 | Purchase only after Vantage AI approval; current published `.com` price is $11.08 before any checkout variation |
| Meta campaign | $100.00 | Seven-day lifetime budget; two static ads in one ad set |
| Reddit campaign | $70.00 | $10 daily budget for seven days |
| Launch reserve | $18.00 | Covers domain checkout variation, tax, or a required tracking repair; otherwise remains unspent |
| **Absolute maximum** | **$200.00** | No automatic renewal or second round is authorized |

The reserve is not extra media money. If the domain costs more than $12, reduce
the reserve first. If the final total would exceed $200, reduce Meta spend. Do
not exceed the approved ceiling.

## Vantage AI actions required before launch

An or another authorized adult at Vantage AI should:

1. approve the product name for this pilot and choose the domain;
2. create and own the registrar account, billing method, recovery email, domain
   renewal, and DNS access;
3. create and own the Meta Business Portfolio, Facebook Page, ad account, and
   payment method;
4. create and own the Reddit business profile, Reddit Ads account, and payment
   method;
5. confirm the legal advertiser name, business address, public contact method,
   and person responsible for responding to leads;
6. approve the privacy notice, consent language, and educational/non-advice
   disclosure;
7. decide whether Meta Ads Manager requires the Financial Products and Services
   Special Ad Category and use only the targeting controls the platform permits;
8. invite the team through role-based access. Never share passwords or card
   details in Slack, GitHub, Drive, or the validation sheet; and
9. provide a written launch approval after the paused campaigns pass QA.

## Team actions after access is granted

1. Confirm `tryheirline.com` continues resolving through Vercel with HTTPS.
2. Verify the three tagged `tryheirline.com` campaign URLs below.
3. Confirm the live site loads on phone and desktop.
4. Open each tagged URL and verify that the family interest form opens
   immediately.
5. Submit one clearly labeled test lead from each URL.
6. Confirm the leads and associated events appear in the Google Sheet with the
   correct source, campaign, content, and anonymous session values.
7. Confirm the same session records consented engagement, dashboard selection,
   and feature-opening events without recording private financial inputs.
8. Keep QA records labeled with a `qa` content tag so they remain reviewable but
   are excluded from production reporting.
9. Load the campaigns in a **paused** state and complete the settings review.
10. Take screenshots of the paused campaign settings and send them to An for
    final approval.
11. Launch only after written approval.

## Campaign URLs

### Meta ad A — Parent Plan / Heir Ready

```text
https://tryheirline.com/?open=interest&audience=family&utm_source=meta&utm_medium=paid_social&utm_campaign=heirline_family_validation_2026_08&utm_content=parent_plan
```

### Meta ad B — Prepared for the Future

```text
https://tryheirline.com/?open=interest&audience=family&utm_source=meta&utm_medium=paid_social&utm_campaign=heirline_family_validation_2026_08&utm_content=prepared_future
```

### Reddit ad — Handoff Plan

```text
https://tryheirline.com/?open=interest&audience=family&utm_source=reddit&utm_medium=paid_social&utm_campaign=heirline_family_validation_2026_08&utm_content=handoff_plan
```

## Meta campaign build sheet

- Campaign name: `HL_Family_Validation_Aug2026_Meta`
- Objective: Traffic
- Conversion location: Website
- Performance goal: maximize link clicks until an approved Meta Pixel is
  installed; the Heirline validation sheet remains the source of truth for form
  submissions.
- Budget: $100 lifetime
- Schedule: seven complete days
- Ad sets: one
- Ads: two static 4:5 creatives
- Location: United States
- Audience: use broad eligible targeting. If the campaign is not classified as
  a financial-services special category, start with ages 45–65+ and use estate
  planning, retirement planning, financial planning, wills and trusts, and
  family-caregiving interests only as suggestions. If the special category is
  required, accept its restrictions and do not attempt to work around them.
- Placements: Advantage+ placements, with both creatives checked in every
  generated preview. Remove a placement only when the preview visibly breaks.
- CTA: Learn More
- Attribution/reporting: retain Meta defaults, but judge the pilot using the
  validation sheet's consented submissions rather than platform-estimated leads.

## Reddit campaign build sheet

- Campaign name: `HL_Family_Validation_Aug2026_Reddit`
- Objective: Traffic
- Bid strategy: Lowest cost
- Budget: $10 per day for seven days; fixed end date
- Placements: Feed and Conversation
- Location: United States
- Interests to check in Ads Manager: Personal Finance, Retirement, Family and
  Relationships, Financial Planning, and Wealth Management
- Keyword themes to check: estate planning, inheritance, beneficiary,
  beneficiaries, family trust, wills and trusts, preparing heirs, and financial
  handoff
- Candidate communities to verify for eligibility: `r/personalfinance`,
  `r/EstatePlanning`, `r/retirement`, and `r/financialplanning`
- Creative: Parent Plan / Heir Ready 4:5 image
- CTA: Learn More
- Comments: enable only if one named team member checks them at least daily,
  answers product questions without giving personal advice, and escalates legal,
  tax, or investment questions instead of answering them.

Not every interest, keyword, or community is guaranteed to be available in a
new advertiser account. The live options shown in Ads Manager control.

## Launch-day QA

- Domain resolves with HTTPS and no browser warning.
- Logo, buttons, dashboard switching, and mobile layout work.
- All three links retain their UTM parameters.
- Each link opens the interest form with `Family member` selected.
- The form refuses submission without email, priority, and consent.
- The form warns visitors not to enter financial, legal, or account data.
- The Google Sheet receives the lead and `interest_submitted` event.
- Sample and live rows are visibly separated.
- Ad copy matches the landing-page promise.
- The website and ads state that Heirline is educational and organizational,
  not legal, tax, investment, or financial advice.
- Campaign and ad-set spend controls add up to no more than the approved amount.
- Both campaigns are paused before An's final review.

## Operating cadence

- **Daily:** spend, delivery, rejections, broken links, spam, comments, and live
  lead count.
- **After 72 hours:** report delivery and tracking health; do not declare a
  winner from a tiny sample.
- **Day 7:** stop automatically at the configured end time.
- **Days 8–10:** contact consented leads, conduct short interviews, and tag lead
  quality.
- **Day 14:** deliver a one-page decision memo.

## Decision rules

The $200 test is directional, not proof of product-market fit.

- **Promising family signal:** at least 10 valid, consented family leads and at
  least three follow-up responses that repeat the same preparation problem.
- **Promising advisor signal:** at least three substantive advisor conversations
  from direct outreach and at least one willingness to review or pilot the
  product with clients.
- **Creative winner:** compare spend, impressions, clicks, click-through rate,
  form submissions, landing-to-lead conversion, and cost per valid lead. Do not
  select a winner based on clicks alone.
- **Stop condition:** broken tracking, rejected or misleading creative, a spend
  cap problem, unsafe personal data, or a compliance concern.
- **Next funding request:** only after the team can show the data, explain the
  repeated user problem, and identify one audience-and-message combination worth
  a larger test.

## Next-sync decision checklist

The next sync should end with explicit answers to these questions:

1. Does An want the team to proceed with Reddit while Meta access is repaired?
2. Is the final Reddit campaign visible in a saved, paused state in the
   Vantage-owned account?
3. Who will monitor Reddit comments and who owns consented lead follow-up?
4. Does An approve the current narrow measurement/privacy language?
5. After collaborator QA passes, what exact written approval should authorize
   the first paid day?
6. Should unused Meta budget remain reserved or move to Reddit only after a
   separate approval?
