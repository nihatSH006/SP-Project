# Alert Criteria v2 — designed for the real fob-based POS

> **Status: SUPERSEDED by the core pivot (Aug 2026).** The app now ships
> only database-provable alerts on the real db3_loglar/db3_satislar shape
> (see `lib/pos.ts`); the statistical catalog below is kept as the roadmap
> for after the core is shown to SOCAR.
>
> Previous status: IMPLEMENTED (v1 scope) against the synthetic fob-model dataset.
> Shipped: catalog A (A1 as a window pattern, A2, A4, A5), B1, B3, C2 (with
> the approving manager named in the evidence), D1 as the dormant price-table
> alarm, plus the window-pattern card (cash-skew, never-edits, voids).
> Deferred until real feeds exist: B2/B4 (needs till/pump ids), C3/C4 (needs
> manager attendance in the feed), D2/D3 (needs the live stream), wetstock.
> The open questions in §6 still need answers before the real integration.

---

## 1. The operating model (as confirmed)

1. **One fob scan per sale.** Every sale row carries the identity of the
   worker who rang it. Attribution is per transaction, not per shift.
2. **Prepay flow.** The operator enters the amount in manats + fuel type,
   takes payment (cash or card), and the pump automatically dispenses up to
   that amount at the current state price. Litres are therefore *derived*
   from `amount ÷ price` — the worker never types litres.
3. **Early tank-full stop → the sale is edited.** If the tank fills before
   the prepaid amount is reached, the transaction is edited down to the
   actual dispensed value. (Assumed: a full audit trail — original amount,
   final amount, editor, timestamp. **Must be confirmed**; see §6.)
4. **Voids are manager-only.** A cancellation carries a second identity —
   the approving manager's fob.
5. **Own cash drawer per worker.** Each worker's cash is counted against
   their own fob's sales.
6. **Fob alone authenticates a sale — lending is physically possible.**
   Clock-in/out exists separately but uses the same identity system
   (fob / fingerprint / face), so presence and selling identity can be
   cross-checked.
7. **Data will arrive live / near-real-time.**
8. **Management's stated priorities:** cash pocketed via edits · fob lending
   and false attribution · manager–worker collusion.
9. **No pump-side measurement** (controller litres, totalizers, ATG) is
   known to exist yet.
10. **Exact sale-row fields are not yet known** — so §5 is a data contract
    to request from the POS/IT side, ordered by what each field unlocks.

## 2. What this does to the current rules

| Current rule | Verdict | Why |
|---|---|---|
| Sales outside the shift (`after-hours`) | **Replaced** | With per-sale fob attribution, "outside the shift window" becomes **"fob selling while its owner is not clocked in"** — a stronger, cleaner rule (§3-B1). |
| Sales after clock-out (`late-close`) | **Dies** | Folded into the same off-clock rule; the 15-minute grace distinction was an artifact of inferred shifts. |
| Burst at shift end (`shift-end-burst`) | **Reframed** | Raw sales bursts before handover are normal in prepay. What matters at shift end now is a cluster of **edits and voids** just before the drawer is counted (§3-A4). |
| Repeated identical amounts (`duplicate-amounts`) | **Keeps, recalibrated** | Entered prepay amounts are naturally repetitive ("20 manat"), so the thresholds must tighten: same *final* amount, same fob, implausibly regular spacing. |
| Pace far from peers (`velocity-outlier`) | **Keeps** | Still a useful corroborating signal, never accusatory alone. |
| Too many round amounts (`round-amount`) | **Dies — inverted** | In prepay, *everything* is entered round; roundness is the system, not a fingerprint. The signal flips: a worker whose **cash sales are never edited down** (no early stops, all-round finals) while peers show a natural early-stop rate is the anomaly (§3-A3). |
| Dead hours (`dead-hours`) | **Keeps** | Staffed-but-silent hours still mean a broken pump, an unmanned forecourt, or unrung sales. |
| Tariff mismatch (`tariff-mismatch`) | **Reframed** | `amount ÷ litres = state price` now holds *by construction*, so this stops being a person-level rule and becomes a **system-integrity alarm**: it fires only if the POS price table is tampered with or misconfigured — the alarm that should never ring, and is HIGH when it does (§3-D1). |

Everything structural survives unchanged: named rules with evidence windows,
median/MAD statistics, night ×2 weighting, the integrity / operational /
corroborating split, multi-day persistence before a case opens, supervisor
review before any risk verdict, append-only case timelines, CCTV pointers.

## 3. The new alert catalog

### A. Edit & refund abuse — "cash pocketed" (top priority)

The mechanics of the fraud: customer pays 50 ₼ cash, the pump dispenses the
full 50 ₼ of fuel, and the sale is later edited down to 42 ₼. The drawer
balances perfectly against the system — the company has silently lost 8 ₼ of
fuel. The *legitimate* edit (tank genuinely full at 42 ₼) looks identical in
a single row. The difference lives in **shape**: payment method, timing,
magnitude, and rate.

| # | Rule | Fires when | Why it works |
|---|---|---|---|
| A1 | **Cash-skewed edits** | A fob's edit rate on **cash** sales is far above its edit rate on **card** sales (robust z vs station peers) | Tanks fill early regardless of how the customer paid. Honest early stops are payment-blind; manufactured ones are cash-only, because a card sale can't be pocketed. Low false positives, and it's the single best rule in this catalog. |
| A2 | **Late / deep edits** | The edit happens more than *N* minutes after fueling ended, or cuts more than *X*% off the entered amount | A genuine tank-full correction happens at the nozzle, immediately, and is usually a small fraction. An edit twenty minutes later, after the customer left, is a different act. |
| A3 | **The never-edits anomaly** | A fob's early-stop edit rate is near zero while station peers show the natural rate | The inverse tell: if this worker's customers' tanks never fill early, either they pocket differences without editing (drawer runs over → see A5) or someone else's edits are being suppressed. |
| A4 | **Pre-handover cluster** | Edits + voids concentrate in the last 30 minutes before the fob's clock-out / drawer count | Corrections queued up until just before reconciliation is the classic drawer-balancing move. |
| A5 | **Drawer over/short per fob** *(needs the count recorded — §5.5)* | Per-shift declared cash vs the fob's system total: consistent small shortage (skim signature) or consistent overage (under-ringing / unedited early stops) | Own-drawer-per-worker makes this per-person accountable — the strongest cash signal in the industry, and the station already counts; it only needs the number captured, ideally as a **blind count**. |

### B. Fob & attribution integrity — "who really sold this"

| # | Rule | Fires when | Why it works |
|---|---|---|---|
| B1 | **Selling while off-clock** | A fob rings sales while its owner's attendance (same identity system) shows not clocked in — or on a day with no clock-in at all | The clean successor to `after-hours`. A fob active with no matching presence is either lending or a ghost seller; a biometric clock-in plus fob-only sales makes the cross-check trustworthy. |
| B2 | **Impossible concurrency** *(needs till/pump id — §5.1)* | The same fob rings at two tills/pumps within seconds, or from locations it cannot move between in the interval | Physical impossibility — near-zero false positives. Two people are using one identity. |
| B3 | **Coverage share** | One fob carries an abnormal share of a shift's sales while multiple workers are clocked in (e.g. >70% with 3 on-clock), repeatedly | The break-cover pattern: A lends B their fob or B rings everything while A idles. Also catches "one fob for the whole shift" habits that destroy per-person accountability. |
| B4 | **Identity habit break** *(corroborating only)* | A fob's working fingerprint (hours, pace, edit style) shifts abruptly from its own history | A different person behind the same fob changes the rhythm. Statistical, so it can only corroborate, never accuse. |

### C. Manager–worker collusion — the second fob on every correction

Voids (and possibly edits) carry **two identities**. That turns approval
patterns into data.

| # | Rule | Fires when | Why it works |
|---|---|---|---|
| C1 | **Approval concentration** | One (manager, worker) pair accounts for a far-above-norm share of voids/approved edits — robust z across all pairs at the station | Rubber-stamping shows up as a pair, not as either person alone. Direct successor to the joint-patterns card, now with the approval edge built in. |
| C2 | **Void after dispensing** | A sale is voided *after* fuel already left the nozzle | Fuel gone, sale gone. There is almost no honest version — every instance deserves review. |
| C3 | **Manager self-approval** | A manager approves voids/edits on their own sales | The two-identity control exists precisely to prevent this; a self-approval is a control bypass by definition. |
| C4 | **Off-hours approvals** | Void/edit approvals recorded while the approving manager is not clocked in / not on site | Either the manager's fob is lent (B-class problem at manager level) or approvals are being batch-faked. |

Night weighting (×2 for 22:00–06:00) applies across A, B and C as today.

### D. System & compliance integrity

| # | Rule | Fires when | Why it works |
|---|---|---|---|
| D1 | **Price-table drift** | Any sale's derived unit price differs from the Tariff Council price for its grade | Should be impossible by construction — so a single hit means POS misconfiguration or tampering. HIGH, station-level, not personal. |
| D2 | **Audit-trail gaps** | Edit/void event volume is inconsistent with sale-row changes, or the edit log goes silent while edits keep landing | If the fraud detection depends on the edit log, the edit log itself must be watched. Feeds the data-health surface, not a person's score. |
| D3 | **Feed heartbeat** *(live data)* | No transactions from an open, staffed station for *N* minutes | POS down, network down, or sales happening off the books — all three are worth a phone call within the hour, not a report tomorrow. |

### E. Operations (carried over)

- **Dead hours** — unchanged: staffed and open but selling almost nothing
  vs the station's own hourly norm. Never scores against a person.

## 4. What live data unlocks (features, not rules)

- **Same-shift intervention** — alerts fire while the person is still on
  shift; a HIGH hit pings the supervisor's Telegram that night, not in
  tomorrow's report.
- **The wall becomes genuinely live** — the "not a live feed" honesty banner
  is retired the day the stream is real, and the heartbeat (D3) drives a
  station going grey on screen when its feed stops.
- **SLA anchored to the event** — the case clock starts at detection time,
  measured in hours that matter.
- **Per-worker integrity profile** — edit rate, cash-vs-card edit skew,
  off-clock incidents, approval partners, all against station peers: the
  case file's first page, and the fairness guarantee (a worker sees the same
  numbers about themselves that any accusation would rest on).

## 5. The data contract — what to request from the POS vendor, in order

| Priority | Field / feed | Unlocks |
|---|---|---|
| 1 | Per sale: **fob id, timestamp, entered amount, final amount, fuel grade, payment method, station id, receipt/fiscal id** | The entire A and B catalogs minus A5/B2 |
| 2 | **Edit events**: original → new amount, editor identity, timestamp | A1–A4 with certainty instead of inference (confirm it truly exists — assumed in §1.3) |
| 3 | **Void events**: initiating fob, approving manager fob, timestamp, whether dispensing had started | All of C |
| 4 | **Attendance events**: identity, in/out, method (fob/fingerprint/face) | B1, B3, C4 |
| 5 | **Till / pump id per sale** | B2 (impossible concurrency), better dead-hours |
| 6 | **Per-drawer cash count per shift** (blind-declared) | A5 — the strongest cash signal |
| 7 | *(later)* Pump controller litres per fueling, totalizers, ATG tank levels | Wetstock reconciliation — the only detector for fuel leaving without any POS record at all; also doubles as regulatory leak detection |

## 6. Open questions (unanswered or assumed — confirm before build)

1. Does the edit log really keep original amount + editor + time, or only
   the final value? (Assumed full trail; the A-catalog degrades badly
   without it.)
2. Do edits require manager approval like voids, or can the seller edit
   alone? (Changes whether edits belong in catalog A or C.)
3. Is the cash drawer counted **blind** (worker declares before seeing the
   expected total)? If not, A5 loses most of its power and the process
   change is worth recommending alongside the software.
4. Exact early-stop mechanics: does the pump report the dispensed value to
   the POS automatically (edit is system-generated), or does the worker
   re-type it (edit is human-entered)? System-generated legit edits would
   make human-entered ones *automatically* suspect — a huge simplification.
5. Can a card sale be edited down after the card was charged, and how is
   the refund to the card recorded?
6. Fleet cards / talons / loyalty — do they exist in this network's flow,
   and do they appear as payment methods? (Each carries its own abuse
   patterns; parked until confirmed.)
7. How many stations and workers should the pilot design for?

## 7. Suggested build order (after sign-off)

1. **Schema + simulator** — extend the synthetic generator to the new shape
   (fob-per-sale, entered/final amounts, edit events, void events with two
   identities, attendance events), with planted patterns for A1, A2, B1,
   B3, C1, C2 as the answer key.
2. **Catalog A + B1** — the two priority domains that need only feed #1–#2.
3. **Catalog C** — void/approval analytics (feed #3).
4. **Live plumbing** — heartbeat, same-shift SLA, Telegram push.
5. **A5 drawer reconciliation** — once the count lands in the feed.
6. **D + profile pages** — system integrity and the per-worker profile.

Each stage keeps the existing case lifecycle, evidence packs and
translations — the rules change; the fairness machinery does not.
