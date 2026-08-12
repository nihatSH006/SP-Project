/**
 * Cloud Functions — the simulated LIVE feed for the SOCAR SASIS demo.
 *
 *   liveFeedTick — every 5 minutes (Asia/Baku): replay each worker's
 *                  deterministic day plan up to "now", writing new taps to
 *                  /stations/{st}/logs and new sales to /sales (THE sales
 *                  table), then refreshing the linked worker-day reports and
 *                  meta documents. Random, tunable percentages of the
 *                  worker-days deliberately contain alert-provable anomalies
 *                  — see ALERT_CHANCES in simulator.js.
 *
 *   feedNow      — the same tick behind an HTTP endpoint, for kicking the
 *                  feed by hand right after a deploy instead of waiting for
 *                  the scheduler.
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

const { runFeedTick } = require("./feed")

initializeApp()
setGlobalOptions({ region: "europe-west1", maxInstances: 1 })

exports.liveFeedTick = onSchedule(
  { schedule: "every 5 minutes", timeZone: "Asia/Baku" },
  async () => {
    const summary = await runFeedTick(getFirestore(), Date.now())
    logger.info("live feed tick", summary)
  }
)

exports.feedNow = onRequest(async (req, res) => {
  const summary = await runFeedTick(getFirestore(), Date.now())
  logger.info("manual feed tick", summary)
  res.json(summary)
})
