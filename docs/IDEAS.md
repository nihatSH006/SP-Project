# SASIS — Product Ideas & Market Scan

> **📌 This is the full research archive — not the plan.**
> The agreed shortlist of 17 ideas is in [IDEAS-SIMPLE.md](IDEAS-SIMPLE.md).
> Ideas below that are not on that shortlist were reviewed and set aside; they
> are kept here so the reasoning and sources are not lost if priorities change.

> **Purpose:** what to build next in SASIS, grounded in how other petroleum
> retailers — Azerbaijani, regional, and global — actually run their station
> networks. Compiled July 2026 from a structured scan of ~85 named practices
> across operators (SOCAR affiliates, Azpetrol, Opet, Petrol Ofisi, Shell, BP,
> ADNOC, MOL, Rompetrol, KazMunayGas, Circle K, QuikTrip, 7-Eleven…), fuel-retail
> software (Gilbarco Insite360, Orpak, Petrosoft, Titan Cloud, Kalibrate,
> Legion…), and loss-prevention / workforce research (NACS, ACFE, UKG).
> Sources are listed at the end.

---

## The strategic frame (read this first)

**Fuel prices in Azerbaijan are fixed by the Tariff Council** (AI-92 at
1.10 AZN/l since mid-2024). SOCAR stations cannot compete on price — which
means the entire game is played on the four levers SASIS can measure:

| Lever | What moves it | SASIS today |
|---|---|---|
| **Loss prevention** | Fraud, cash shrinkage, wetstock variance | ⚠️ one rule (after-hours sales) |
| **Labor cost & coverage** | Matching staff hours to the demand curve | ⚠️ attendance only, no demand match |
| **Service quality & mix** | Clean stations, fast service, non-fuel attach | ❌ not measured |
| **Volume & throughput** | Uptime, queue speed, customer retention | ⚠️ revenue only, no litres |

This is exactly the position ADNOC Distribution (the closest structural peer —
a state oil company running its own network under administered fuel margins) is
in: their headline KPIs are **non-fuel profit growth and fuel-to-store
conversion**, not fuel margin. That's the direction of travel for SASIS.

One more Azerbaijani specific worth exploiting: because pump prices are fixed,
`amount ÷ litres` must equal an official tariff **exactly**. One new CSV column
turns regulated pricing from a limitation into a zero-false-positive fraud
check that operators in free-price markets literally cannot build.

---

## Prerequisite 0 — keep every day

Almost everything below (trends, baselines, fair targets, statistical fraud
detection, most-improved awards) needs **multi-day history**. Today SASIS holds
one operational day. Firestore already stores full timestamps — stop
overwriting on re-import, key documents by date, and add a date-range filter.
Cheap, and it unlocks the whole roadmap. *(Carried over from the original
ROADMAP; login/roles from that roadmap are already delivered.)*

---

## TL;DR — top 10 for the boss

| # | Idea | Borrowed from | Impact | Effort | Needs |
|---|---|---|---|---|---|
| 1 | **Telegram morning brief** (Səhər brifi) | Shell dealer report packs + US huddle-card discipline | High | Low | current data |
| 2 | **Smart targets with a holiday brain** (Novruz-aware baselines) | Legion/Quinyx demand baselining | High | Med | history |
| 3 | **Fair Leaderboard 2.0** (% of own target, tiers, most-improved) | Shell PMTDR tiers, Spinify, leaderboard research | High | Low | history |
| 4 | **Named fraud-rule engine** (6+ detections on today's data) | Agilence/ACFE exception reporting | High | Med | current data |
| 5 | **Alert lifecycle + CCTV evidence packs** | Titan Cloud task workflow, March Networks | High | Med | current data |
| 6 | **Coverage-vs-demand staffing heatmap** | Legion WFM, NACS sales-per-labor-hour | High | Med | current data |
| 7 | **Cash over/short per shift** | Petrosoft, ±3 AZN industry discipline | High | Low | 1 new field |
| 8 | **Tariff integrity check** (litres column) | Own analysis of the regulated-price regime | High | Low | 1 new field |
| 9 | **Site Excellence audit** (Təmiz Stansiya score) | Opet Temiz Tuvalet, ExxonMobil mystery shop | High | Med | in-app form |
| 10 | **One-click monthly board pack** (bilingual PDF) | ADNOC KPI-led reporting style | Med | Low | current data |

---

## A. Executive command

**A1. Telegram morning brief — "Səhər brifi"** ✅ high/low
The executive brief SASIS already writes, pushed at 08:00 via a Telegram bot in
Azerbaijani (English toggle). Three variants: director gets the fleet brief,
each supervisor a per-station pack, station staff a one-page huddle card
(yesterday's numbers + today's single focus item). Telegram is where Azerbaijani
business actually reads; the work is a formatter + Bot API + a chat-ID per user.
*Seen at: Shell MarketHub/DealerCenter automated dealer reporting; the pre-shift
huddle card is standard discipline at top US chains.*

**A2. Smart targets with an Azerbaijani holiday brain** ✅ high/med *(needs history)*
Replace the static daily target with per-station targets from a trailing 4-week
same-weekday baseline, adjusted by a built-in holiday calendar (Novruz's ~5-day
inversion, Ramazan/Gurban bayrams). During Novruz, highway stations spike and
office-district stations drop — a static target mis-grades everyone and floods
the alert center for a week. One static calendar table fixes it.

**A3. One-click monthly board pack** ✅ med/low
A bilingual PDF the system assembles itself: fleet KPIs vs baseline-adjusted
targets, station league table on normalized attainment, risk summary with an
ROI line (industry benchmark: one confirmed internal-theft case ≈ 2,600 AZN),
and in-family precedents to argue the data roadmap (SOCAR Ukraine's QR app:
+20% non-fuel sales; MOL Fresh Corner: non-fuel = ⅓ of retail margin).

**A4. Live fleet wall** 📥 med/high *(needs intraday data)*
Full-screen director's-office view: today-vs-target pace per station, live
alert ticker. Ships after the CSV moves to intraday drops or POS polling — the
Rompetrol single-platform rollout (~500 stations, real-time POS/pump feeds) is
the regional maturity target. The retrospective version (A2 + D4) ships now.

**A5. Benchmark card in the executive brief** ✅ low/low
Cite fixed reference points next to our numbers: NACS labor productivity
(~$95/labor-hour US average), MOL non-fuel share, SOCAR Ukraine digital-payment
outcomes. Grounds internal targets in industry reality — boards love it.

---

## B. Fraud & loss prevention

> SASIS's after-hours flag is a real, industry-named detection ("after-hours
> skimming"). The plan: grow it into the standard **exception-based reporting**
> stack every serious fuel retailer runs — starting with six rules that need
> **no new data at all**.

**B1. Named fraud-rule engine** ✅ high/med
Replace the single heuristic with an auditable library of named rules over
timestamp + amount + operator + shift window:
- *After-hours sales* (existing — keep, now as one rule of many)
- *Late-close recidivism* — repeatedly transacting >X min after clock-out (a behavior score, not one-off alerts)
- *Shift-end bursts/gaps* — anomalies in the final 15–30 min before clock-out (the classic low-oversight window)
- *Duplicate-amount bursts* — N+ identical amounts from one operator within an hour (replayed/fabricated sales)
- *Velocity outliers* — transactions-per-hour vs the operator's own norm and station median (dead register or burst)
- *Peer z-scores* — avg ticket / revenue-per-hour vs same-station, same-daypart peers, using **median/MAD** (only 20 operators — robust stats or the pilot drowns in false positives), with multi-day persistence required before escalation
- *Round-amount fingerprint* — each operator's round-amount ratio vs the **station's own baseline** (not textbook Benford — fixed tariffs + "fill for 20 manat" cash culture make round amounts legitimately dominant here)

Risk level becomes a sum of named rule hits — "tripped 4 named rules on 3
nights" instead of "looks suspicious."
*Seen at: Agilence/Envysion EBR canon, ACFE anti-fraud analytics tests, Solink.*

**B2. Night & cash risk weighting** ✅ med/low
Multiply anomaly scores for 22:00–06:00 (≈80% of station crime) and for
single-operator night shifts. Add a cash-exposure multiplier per
station/daypart — anomalies where cash dominates carry more shrinkage risk.

**B3. Alert lifecycle + case management** ✅ high/med
Every alert becomes an owned case: auto-routed to the station's supervisor,
states (open → investigating → confirmed / explained / dismissed), deadline,
resolution note; unresolved HIGH escalates to admin after 24h. Crucially,
suspicious-sale flags pass through **supervisor review before denting an
operator's risk level** — a forgotten clock-in shouldn't brand anyone
high-risk. Dismissal reasons feed back into rule thresholds.
*Seen at: Titan Cloud (variance auto-opens a task), Deputy attestation flow.*

**B4. CCTV evidence pack generator** ✅ high/low
Each case auto-assembles: station, operator, exact timestamp window (+buffer),
flagged transactions, peer context, and a checklist to pull matching DVR
footage. Video-verified exceptions cut investigation time up to 90% in
industry deployments — and this works **today** with manual DVR pulls, no
camera integration.

**B5. Cash over/short per operator-shift** 📥 high/low — *1 new field*
One number per shift (blind-declared closeout cash) unlocks the strongest
theft signal in a cash-heavy market: over/short vs recorded sales with a
±3 AZN band, a *consistent-small-shortage* detector (the classic skim
signature), and a *consistent-overage* flag (under-ringing). Pair with the
zero-tech process rule: **blind closeout** — cashiers count without seeing the
expected total.

**B6. Tariff integrity check** 📥 high/low — *1 new field (litres)*
`amount ÷ litres` must exactly equal an official tariff price. Any deviation =
mis-keying, grade substitution, or manipulation, with essentially zero false
positives — and fuel grade is inferred for free. Also makes station
comparisons exact (pure volume, no mix noise). **The single best
argument-per-column in the whole roadmap.**

**B7. Void/refund/no-sale exception reporting** 📥 high/med — *needs POS event codes*
The canonical LP ratio set per operator (void rate, refund rate, no-sale
drawer-opens, discount rate) with cluster and timing analysis. This is where
retail money actually leaks. Governance prerequisite worth enforcing now: **no
shared operator logins**, or per-operator analytics are meaningless.

**B8. Wetstock reconciliation** 📥 high/high — *needs tank data*
Litres delivered vs stored vs sold, per station per day — the only detector
that catches theft bypassing the POS entirely (incl. delivery short-drops).
Shell runs this centrally across 3,000+ stations via Fairbanks; Circle K across
8,000+ via Leighton O'Brien. At 5-station scale, Canary-style cellular ATG
bridges retrofit cheaply without touching the POS.

---

## C. Workforce: fairness, motivation, retention

**C1. Fair Leaderboard 2.0** ✅ high/low *(needs history)*
Research is blunt: absolute full-ranking boards demotivate the bottom half —
with 20 operators, ranks 15–20 are publicly branded losers daily. Fix:
- Rank on **% of own target attainment** (small station at 105% beats the flagship at 92%)
- Normalize within department (forecourt staff vs forecourt staff)
- Show top-5 + each viewer's local neighborhood; band the rest into Gold/Silver/Bronze tiers
- **Weekly reset** so a bad Monday is recoverable
- Parallel podiums: *Most Improved* (vs own 4-week average) and *Attendance Streak*
*Seen at: Shell PMTDR tiered recognition, Spinify parallel tracks, Emerald leaderboard-motivation research.*

**C2. Supervisor coaching queue** ✅ high/med
Auto-convert each operator's weakest KPI into 1–2 named focus areas ("Əli —
punctuality; Leyla — off-peak pace") in a prioritized weekly queue per
supervisor, with logged outcomes and a next-week delta. D grades can't leave
the queue without a logged conversation. Turns the auto-assessment from a
report card into a management routine.

**C3. Attendance flight-risk early warning** ✅ med/low *(needs history)*
UKG: unplanned absences rise **37% in the 60 days before a resignation**. A
rolling lateness/absence trend per operator is a nearly-free early warning —
routed to the coaching queue, not the fraud queue. At 4 operators per station,
one saved resignation pays for the feature many times over.

**C4. Grace periods & review states** ✅ med/low
A configurable clock-in grace period (e.g. 10 min) before lateness dents the
attendance score, and an explain-and-review state for anomalies (Deputy's
attestation pattern). Fewer false accusations, cleaner risk data, defensible
in front of HR.

**C5. Contest engine** ✅ med/low *(needs history)*
3–4 templated, time-boxed contests rotated weekly (revenue sprint vs own
target, attendance streak, most-improved, station-vs-station challenge bar on
the stations page). Goal-based formats let everyone win by hitting their own
number. Circle K's "Beat Your Boss" mechanic — outperform your supervisor's
score — keeps it fun without shaming.

**C6. Role-appropriate scoring** ✅ med/med
The blended 0–100 currently rates every department on revenue — cleaning and
forecourt staff will grade D forever on a formula they can't influence
(7-Eleven Japan and Buc-ee's research both warn against exactly this). Rank
within department, and let the audit score (D2) carry more weight for
non-sales roles.

**C7. "My performance" operator view** ✅ med/med
Each operator sees their own numbers, trend, grade explanation, and current
focus area — the 7-Eleven *Tanpin Kanri* lesson: frontline staff who see their
own data and test hypotheses daily outperform HQ-dictated ones.

---

## D. Station operations

**D1. Coverage-vs-demand heatmap + station SPLH** ✅ high/med
Overlay each station's hourly transaction curve with concurrently clocked-in
operators. Flag hours where revenue is top-quartile but one operator was on
(understaffed = lost sales) and staffed near-zero hours (overstaffed = wasted
payroll). Add station-level **sales-per-labor-hour** — the NACS-canonical
staffing KPI — next to the shift-coverage donut. Schedule on **transaction
count, not AZN** (Quinyx's rule: revenue reflects mix; count reflects
workload). Labor is one of the few cost levers SOCAR owns.

**D2. Site Excellence audit — "Təmiz Stansiya" score** ✅ high/med *(in-app form)*
A mobile checklist supervisors complete on visits: forecourt, toilets,
uniforms/name tags, c-store presentation, safety basics — pass/fail + photo,
auto-scored 0–100 per station per visit. Feeds the station health meter and,
later, the operator grade. Opet built Turkey's customer-satisfaction
leadership on audited clean toilets (their program became a national TSE
standard); ExxonMobil makes mystery-shop participation contractual; QuikTrip
pays bonuses on audit scores, not raw sales.

**D3. Station health, decomposed** ✅ med/med
Split the single health % into named, clickable dimensions — Revenue (vs own
baseline), Coverage, Discipline, Integrity, Standards — TotalEnergies-style
published promises instead of an opaque number. Benchmark like-for-like so the
smallest station can win.

**D4. Dormant-hours detector** ✅ high/low
Flag zero-sales windows during staffed open hours vs the station's own
baseline — the same transaction-gap signal Circle K uses to catch dead
dispensers, and in a cash market it catches silent registers too. One rule,
three catches: broken pump / unmanned pump / unrung sales. Cause-triage prompt
so honest operators aren't penalized (see also F4).

**D5. Digital shift handover** ✅ high/med *(in-app form)*
Structured handover at shift change: declared cash (blind), pending issues,
equipment faults, incidents — outgoing signs, incoming acknowledges. Creates
the cash field B5 needs without touching the CSV, and formalizes handover
discipline.

**D6. Morning huddle card** ✅ high/low
The per-station one-pager (yesterday's KPIs, today's one focus, staffing gaps)
as a print/phone format — the bridge from dashboard to floor behavior at every
top US chain. Delivered via A1.

**D7. HSE observation module** ✅ med/low *(gap the critic caught)*
A minimal safety-observation form (near-miss, unsafe act, hazard) per station,
counted as a **positive** KPI — reporting volume up = good, the
Shell Goal Zero / Chevron LPS pattern. Petrol stations are hazardous sites;
a SOCAR ops dashboard with zero HSE presence will look wrong to any board.

**D8. Maintenance & uptime fairness** 📥 med/med
A "pump out of service" event log (manual at first) so equipment downtime
adjusts operator productivity scores — a slow dispenser silently depresses
AZN/h through no fault of the operator (Insite360's uptime KPI pattern), and
unfair grades corrode trust in the whole system.

---

## E. Growth & customer (the ADNOC direction)

**E1. Fuel vs non-fuel split** 📥 high/low — *1 new field*
One transaction flag unlocks the growth KPI set: non-fuel share per station,
attach proxy per operator, category growth over time. ADNOC headlines non-fuel
gross profit (+14%) as a state-oil retailer; MOL's Fresh Corner makes non-fuel
⅓ of retail margin. This is the boss's growth story in a fixed-price market.

**E2. Payment-mix analytics** 📥 med/low — *1 new field*
Cash vs card vs fleet-card share per operator/station/daypart. Azerbaijan is
~70% cashless by card volume but cash still dominates in places — cash-ratio
drift per operator is simultaneously a shrinkage signal, a margin metric
(0.75% petrol interchange cap), and it sharpens B2's cash weighting.

**E3. Customer-voice ingestion** 📥 med/med
A field for external quality scores — mystery-shop visits, complaint counts,
or app ratings. SOCAR Georgia's app already pays customers points to rate each
station visit (a free per-station NPS stream); SOCAR Petroleum's loyalty
program in Azerbaijan (Neftchi/ANT bonus cards) is the natural source here.
Blend into station health and operator grades so quality counts, not just AZN.

**E4. Loyalty & fleet identifiers** 📥 med/— *(schema readiness)*
Reserve customer-ID / fleet-card fields in the transaction model now.
Azpetrol has run smart cards since 2002 with corporate expense reporting;
Petrol Ofisi enrolls by license plate; Shell Türkiye's SmartPay makes fleets
app-identified. Identified transactions turn anonymous AZN into repeat-visit
and basket analytics — and fleet sales have a different fraud baseline.

**E5. EV-ready data model** 📥 low/low
SOCAR opened the South Caucasus's first all-electric station (Tbilisi,
Feb 2026); Azerishig is building out Baku chargers. Don't hard-code "fuel
sale" as the only transaction type — kWh sessions with long dwell times will
eventually flow through the same station P&L.

---

## F. Platform & data foundations

**F1. Import QA & audit trail** ✅ high/low
Schema validation, dedupe, timezone checks, late/missing-file alerts on the
daily CSV, plus an import log (who, when, what counts). Every idea above rides
on this file — a silent bad import poisons a whole day of grades and alerts.

**F2. Forecourt PWA** ✅ high/high
Phone-installable station view for staff: today's numbers, my grade and
neighborhood rank, handover items, checklist tasks. Desktop dashboards don't
reach the forecourt — Circle K (RELEX app) and Petrol Ofisi (Ofis Portal)
both deliver KPIs phone-first. This is the carrier for C7, D5, D2.

**F3. Azerbaijani UI (az/en toggle)** ✅ med/low
The audience works in Azerbaijani; next-intl or similar makes SASIS bilingual.
Pairs with A1's Azerbaijani-first briefing.

**F4. Configurable rules console** ✅ med/med
Thresholds, grace periods, rule weights, targets, holiday calendar — editable
by admin instead of constants in code. (Carried from the original roadmap;
becomes urgent once B1's rule library exists.)

**F5. Staged path off the CSV** 📥 high/high
The Rompetrol target-state: real-time POS/pump feeds into one platform.
Staged: intraday CSV drops → POS journal export (unlocks B7) → ATG bridge
(unlocks B8) → streaming. Each stage has its own unlocks; none blocks Phase 1.

---

## Suggested phasing

**Phase 1 — now, current data (2–4 weeks of work)**
Prerequisite 0 (history) → A1 Telegram brief → C1 fair leaderboard →
B1 rule engine + B2 weighting → B3/B4 case management + evidence packs →
D4 dormant hours → D6 huddle card → C4 grace periods → F1 import QA →
A2 smart targets → C3 flight risk → A3 board pack.
*Everything here is software on data we already import.*

**Phase 2 — one richer CSV + in-app forms**
B5 cash over/short (via D5 handover form) → B6 tariff/litres check →
E1 fuel/non-fuel split → E2 payment mix → D2 site audits → C2 coaching queue →
D7 HSE → C6/C7 role scoring + my-performance → F3 Azerbaijani UI.
*The ask to POS/IT is five CSV columns; the rest is built in-app.*

**Phase 3 — integrations**
B7 POS event codes → B8 wetstock/ATG → D8 maintenance feed →
E3/E4 customer & loyalty → A4 live fleet wall → F2 PWA at scale → F5 streaming.

---

## The data shopping list (what to request, in order)

| Priority | New field | Unlocks | Idea |
|---|---|---|---|
| 1 | *(none — retain history)* | trends, baselines, fair targets, statistics | P0 |
| 2 | Declared cash per operator-shift | strongest theft signal in a cash market | B5 |
| 3 | Litres per transaction | zero-false-positive tariff check, true volume | B6 |
| 4 | Fuel / non-fuel flag | the growth KPI set | E1 |
| 5 | Payment method (cash/card/fleet) | shrinkage + margin + risk weighting | E2, B2 |
| 6 | POS event codes (void/refund/no-sale) | canonical LP ratios | B7 |
| 7 | Tank dips + delivery BOL litres | wetstock reconciliation | B8 |
| 8 | Loyalty / fleet customer ID | customer analytics | E4 |

---

## Sources (selection)

- **Regional:** Fuelsis/Turpak attendant-tracking (pompacı takip) · Opet Temiz Tuvalet · Petrol Ofisi Positive Card & Ofis Portal · Azpetrol Smart Card/talon · SOCAR Ukraine QR app case (Soloway) · SOCAR Geo Energy Card · Rompetrol/KMG single retail platform · KazMunayGas Digital AZS · MOL Fresh Corner economics · Tariff Council pricing, CBAR cashless stats, Novruz calendar
- **Majors & peers:** Shell PMTDR / Mystery Motorist / Goal Zero / MarketHub / Fairbanks wetstock contract · ExxonMobil mystery-shop mandate (SEC filing) · ADNOC Distribution non-fuel KPIs & Engage retail media · TotalEnergies customer promises · Petronas Mesra/Setel · BPme
- **Convenience execution:** NACS sales-per-labor-hour · QuikTrip audit-tied bonuses · Circle K Customer Star & RELEX app & Guardian Connect · Sheetz speed-of-service · 7-Eleven Japan Tanpin Kanri · Buc-ee's role design · Wawa AI waste reduction
- **Software:** Gilbarco Insite360 (wetstock, delivery reconciliation, uptime) · Leighton O'Brien HD SIRA · Titan Cloud & Canary · Petrosoft CStoreOffice · Orpak ForeSite · PDI CStore Essentials & loyalty analytics · EdgePetrol blended margin · Kalibrate benchmarking · PriceAdvantage closed-loop pricing
- **LP & workforce research:** Agilence/Envysion EBR canon · ACFE analytics tests · Solink/March Networks video-verified exceptions · NACS/NRF shrink data (~$1,550/case; ~30% of shrink internal) · ASU night-crime statistics · Legion/Quinyx demand forecasting · UChicago/Gap stable-scheduling study (+7% sales) · UKG absence-before-resignation (+37%) · Emerald/Spinify leaderboard-motivation research
