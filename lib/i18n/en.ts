/**
 * English dictionary — the source of truth. `az.ts` and `ru.ts` are typed as
 * `typeof en`, so TypeScript fails the build if a translation is missing.
 * This is the CORE app's vocabulary: workers, taps, sales, obvious alerts.
 */
export const en = {
  brand: {
    name: "SOCAR SASIS",
    tagline: "Alert & Integrity Center",
    systemOnline: "System online",
  },

  nav: {
    sectionIntegrity: "Monitoring",
    alerts: "Alerts",
    workers: "Workers",
    wall: "Alert board",
  },

  common: {
    previousPage: "Previous",
    nextPage: "Next",
    perPage: (n: number) => `${n} per page`,
    showingRange: (from: number, to: number, total: number) =>
      `${from}–${to} of ${total}`,
    station: "Station",
    department: "Department",
    shift: "Shift",
    operator: "Worker",
    loading: "Loading…",
    tryAgain: "Try again",
    search: "Search",
    reset: "Reset",
    operationalDay: "Operational day",
    previousDay: "Previous day",
    nextDay: "Next day",
    allStations: "All stations",
    allDepartments: "All departments",
    allShifts: "All shifts",
    /** Index 0 = Sunday, matching `Date.getDay()`. */
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },

  shifts: {
    Morning: "Morning",
    Evening: "Evening",
    Night: "Night",
  },

  roles: {
    admin: "Administrator",
    supervisor: "Regional supervisor",
    manager: "Station manager",
    staff: "Worker",
  },

  auth: {
    signIn: "Sign in",
    signingIn: "Signing in…",
    signOut: "Sign out",
    signingOut: "Signing out…",
    workEmail: "Work email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    internalOnly: "Internal system — authorised personnel only.",
    sessionNote: "Sessions end after 8 hours — one shift.",
    account: "Account",
    profile: "Profile",
    signedInAs: (email: string) => `Signed in as ${email}`,
    allStations: "All stations",
    errors: {
      badCredentials: "Incorrect email or password.",
      disabled: "This account has been disabled. Contact an administrator.",
      tooMany: "Too many attempts. Wait a few minutes and try again.",
      network: "Network error. Check your connection and try again.",
      generic: "Could not sign you in. Try again.",
      noSession: "Could not start a session.",
    },
  },

  alerts: {
    title: "Alert center",
    description:
      "Only what the database can prove — missing taps and sales off the clock.",
    totalFlagged: "Alerts",
    workersAffected: "Workers",
    amountInvolved: "Amount involved",
    worstDay: "Worst day",
    searchPlaceholder: "Search worker, card or station…",
    clearSearch: "Clear search",
    severityFilter: "Filter by severity",
    severityAll: "All severities",
    severity: {
      high: "High",
      medium: "Medium",
      low: "Low",
    },
    colWhen: "When",
    colWhat: "What the database shows",
    colAmount: "Amount",
    incidentLog: "Incident log",
    incidentLogDesc: "Newest first · every row is checkable in the raw tables",
    noneDetected: "No alerts in this period",
    noneDetectedDesc:
      "Every tap is paired and every sale sits inside its worker's tapped window.",
    liveFeed: "Live feed",
    liveFeedLog: "Live feed log",
    liveFeedEmpty: "Nothing yet — turn the feed on.",
    liveFeedQuiet: "no new rows",
    liveFeedSales: "sales",
    liveFeedTaps: "taps",
    liveFeedError: "tick failed",
    types: {
      missingOut: "Tapped in, never tapped out",
      missingIn: "Tapped out, never tapped in",
      doubleTapIn: "Tapped in twice",
      doubleTapOut: "Tapped out twice",
      saleOffClock: "Sale outside the tapped window",
      noTapsSales: "Sales with no taps at all",
    },
  },

  workers: {
    title: "Workers",
    description:
      "Presence and sales per worker — who tapped in, when they left, and what their fob sold.",
    searchPlaceholder: "Search name, card or station…",
    clearSearch: "Clear search",
    colWorker: "Worker",
    colInOut: "In → Out",
    colHours: "Hours",
    colSales: "Sales",
    colLitres: "Litres",
    colRevenue: "Revenue",
    colTime: "Time",
    colGrade: "Fuel",
    colAmount: "Amount",
    onDuty: "On duty",
    tapsMissing: "Taps missing",
    noWorkers: "No workers on this day",
    noWorkersDesc: "No taps or sales were recorded for this operational day.",
    absentTitle: "Not on shift this day",
    absentDesc: "No taps and no sales were recorded for this worker on this day.",
    backToWorkers: "All workers",
    timeline: "The day, on one axis",
    timelineDesc:
      "Top: presence exactly as the taps state it. Below: every sale, on the same axis — a sale outside the band needs no explanation.",
    presence: "Presence",
    offClock: "Off the clock",
    salesTitle: "Sales",
    noSales: "No sales recorded this day.",
    tapsTitle: "Taps",
    tapsDesc: "Raw check_time / check_type rows, in order.",
    noTaps: "No taps recorded this day.",
    tapIn: "IN",
    tapOut: "OUT",
  },

  wall: {
    title: "Alert board",
    alertsToday: "alerts today",
    missingTaps: "taps missing",
    clearStations: "stations clear",
    alertsShort: "today",
    missingShort: (n: number) =>
      n === 1 ? "1 tap missing" : `${n} taps missing`,
    highShort: (n: number) => `${n} high severity`,
    status: {
      clear: "Clear",
      attention: "Attention",
      critical: "Critical",
    },
    notLive: "Updated once per daily import — not a live feed.",
    stale: "Data is out of date",
    ageHours: (n: number) => `${n} h old`,
    ageDays: (n: number) => `${n} d old`,
    latestTitle: "Latest detections",
    noEvents: "Nothing detected on the latest day.",
  },

  errors: {
    dataTitle: "Couldn't load operational data",
    dataDesc:
      "The app could not read from Firestore. If this is a free-tier project, the daily read quota may be exhausted — it resets at midnight Pacific. Otherwise, check the server logs.",
  },

  search: {
    placeholder: "Search workers, pages…",
    dialogPlaceholder: "Search a worker or jump to a page…",
    noResults: "No results found.",
    pages: "Pages",
    workers: "Workers",
  },

  theme: {
    switch: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  credit: {
    developedBy: "Developed by",
    author: "Nihat Shikhizada",
  },
  languages: {
    az: "Azərbaycanca",
    ru: "Русский",
    en: "English",
    switch: "Change language",
  },
}

/**
 * No `as const`: literal types would make every translation a type error.
 * Widened strings still catch missing and misspelled keys, which is the point.
 */
export type Dictionary = typeof en
