# SASIS — Ideas in Plain Words

The shortlist: **17 ideas**, numbered 1–17.

The full market scan — including the ideas we did not pick — is kept in
[IDEAS.md](IDEAS.md) for reference.

**Legend:** ✅ = we can build it now · 📥 = needs new data first

**Decisions made:**

- This is a **real system for SOCAR**, not a demo — so it must be reliable,
  and careful with real staff data once that arrives.
- The current CSVs are **test data**, not real employees. Real data comes later.
- The interface will be **Azerbaijani, Russian and English**, switchable (**15**).
- **Nothing important should be hardcoded.** Targets, rules, thresholds, shift
  length and holidays all get set by an admin in the app (**16**).

---

## Why these ideas

The government sets fuel prices in Azerbaijan. We cannot compete on price.
So we win in two ways — and both are things SASIS can measure:

- **Stop losses** — catch theft and cash going missing
- **Control staff costs** — the right number of people at the right hours

---

## First, one thing to fix

- **1. Keep every day's data** ✅ **DONE**
  Delivered: the database now stores every operational day (28 days of test
  data), and every page has a day picker with prev/next arrows. Trends, fair
  targets and the statistical fraud rules are now possible.

---

## A. For the boss

- **2. Morning brief on Telegram** ✅
  Every day at 8am, the report SASIS already writes gets sent to Telegram in
  Azerbaijani. Boss gets the whole network, each supervisor gets their station.

- **3. Real targets, set by the admin** ✅
  **Today's target is broken.** It is calculated as "15% more than whatever was
  actually earned", so the dashboard always shows exactly 87% no matter how good
  or bad the day was. It means nothing.
  Replace it with: the admin types in the real target (per station, per month),
  and/or the system works one out from that station's own normal days. Plus a
  holiday calendar so it does not panic during Novruz, when highway stations get
  busy and city stations go quiet. Configured in **16**.

- **4. Monthly report with one click** ✅
  A ready-made PDF for management meetings: the month's numbers, station
  ranking, fraud summary, and money saved.

- **5. Big screen for the office** 📥
  A live wall showing all 5 stations right now vs target. Needs data more often
  than once a day.

---

## B. Catching theft and losses

- **6. More fraud rules, each with a name** ✅
  Today we have one rule (sales outside working hours). Add five more that need
  no new data:
  - **6.1** Selling long after clocking out, again and again
  - **6.2** Sudden bursts of sales right before shift end
  - **6.3** The same amount rung up many times in one hour
  - **6.4** Selling much faster or slower than normal for that person
  - **6.5** Too many round numbers compared to their own station's normal

  Then instead of "this person looks suspicious", we can say "this person broke
  4 named rules on 3 different nights."

- **7. Night-time counts double** ✅
  Most station crime happens between 10pm and 6am. Anything strange at night
  gets a higher warning score, so real problems rise to the top.

- **8. Every alert gets an owner** ✅
  An alert becomes a task with a name, a deadline, and an answer
  (real / explained / false alarm). Nothing gets ignored. Also important: a
  supervisor checks it **before** someone is marked high-risk — a forgotten
  clock-in should not ruin someone's record.

- **9. Ready-made file for camera checks** ✅
  Each case automatically shows the station, the person, and the exact minutes
  to look for on CCTV. Turns hours of searching into minutes.

- **10. Check every sale against the official price** 📥
  Add litres to the data. Because the price is fixed by the state,
  money ÷ litres must equal the official price exactly. Anything else is a
  mistake or manipulation — with almost no false alarms. Other countries cannot
  do this, because their prices change.

---

## C. Staff

- **11. A fairer leaderboard** ✅
  Right now all 20 people are ranked publicly, so the bottom 6 are shamed every
  day and give up. Instead: rank by "% of your own target" (a small station at
  105% beats the big one at 92%), show only the top 5 plus your own neighbours,
  reset every week, and add extra winners: "Most Improved" and "Best Attendance."

---

## D. Running the stations

- **12. Show staffing vs busyness** ✅
  Put the hourly sales curve next to how many people were working that hour.
  Instantly shows the hours we are paying people to stand around, and the busy
  hours where we are losing sales because only one person was there.

- **13. Find dead hours** ✅
  If a station was open and staffed but sold almost nothing for an hour, flag
  it. It means either a broken pump, an empty station, or sales not being rung
  up — all worth knowing.

---

## E. The system itself

- **14. Check the daily file is correct** ✅
  Warn if the file is missing, late, duplicated, or malformed. One bad import
  ruins a whole day of scores and alerts.

- **15. Three languages: Azerbaijani, Russian, English** ✅
  Everything the user sees gets translated, with a switch in the corner and a
  default the admin chooses. Every label, button, alert message and the morning
  brief. Best done early — retro-fitting translation into a finished app is
  much slower than building with it from the start.

- **16. Admin settings page — nothing hardcoded** ✅ **(key decision)**
  One page where an admin changes how the whole system behaves, with no
  developer involved:
  - **16.1** Revenue targets — per station, per month (replaces the broken
    formula in **3**)
  - **16.2** Shift length — currently fixed at 8 hours for everyone, which is
    why every operator shows exactly 100% attendance
  - **16.3** Risk thresholds — what counts as MEDIUM vs HIGH (today: 2+
    suspicious sales = HIGH)
  - **16.4** Grade boundaries — what earns an A, B, C, D
  - **16.5** Fraud rules from **6** — switch each on/off and set its sensitivity
  - **16.6** Late-arrival grace period, before it hurts someone's score
  - **16.7** Holiday calendar — Novruz and the rest
  - **16.8** Default language and station list

  Right now all of these are numbers written inside the code, which means every
  small policy change needs a developer. For a system SOCAR actually runs, that
  is the difference between a tool and a toy.

- **17. Move away from daily files** 📥
  Long-term: connect directly to the tills and pumps so data arrives live
  instead of once a day. Rompetrol did this across 500 stations.

---

## What to build first

**Now (no new data needed):**
**16** → **15** → **1** → 14 → 3 → 6 → 7 → 8 → 9 → 2 → 11 → 13 → 12 → 4

The first three come first for a reason:

- **16 (admin settings)** because every idea after it needs numbers that are
  currently frozen in code — build it first and everything else plugs into it.
- **15 (languages)** because translating a small app is quick and translating a
  finished one is slow.
- **1 (keep history)** because trends, fair targets and the statistical fraud
  rules are impossible without it.

**Next (needs one new column):**
10

**Later (needs live data instead of daily files):**
5 → 17

---

## What to ask the POS/IT team for

In order of value:

1. **Nothing** — just let us keep every day's data → unlocks **1**
   (and with it 3, 6, 11, 12, 13)
2. **Litres for each sale** → unlocks **10**
3. **Data more often than once a day** → unlocks **5** and **17**
