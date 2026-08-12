/**
 * Cloud Functions — the simulated LIVE feed for the SOCAR SASIS demo.
 *
 * The feed runs IN THE CLOUD, never from the website:
 *
 *   liveFeedTick — fires every minute (Cloud Scheduler's floor), and while
 *                  the /meta/feed master switch is ON it ticks the feed
 *                  EVERY SECOND for the whole minute — taps into
 *                  /stations/{st}/logs, sales into /sales (THE sales
 *                  table), reports and meta kept linked, and the event
 *                  journal into /meta/feedLog for the dashboard to read.
 *                  The switch is re-checked every second: OFF stops the
 *                  loop within a second, and the next minutes exit
 *                  immediately without doing anything.
 *
 *   feedNow      — one single tick behind HTTP: the dashboard kicks it once
 *                  when the switch is flipped ON so the feed starts
 *                  instantly instead of waiting for the next minute.
 *
 * Random, tunable percentages of the worker-days deliberately contain
 * alert-provable anomalies — see ALERT_CHANCES in simulator.js.
 *
 * Deploy:  firebase deploy --only functions
 * Verify:  npm test   (inside functions/ — offline, no Firestore needed)
 */

"use strict"

const { setGlobalOptions } = require("firebase-functions/v2")
const { onSchedule } = require("firebase-functions/v2/scheduler")
const { onRequest } = require("firebase-functions/v2/https")
const logger = require("firebase-functions/logger")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")

const { runFeedTick, runFeedLoop } = require("./feed")

initializeApp()
setGlobalOptions({ region: "europe-west1", maxInstances: 1 })

/** Tick every second for ~52s, leaving headroom before the next minute. */
const LOOP_BUDGET_MS = 52_000

exports.liveFeedTick = onSchedule(
  { schedule: "every 1 minutes", timeZone: "Asia/Baku", timeoutSeconds: 110 },
  async () => {
    const summary = await runFeedLoop(getFirestore(), LOOP_BUDGET_MS)
    if (summary.ticks === 0) {
      logger.info("live feed minute: switch is off, nothing ran", summary)
    } else {
      logger.info("live feed minute", summary)
    }
  }
)

exports.feedNow = onRequest(async (req, res) => {
  const summary = await runFeedTick(getFirestore(), Date.now())
  logger.info("manual feed tick", summary)
  res.json(summary)
})
