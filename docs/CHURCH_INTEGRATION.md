# Church connection, sermons, and intelligence

This change connects the member application to a canonical church, its appearance and leadership contacts, and stable sermon editions. Anonymous aggregate intelligence and identifiable church-care permission are separate product flows. A disabled development receiver supports testing minimized activity contracts. It does not connect an attendance system, membership system, giving system, or the separately hosted synthetic Church Intelligence dashboard to production records.

**Product clarification:** anonymous aggregate intelligence is not intended to require a member opt-in. Permission to connect an identifiable person with church leadership for serious physical, spiritual or mental safety concerns is separate. The profile now records that church-specific care preference locally; no automated detection, alerting, referral, or leadership disclosure is implemented. The raw activity receiver documented below is a pseudonymous pilot, not the completed anonymous reporting architecture. Its member provider requires an explicit `NEXT_PUBLIC_ENABLE_PSEUDONYMOUS_ANALYTICS_PILOT=true` build flag in addition to the server flag; it is disabled in the normal app. The old analytics opt-in component is retained for pilot development but is not mounted in the member profile. Do not simply switch on that pilot as an anonymous-data implementation. A release must finish and validate the aggregation/de-identification boundary and retain disclosure about underlying processing.

## Member and leader flows

- LifeStages approves a church and provisions an email-bound invitation. The leader opens `/church/manage#invite=…`, creates the church and owner account, and sets its name, colors, logo, welcome message, and public leadership contact. Invitations expire after seven days and are consumed once. The token is removed from the URL on load.
- Existing leaders sign in at `/church/manage`. Owner, pastor and admin roles can make changes; the server denies writes by viewers. Signed sessions last one hour, remain in component memory, and are rechecked against the current administrator record on every request.
- Members open `/connect?church=code`, review the church, and explicitly connect. This stores the public church code in their existing local profile. The provider resolves it to the database UUID; a code is not an administrator credential or proof of church membership.
- `/my-church` presents the selected church and leadership contact links. The church name and configured colors appear on branded surfaces, with contrasting text. Settings refresh on foreground/focus/online and every visible minute. Connecting to a church does not grant identifiable care permission.
- Sermon automation is the intended weekly flow: connect the existing publishing source once, then continue publishing there. The source adapter and deployment requirements are described below when enabled. Manual publication remains a fallback.
- A manually published sermon stores its title, date, Scripture, summary, optional recording link and optional transcript as a new immutable edition. Revising creates another edition, leaving the original ID available. The newest sermon date, then publication time, determines the current manual sermon. Member responses exclude uploaded transcripts and administrator records. The summary supplies the existing sermon companion context; storing text does not mean TDE analysis has run.
- Bible links resolve a full book name and chapter, optionally a verse or same-chapter range. Ambiguous or unsupported references ask the member to select the passage rather than opening a guessed passage. Opening a link counts as a displayed chapter, not a manually selected verse.

## Setup and deployment

No migration, invitation, real provider job, production event collection, or deployment was executed during this change. Review the migrations against the actual existing `churches`, `church_admins` and TrueTeachings schema before applying them. The repository does not contain the complete original database schema.

1. Apply `db/migrations/20261003_church_management.sql` and `20261003_church_analytics.sql` in the appropriate database. New private tables use row-level security and service-role-only access. The management migration also removes browser access to administrator password hashes.
2. Configure server-only `SUPABASE_URL` (or existing `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. Never put the service key into a public environment variable.
3. For leader setup, configure `CHURCH_MANAGEMENT_ENABLED=true`, a random `CHURCH_ADMIN_SESSION_SECRET` of at least 32 characters, and exact comma-separated `CHURCH_MANAGEMENT_ALLOWED_ORIGINS` when the app and API have different origins. Wildcards do not authorize origins.
4. After approving the recipient, an operator can run `node scripts/create-church-invite.mjs --email APPROVED_EMAIL --app-url HTTPS_APP_ORIGIN`. This writes an invitation and prints its one-time link; deliver it privately to that recipient. The helper does not send email automatically.
5. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed API origin for Capacitor/cross-origin builds and `NEXT_PUBLIC_APP_URL` to the public member app origin for connection links. Web builds on the same origin can omit the API base.
6. Before enabling activity collection, schedule `select public.prune_church_analytics_events();` daily with the database/platform scheduler. This removes raw events older than 90 days. Configure a stable random `CHURCH_ANALYTICS_HMAC_SECRET` of at least 32 characters, exact `CHURCH_ANALYTICS_ALLOWED_ORIGINS`, and then `CHURCH_ANALYTICS_ENABLED=true`. Keep collection disabled until privacy/retention and authorized aggregate reporting are configured. Rotating the HMAC secret requires a versioned migration plan to retain erasure capability.

The full test suite passes (76 tests), and `npm run typecheck` completes without diagnostics. The malformed requests, orphan dashboard block, Expo-only TypeScript configuration, AI SDK option names, native purchase adapter and legacy chat UI compatibility errors were repaired as part of making these screens runnable. Native billing requires the platform-specific public RevenueCat SDK key (`NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` or `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY`); absent configuration fails closed. Tests mock the SDK. Static mobile export and device/App Store readiness have not been verified.

The webpack production build also completed successfully with nonfunctional test credentials and provider jobs disabled. Browser checks against the production server and local in-memory fixture verified leader sign-in, sermon-source controls and the sermon archive. The member flow successfully connected to Fictional Harbor Church and opened `/my-church`, showing its name, leadership contact email, and the published sermon “Hope through Change” dated 2026-10-03 with John 3:16. These checks validate the built application with fictional fixture responses; they do not establish live database, YouTube, AI, email or payment integration.

## Automatic sermon discovery

Apply `db/migrations/20261003_sermon_automation.sql` along with the management migration. Configure server-only `YOUTUBE_DATA_API_KEY`, `SERMON_DISCOVERY_ENABLED=true`, and `CRON_SECRET` with at least 32 random characters. The operator configures this once; a church leader never needs an API key. The management page accepts the church's public YouTube channel URL/handle or playlist URL and queues the source without making a provider call during save.

On a continuously running Railway production server, the existing Node scheduler now calls `/api/cron/sync-sermons` every five minutes when discovery is enabled. Other hosts must schedule that endpoint separately, supplying `Authorization: Bearer CRON_SECRET`. Source due times enforce hourly completed scans and five-minute continuation scans. Two-minute database leases prevent overlapping jobs from duplicating work; changing or pausing a source invalidates its in-flight lease.

Each run handles at most two due churches and two 50-item pages per source. The initial target is 100 distinct available source uploads; fewer are reported honestly. The cursor persists, so large archives and playlists continue over later runs. Playlist order is controlled by its publisher, so the first 100 playlist items are not necessarily the most recently published 100. A source-specific sermon playlist avoids classifying all channel uploads as sermons. Channel archive metadata is sorted by publication time for display. A failed check leaves the last good imported records available; stable church/video IDs prevent retry duplication.

This implementation automates discovery and recording availability. **It does not yet implement automatic transcription, sermon-segment identification, TDE analysis, or generated companion publication.** Those imported records remain explicitly pending. The member app can show the recording and original publisher description; it does not call that description a sermon summary or enable an ungrounded sermon companion. This is the remaining processor integration required for the full zero-weekly-work offering. Manual summaries remain an optional fallback, not the intended operating model. No provider quota was consumed during testing.

## Development activity schema and ontology

`lib/analytics/contract.ts` is the versioned, closed request schema. Unknown properties are rejected, so callers cannot attach arbitrary chat text or metadata. `lib/lifelines.ts` is the canonical registry of the existing 34 LifeLine IDs across seven categories. Routing retains both that ID and its display label. An explicit topic selection supplies context; the receiver does not classify raw chat messages.

Age bands start at 13: `13-17`, `18-24`, `25-34`, `35-44`, `45-54`, `55-64`, `65-74`, `75+`. Older answers are retained at their true resolution (`legacy-18-23`, `legacy-24-64`, `legacy-65+`) until the member chooses a finer band. Existing personalization still receives its compatible legacy keys. Missing answers remain missing.

An envelope identifies a church UUID, random installation ID, consent version/time, optional declared age band/situation, and 1–25 events. Events have immutable IDs, timestamps, session/view identifiers and allowed context: LifeLine ID, sermon UUID, content type, Scripture book number/chapter/verses/translation, chat channel, or bounded foreground milliseconds. The server validates sermon ownership before accepting attribution.

| Signal | What was observed | What it does not establish |
|---|---|---|
| `app_open` | Pilot installation initialized the app connection | Sunday attendance or a distinct person |
| `chapter_displayed` | Chapter text loaded and was visible | Reading completion or comprehension |
| `verse_selected` | Member selected verse text | Belief, agreement, or a personal need |
| `explanation_requested` / `explanation_displayed` | Explanation requested / returned content visible | Understanding or spiritual growth |
| `question_sent` | Successful typed interaction, optionally with selected topic context | Meaning of the actual question or voice activity |
| `content_displayed` | Content became available in a view, including a cached view | Completion or an outcome caused by a sermon |
| `foreground_interval` | Visible, focused, recently interacted-with view time | Continuous reading time |

Foreground intervals stop after 30 seconds without interaction. Event queues are bounded to 200 entries and 24 hours; requests retry with unchanged IDs, and database insertion deduplicates them. Server ingestion has byte/batch limits and persistent per-installation rate caps. Opt-out stops new activity and clears pending events. Erasure uses the installation capability, rejects delayed requests from the revoked consent period, and retains the local identifier if deletion fails so it can be retried.

The server stores church-specific HMAC identifiers, not the original installation UUID. These are pseudonymous longitudinal records, not anonymous people. Reinstalling or multiple devices changes counts; no verified account-to-person linkage is claimed. Leader pages are excluded from the new member telemetry and website traffic analytics. The raw event tables have no church-facing read endpoint.

## Aggregate reporting and Next Logical LifeLine

Observed events and calculated counts are distinct from inferred associations. Every eventual production metric must state its window, installation/event population, numerator, denominator, missingness, and suppression threshold. Small cohorts and complementary cells must be protected; this receiver alone is not an aggregate reporting implementation.

Next Logical LifeLine should use eligible anonymized aggregate patterns across the LifeStages ecosystem and then assess their relevance to local signals. The reference population may span churches and, when supported by an appropriate ingestion path, unaffiliated users. It must not pool raw records into a church-accessible interface or claim a cross-church device hash is a unique global person. The current receiver requires a church association. Production ecosystem aggregation and unaffiliated ingestion are not connected yet; the Church Intelligence prototype demonstrates the concept with separately labeled synthetic data.

The hypothesis is “among this eligible observed population, topic B appeared after topic A within a defined window.” It is not “A causes B,” a diagnosis, or a prediction for an individual. A pooled association and the selected church's own trajectory need separate denominators and suppression. Chat/voice semantic topic classification needs a minimized taxonomy adapter that emits categories without exposing conversation text to church leaders. The current ElevenLabs widget has no lifecycle/topic callback, so this implementation reports no voice observations.

## Local checks

Use Node 22.18+ or Node 24 for the test runner's TypeScript support. With the existing dependencies installed:

```powershell
npm test
npm run typecheck
```

Tests cover schema rejection, consent/default-off behavior, minimized payloads, old age bands, retries, church isolation, erasure, capped foreground time, authenticated leader operations, invitation validation, immutable sermon editions, safe branding links, and Scripture references. Storage and provider calls are mocked; these are not live database proofs.

For a local browser fixture, start `npm run test:fixture` in one terminal (port 4188). In a second terminal:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:4188'
$env:NEXT_PUBLIC_SUPABASE_URL='https://example.invalid'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only'
$env:SUPABASE_SERVICE_ROLE_KEY='test-only'
npm run dev -- --webpack --hostname 127.0.0.1 --port 4187
```

Use church code `demo`. The local leader login is `leader@example.invalid` / `fixture-password-only`. These credentials exist only in the in-memory fixture; they grant no production access. All content is fictional, all changes vanish when the fixture stops, and no AI, email, payment, YouTube, or database service is called. The fixture runs the actual management/analytics validators and handlers with in-memory storage. It is not intended for public hosting.
