/**
 * English dictionary — the source of truth.
 *
 * `az.ts` and `ru.ts` are typed as `typeof en`, so TypeScript fails the build
 * if a translation is missing or a key is misspelled. Add strings here first.
 *
 * Functions are used where a string interpolates values, so translators can
 * reorder words freely rather than being forced into English grammar.
 */
export const en = {
  brand: {
    name: "SOCAR SASIS",
    tagline: "Sales & Staff Intelligence",
    systemOnline: "System online",
  },

  nav: {
    wall: "Office screen",
    sectionOverview: "Overview",
    sectionPeople: "People",
    sectionSites: "Sites",
    sectionIntegrity: "Integrity",
    sectionAnalysis: "Analysis",
    sectionAdmin: "Administration",
    dashboard: "Dashboard",
    breakdown: "Breakdown",
    operators: "Operators",
    leaderboard: "Leaderboard",
    stations: "Stations",
    alerts: "Alerts",
    settings: "Settings",
    cases: "Cases",
    staffing: "Staffing",
    boardPack: "Board pack",
  },

  common: {
    revenue: "Revenue",
    transactions: "Transactions",
    operators: "Operators",
    station: "Station",
    stations: "Stations",
    department: "Department",
    departments: "Departments",
    shift: "Shift",
    shifts: "Shifts",
    hours: "Hours",
    sales: "Sales",
    attendance: "Attendance",
    productivity: "Productivity",
    score: "Score",
    grade: "Grade",
    risk: "Risk",
    health: "Health",
    rank: "Rank",
    operator: "Operator",
    controller: "Controller",
    all: "All",
    none: "none",
    perHour: "AZN/h",
    azn: "AZN",
    of: "of",
    loading: "Loading…",
    tryAgain: "Try again",
    search: "Search",
    reset: "Reset",
    scope: "Scope",
    operationalDay: "Operational day",
    previousDay: "Previous day",
    nextDay: "Next day",
    allStations: "All stations",
    allDepartments: "All departments",
    allShifts: "All shifts",
  },

  shifts: {
    Morning: "Morning",
    Evening: "Evening",
    Night: "Night",
  },

  risk: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
  },

  roles: {
    admin: "Administrator",
    supervisor: "Regional supervisor",
    manager: "Station manager",
    staff: "Operator",
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

  overview: {
    title: "Overview",
    onTrack: "On track",
    watch: "Worth watching",
    action: "Needs action",
    allGood: "Nothing needs a decision today.",
    needsAttention: "Needs attention",
    target: "Target",
    noTarget: "No target set",
    toGo: (amount: string) => `${amount} AZN to go`,
    over: (amount: string) => `${amount} AZN over`,
    health: "Health",
    sales: "Sales",
    onDuty: "On duty",
    perHour: "Per hour",
    attendance: "Attendance",
    today: "Through the day",
    byStation: "By station",
    breakdown: "Breakdown",
    seeAll: "See all",
    item: {
      alerts: (n: number) => `${n} flagged ${n === 1 ? "sale" : "sales"}`,
      highRisk: (n: number) => `${n} high-risk ${n === 1 ? "operator" : "operators"}`,
      attendance: (v: number) => `Attendance ${v}%`,
      health: (v: number) => `Health ${v}%`,
      target: (v: number) => `${v}% of target`,
    },
  },

  breakdown: {
    title: "Breakdown",
    description: "How revenue and the workforce were distributed.",
    byDepartment: "By department",
    byShift: "By shift",
    byRisk: "By risk",
    topPerformers: "Top performers",
    perOperator: "Per operator",
    bestStation: "Best station",
    bestDepartment: "Best department",
    backToOverview: "Overview",
  },

  dashboard: {
    title: "Operations dashboard",
    description:
      "Fleet-wide sales, workforce and risk overview for the operational day.",
    reviewAlerts: "Review alerts",
    totalRevenue: "Total revenue",
    targetProgress: (pct: number, target: string) =>
      `${pct}% of the ${target} AZN daily target`,
    noTarget: "No revenue target configured",
    completedSales: "completed fuel sales",
    operatorsOnDuty: "Operators on duty",
    acrossStations: (n: number) => `across ${n} stations`,
    avgProductivity: "Avg productivity",
    revenuePerHour: "revenue per working hour",
    aboveTarget: "above target",
    nearTarget: "near target",
    belowTarget: "below target",
    openAlerts: "Open alerts",
    allClear: "all clear",
    needsReview: "needs review",

    dailyTarget: "Daily revenue target",
    progressToward: (target: string) => `Progress toward ${target} AZN`,
    setTargetsPrompt: "Set targets in Settings to track progress",
    targetExceeded: "Target exceeded.",
    remainingToTarget: (amount: string) =>
      `${amount} AZN remaining to reach today's target.`,
    noTargetLong:
      "No target configured — an administrator can set one per station in Settings.",
    operationalHealth: "Operational health",
    healthStable: "Stable — no significant incident load",
    healthMonitor: "Monitor — incident load rising",
    healthDegraded: "Degraded — management review recommended",

    workforceRisk: "Workforce risk",
    workforceRiskDesc: "Operators by risk classification",
    operatorCount: (n: number) => `${n} operator${n === 1 ? "" : "s"}`,

    highlights: "Today's highlights",
    highlightsDesc: "Best performers in the current slice",
    topOperator: "Top operator",
    bestStation: "Best station",
    bestDepartment: "Best department",
    avgRevenuePerOperator: "Avg revenue / operator",
    highRiskOperators: "High-risk operators",

    revenueThroughDay: "Revenue through the day",
    hourlyRevenue: "Hourly fuel-sale revenue, AZN",
    revenueByStation: "Revenue by station",
    totalPerStation: "Total AZN per station",
    revenueByDepartment: "Revenue by department",
    totalPerDepartment: "Total AZN per department",
    shiftCoverage: "Shift coverage",
    operatorsPerShift: "Operators per shift",
    onDuty: "on duty",

    top5: "Top 5 operators",
    top5Desc: "Ranked by revenue, then productivity",
    fullRanking: "Full ranking",

    executiveBrief: "Executive brief",
    executiveBriefDesc: "Auto-generated from today's data",
    briefLine1: (revenue: string, transactions: number) =>
      `Today the fleet generated ${revenue} AZN across ${transactions} transactions`,
    briefTargetPart: (pct: number) => ` — ${pct}% of the daily revenue target.`,
    briefNoTargetPart: " with no revenue target configured.",
    briefLine2: (
      leader: string,
      amount: string,
      station: string,
      department: string
    ) =>
      `${leader} leads with ${amount} AZN; ${station} is the strongest station and ${department} the strongest department.`,
    briefLine3: (productivity: string, attendance: number) =>
      `Average productivity is ${productivity} AZN/hour with attendance at ${attendance}%.`,
    briefNoAlerts: "No suspicious activity was detected.",
    briefAlerts: (n: number) =>
      `${n} suspicious transaction${n === 1 ? "" : "s"} require review before shift close.`,
    targetExceededShort: "Revenue target exceeded",
    targetNearlyShort: "Revenue target nearly achieved",
    targetMissedShort: "Revenue target missed",

    recentAlerts: "Recent alerts",
    recentAlertsDesc: "Sales recorded outside working hours",
    alertCenter: "Alert center",
    noAlerts: "No operational alerts",
    noAlertsDesc:
      "Every sale in this slice falls inside its operator's registered working hours.",
  },

  operators: {
    all: "All",
    onDuty: "On duty",
    perHour: "Per hour",
    sales: "Sales",
    profileHint: "Open a name for hours, sales and score.",
    title: "Operators",
    description: "Performance and risk for everyone on duty.",
    inCurrentSlice: "in the current slice",
    transactionsCount: (n: number) => `${n} transactions`,
    perWorkingHour: "per working hour",
    againstShift: "against an 8-hour shift",
    avgAttendance: "Avg attendance",
    countLabel: (visible: number, total: number) =>
      visible === total
        ? `${total} operator${total === 1 ? "" : "s"}`
        : `${visible} of ${total} operators`,
    clickForProfile: "click a name for the full profile",
    searchPlaceholder: "Search name or station…",
    clearSearch: "Clear search",
    noMatch: (query: string) => `No operators match "${query}"`,
    noMatchDesc: "Try a different name, station or department.",
    revenueAzn: "Revenue (AZN)",
  },

  operatorDetail: {
    title: "Operator profile",
    description: (shift: string) =>
      `Full performance and risk assessment for the ${shift} shift.`,
    allOperators: "All operators",
    grade: "grade",
    fleetAvg: (value: string) => `fleet avg ${value}`,
    above: "above",
    below: "below",
    perHourCount: (n: number) => `${n} per hour`,
    performanceScore: "Performance score",
    scoreBlend: "attendance + productivity blend",
    workingHours: "Working hours",
    ofScheduled: (n: number) => `of ${n} scheduled`,
    revenueThroughShift: "Revenue through the shift",
    hourlyBy: (name: string) => `Hourly revenue recorded by ${name}, AZN`,
    assessment: "Assessment",
    assessmentDesc: "Auto-generated recommendation",
    topTier: "Top-tier performance",
    topTierBody: (name: string) =>
      `${name} is one of the strongest operators today — excellent attendance and high revenue generation.`,
    topTierAction:
      "Recommendation: recognise this operator and consider leadership responsibilities.",
    performingWell: "Performing well",
    performingWellBody: (name: string) =>
      `${name} is performing well; some indicators can still improve.`,
    performingWellAction:
      "Recommendation: continue monitoring and provide coaching where useful.",
    needsAttention: "Needs management attention",
    needsAttentionBody: "Performance is below expectations for the day.",
    needsAttentionAction:
      "Recommendation: review attendance and productivity, and monitor upcoming transactions.",
    riskHigh: (n: number) =>
      `${n} suspicious transaction${n === 1 ? "" : "s"} — immediate investigation recommended.`,
    riskMedium: "Keep this operator under observation.",
    riskLow: "No operational concerns detected.",
    flagged: "Flagged transactions",
    flaggedDesc: (window: string) =>
      `Sales recorded outside this operator's ${window} working window`,
  },

  leaderboard: {
    title: "Performance leaderboard",
    description: "Operators ranked by revenue, then productivity.",
    revenueChampion: "Revenue champion",
    revenueChampionDesc: "Highest revenue in the slice",
    productivityChampion: "Productivity champion",
    productivityChampionDesc: "Most AZN per working hour",
    attendanceChampion: "Attendance champion",
    attendanceChampionDesc: "Best shift-hours compliance",
    completeRanking: "Complete ranking",
    allOperators: (n: number) => `All ${n} operators in the current slice`,
    shiftSuffix: (shift: string) => `${shift} shift`,
    fair: {
      title: "Fair ranking",
      subtitle:
        "Everyone is measured against what their own station and shift normally takes \u2014 not against the network.",
      why: "Why this changed",
      whyBody:
        "Ranking by revenue measured where someone was rostered, not how they worked. A highway forecourt outsells a regional one every day whatever anyone does, and a night operator could never place at all. Each person is now compared against the median day in their own slot.",
      percentOfExpected: "% of expected",
      expected: "Expected",
      actual: "Actual",
      overWindow: (n: number) => `over ${n} days`,
      mostImproved: "Most improved",
      mostImprovedDesc:
        "Biggest gain between the first and second half of the window, measured in ratio points \u2014 so improving at a quiet station counts the same as at a busy one.",
      noImproved: "No clear improvement yet in this window.",
      improvementPoints: (n: number) => `${n > 0 ? "+" : ""}${n} pts`,
      tierLabel: "Band",
      tiers: {
        exceptional: "Exceptional",
        strong: "Strong",
        expected: "As expected",
        below: "Below expected",
        "needs-support": "Needs support",
      },
      tierNote:
        "Bands describe output against a slot's norm. Below expected is a prompt to ask why \u2014 a broken pump, a new starter, an expectation that is simply wrong \u2014 not a judgement about effort.",
      rawNote: "Raw revenue is shown for context only. It does not affect rank.",
    },
  },

  stations: {
    title: "Station performance",
    description:
      "Regional view — revenue, workforce and operational health per station.",
    inSlice: "in the current slice",
    regionalRevenue: "Regional revenue",
    perOperatorHour: "per operator working hour",
    avgHealth: "Avg station health",
    stable: "stable",
    monitor: "monitor",
    intervention: "intervention advised",
    bestStation: "Best performing station",
    bestStationDesc: "Highest revenue in the current slice",
    viewOperators: "View operators",
    onDutyCount: (n: number) => `${n} operator${n === 1 ? "" : "s"} on duty`,
    operatorsTransactions: (ops: number, tx: number) =>
      `${ops} operator${ops === 1 ? "" : "s"} · ${tx} transactions`,
    alertsCount: (n: number) => `${n} alert${n === 1 ? "" : "s"}`,
    stableShort: "Stable",
    monitorShort: "Monitor",
    reviewShort: "Review recommended",
    comparison: "Station comparison",
    comparisonDesc: "Full metrics per station",
  },

  cases: {
    title: "Fraud cases",
    description:
      "Cases the detection rules proposed for review. A rule firing is a reason to look, not a finding.",
    queue: "Review queue",
    queueDesc: "Open work first, then by weight.",
    openCases: "Open",
    investigating: "Being investigated",
    closed: "Closed",
    noCases: "No cases open",
    noCasesDesc:
      "No operator tripped enough rules across enough separate days to warrant review.",
    proposed: "Engine proposed",
    proposedNote: "Proposed by the rules \u2014 not a conclusion.",
    score: "Weight",
    flaggedDays: "Flagged days",
    window: "Window",
    rulesTripped: "Rules tripped",
    daysCount: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
    openCase: "Open case",
    backToCases: "Back to cases",
    assignedTo: "Owner",
    unassigned: "Unassigned",
    assignToMe: "Assign to me",
    statusLabel: "Status",
    noteLabel: "Reviewer notes",
    notePlaceholder: "What did you check, and what did you conclude?",
    save: "Save",
    saved: "Saved",
    timeline: "Case history",
    timelineDesc: "Append-only. Every change is kept.",
    noTimeline: "No changes recorded yet.",
    evidence: "Evidence",
    evidenceDesc:
      "The exact windows to pull on CCTV, generated with the case so nobody has to reconstruct them.",
    cctvWindow: "CCTV window",
    noEvidence: "No time windows recorded for this rule.",
    observed: "Observed",
    baseline: "Normal",
    amounts: "Amounts",
    viewDay: "View this day",
    fairnessTitle: "Before you act",
    fairnessBody:
      "These rules measure patterns in till data, not intent. A pattern has innocent explanations \u2014 a broken pump, a clock that drifted, a regular customer. Check the footage and talk to the person before recording a conclusion.",
    needsSupervisorHint:
      "Only a supervisor or admin can close a case. A station manager assessing their own team has a conflict of interest.",
    noteRequiredHint:
      "Confirming fraud requires written reasoning of at least 10 characters.",
    statusOpen: "Open",
    statusInvestigating: "Investigating",
    statusConfirmed: "Confirmed",
    statusExplained: "Explained",
    statusDismissed: "Dismissed",
    errors: {
      notSignedIn: "Your session expired. Sign in again.",
      notAllowed: "You do not have permission to change this case.",
      badRequest: "Something was missing from that request.",
      badStatus: "That is not a valid status.",
      needsSupervisor: "Only a supervisor or admin can close a case.",
      noteRequired: "Write down what you found before confirming fraud.",
      notFound: "That case no longer exists.",
    },
    rules: {
      afterHours: "Sales outside the shift",
      lateClose: "Sales after clock-out",
      shiftEndBurst: "Burst at shift end",
      duplicateAmounts: "Repeated identical amounts",
      roundAmount: "Unusually many round amounts",
      velocityOutlier: "Pace far from peers",
      deadHours: "Hours with almost no sales",
    },
    ruleHelp: {
      afterHours: "Transactions recorded when this person was not on shift.",
      lateClose: "Transactions recorded after they clocked out.",
      shiftEndBurst:
        "An unusual cluster of sales in the final minutes of a shift.",
      duplicateAmounts:
        "The same amount repeated close together \u2014 a possible sign of a reused receipt.",
      roundAmount:
        "Far more round-number sales than colleagues at the same station.",
      velocityOutlier:
        "Sales pace far from the peer median. On its own this is not evidence \u2014 a fast operator is just fast.",
      deadHours:
        "Long stretches taking almost nothing. Usually a broken pump or a quiet forecourt, not theft.",
    },
  },

  staffing: {
    title: "Staffing vs busyness",
    description:
      "Where cover and demand line up, and where they do not. Revenue per operator-hour, by hour of the week.",
    heatmap: "Demand per operator-hour",
    heatmapDesc:
      "Darker means each operator on shift handled more. It reflects how many customers arrived, not how hard anyone worked.",
    networkLabel: "Whole network",
    perOperatorHour: "per operator-hour",
    onShift: "on shift",
    noData: "Not enough coverage recorded to build a profile yet.",
    suggestions: "Worth a look",
    suggestionsDesc:
      "Hours that are out of line with the SAME hour on other days. Comparing them against the weekly average would just report that nights are quiet \u2014 true, and not something a 24-hour forecourt can act on.",
    noSuggestions: "Cover matches demand across the week. Nothing to change.",
    stretched: "Stretched",
    idle: "Over-covered",
    stretchedDesc: (x: number) => `${x}x the usual rate for this hour`,
    idleDesc: (x: number) => `${x}x the usual rate for this hour`,
    usualAt: (v: number) => `usually ${v}`,
    busiest: "Busiest hour",
    quietest: "Quietest hour",
    median: "Typical rate",
    caveat:
      "Cover is not only about takings. Night shifts exist for safety and single-manning rules, and this view knows nothing about either.",
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },

  boardPack: {
    title: "Monthly board pack",
    description: "One page for the month, ready to print or save as PDF.",
    print: "Print / Save as PDF",
    generatedOn: (d: string) => `Generated ${d}`,
    period: "Period",
    scopeNetwork: "Whole network",
    headline: "Headline",
    revenue: "Revenue",
    transactions: "Transactions",
    operators: "Operators",
    perStation: "By station",
    station: "Station",
    days: "Days",
    dailyAverage: "Daily average",
    integrity: "Loss prevention",
    integrityDesc:
      "Cases the detection rules proposed and what people concluded. A proposal is not a finding.",
    casesOpen: "Awaiting review",
    casesInvestigating: "Being investigated",
    casesConfirmed: "Confirmed",
    casesExplained: "Explained",
    casesDismissed: "Dismissed",
    outstanding: "Still awaiting a decision",
    noOutstanding: "Every case has been reviewed.",
    people: "People",
    topPerformers: "Top performers",
    topPerformersDesc:
      "Ranked against what their own station and shift normally takes, so the figure reflects how they worked rather than where they were rostered.",
    improved: "Most improved",
    rota: "Rota",
    rotaDesc: "Hours out of line with the same hour on other days.",
    noRota: "Cover matched demand across the week.",
    dataHealth: "Data quality",
    dataHealthDesc:
      "Stated so the figures above can be weighed properly. Numbers whose completeness is not declared invite decisions nobody checked.",
    daysCovered: (a: number, b: number) => `${a} of ${b} days imported`,
    complete: "Complete month",
    incomplete: "Partial month \u2014 totals below cover only the days imported",
    lastImport: "Last import",
    warningsTitle: "Recorded on import",
    noWarnings: "No issues recorded during import.",
    confidential:
      "Confidential. Contains performance and loss-prevention information about named staff.",
  },

  wall: {
    stations: "stations",
    title: "Office screen",
    network: "Network",
    target: "Target",
    noTarget: "No target set",
    operators: "on duty",
    alerts: "flagged",
    asOf: (time: string) => `Figures as of ${time}`,
    ageMinutes: (n: number) => `${n} min old`,
    ageHours: (n: number) => `${n} h old`,
    ageDays: (n: number) => `${n} d old`,
    ageUnknown: "Import time not recorded",
    notLive:
      "Updated once per daily import \u2014 not a live feed.",
    stale: "Data is out of date",
    refreshed: (time: string) => `Screen refreshed ${time}`,
    open: "Office screen",
    exit: "Exit",
  },

  alerts: {
    title: "Alert center",
    description:
      "Suspicious transactions — sales recorded outside an operator's working hours.",
    flaggedTransactions: "Flagged transactions",
    inSlice: "in the current slice",
    highPriority: "High priority",
    twoPlusFlagged: "2+ flagged sales",
    mediumPriority: "Medium priority",
    oneFlagged: "1 flagged sale",
    clearOperators: "Clear operators",
    noFlagged: "no flagged sales",
    incidentLog: "Incident log",
    incidentLogDesc: "Newest first · click an operator for their full profile",
    noneDetected: "No suspicious transactions detected",
    noneDetectedDesc:
      "Every sale in this slice falls inside its operator's registered working hours.",
    recommendedActions: "Recommended actions",
    standardProcedure: "Standard incident procedure",
    noAction: "No action required.",
    noActionDesc:
      "All sales in the current slice fall inside their operators' registered working hours.",
    generated: (alerts: number, ops: number) =>
      `Today's operations generated ${alerts} flagged transaction${alerts === 1 ? "" : "s"} across ${ops} operator${ops === 1 ? "" : "s"}.`,
    beforeEndOfDay: "Before the end of the operating day:",
    step1: "Verify each flagged transaction against the till record.",
    step2: "Review CCTV footage for the flagged time windows.",
    step3: "Confirm the operator's shift schedule with the station manager.",
    priorityReview: "Priority review",
    byPriority: "Operators by priority",
    byPriorityDesc: "Grouped by how many flagged sales each operator carries",
    tabHigh: "High",
    tabMedium: "Medium",
    tabClear: "Clear",
    flaggedSuffix: (n: number) => `${n} flagged`,
    noHigh: "No high-priority operators.",
    noMedium: "No medium-priority operators.",
    noClear: "No clear operators.",
    outsideHours: "Sale recorded outside working hours",
  },

  settings: {
    title: "Settings",
    description:
      "The business rules behind every score, grade and risk flag. Changing them here takes effect immediately — no developer needed.",

    scoring: "Scoring",
    scoringDesc:
      "How working hours and sales pace turn into a 0–100 score. Changes apply immediately to every operational day.",
    scheduledHours: "Scheduled shift length",
    scheduledHoursDesc:
      "The denominator of the attendance score. Everyone currently works exactly this, which is why attendance sits near 100%.",
    productivityTarget: "Productivity target",
    productivityTargetDesc:
      "AZN per hour that earns full marks. The old hardcoded 15 was tuned for busy Baku stations — raising it is unfair to quiet stations, lowering it is unfair to busy ones.",
    graceMinutes: "Late-arrival grace",
    graceMinutesDesc:
      "Lateness forgiven before it dents the attendance score.",

    riskThresholds: "Risk thresholds",
    riskThresholdsDesc: "When an operator is flagged MEDIUM or HIGH risk.",
    riskHighSuspicious: "Flagged sales for HIGH risk",
    riskHighSuspiciousDesc: "Suspicious sales in one shift that force HIGH.",
    riskMediumAttendance: "Attendance below this is MEDIUM",
    riskHighAttendance: "Attendance below this is HIGH",
    riskHighAttendanceDesc: "Must be lower than the medium threshold.",

    gradeBoundaries: "Grade boundaries",
    gradeBoundariesDesc:
      "Minimum score for each grade. Must descend: A+ > A > B > C.",
    gradeFrom: (grade: string) => `Grade ${grade} from`,
    belowC: "Anything below the C boundary grades D.",

    revenueTargets: "Revenue targets",
    revenueTargetsDesc:
      "Replaces the old formula, which derived the target from the revenue it was measuring and so always reported 87%.",
    targetMode: "How targets are set",
    targetModeDesc:
      "Manual uses the numbers below. Baseline derives each station's target from its own recent days.",
    manualMode: "Manual per station",
    baselineMode: "From each station's own average",
    baselineUplift: "Uplift over recent average",
    baselineUpliftDesc:
      "1.05 asks each station for 5% more than its own trailing average.",
    defaultTarget: "Default daily target",
    defaultTargetDesc:
      "Used for any station without its own number below.",

    language: "Language",
    languageDesc:
      "Default interface language for everyone who has not chosen one.",
    defaultLanguage: "Default language",
    defaultLanguageDesc: "Individual users can still switch.",

    unsaved: "Unsaved changes",
    saved: "Saved",
    appliesImmediately: "Applies to all operational days immediately.",
    restoreDefaults: "Restore defaults",
    save: "Save settings",
    saving: "Saving…",
    savedToast: "Settings saved — scores updated across every day.",
    restoredToast: "Restored the default rules.",
    auditNote:
      "Every change is recorded with who made it, so grade and risk decisions stay auditable.",

    units: { hours: "hours", aznPerHour: "AZN/h", min: "min", sales: "sales", pts: "pts", azn: "AZN", times: "×" },
  },

  dataHealth: {
    title: "Data health",
    description: "The last import, and anything worth checking in it.",
    lastImport: "Last import",
    source: "Source",
    days: "Days",
    shifts: "Shifts",
    sales: "Sales",
    stations: "Stations",
    workers: "Workers",
    clean: "Imported cleanly",
    cleanDesc: "No problems were found in the last import.",
    errors: (n: number) => `${n} error${n === 1 ? "" : "s"}`,
    warnings: (n: number) => `${n} warning${n === 1 ? "" : "s"}`,
    affectedRows: (n: number) => `${n} row${n === 1 ? "" : "s"}`,
    example: "Example",
    never: "No import recorded yet",
    neverDesc: "Run the importer to populate the dashboard.",
    issueCodes: {
      "no-attendance": "The attendance file had no rows",
      "no-sales": "The sales file had no rows",
      "attendance-unparseable-date": "Unreadable shift times",
      "duplicate-shift": "Same operator twice on one day — likely a double import",
      "invalid-shift-window": "Shift ends before it starts",
      "implausible-shift-length": "Very long shifts — check for a missing clock-out",
      "sale-unparseable-date": "Unreadable sale timestamps",
      "invalid-amount": "Zero, negative or non-numeric amounts",
      "unknown-employee": "Sales with no matching operator — revenue is lost",
      "duplicate-sale": "Identical sale rows — possibly double-counted",
      "implausible-amount": "Unusually large single sales",
      "sale-far-outside-shift": "Sales far from any shift — check the clock before treating as fraud",
      "future-date": "Days in the future",
      "already-imported": "Days that already existed and were overwritten",
      "missing-days": "Gaps in the calendar — those days have no data",
    } as Record<string, string>,
  },

  errors: {
    dataTitle: "Couldn't load operational data",
    dataDesc:
      "The dashboard could not read from Firestore. If this is a free-tier project, the daily read quota may be exhausted — it resets at midnight Pacific. Otherwise, check the server logs.",
    noMatch: (subject: string) => `No ${subject} match the current filters`,
    noMatchDesc: (subject: string) =>
      `Widen the scope above to bring ${subject} back into view.`,
  },

  search: {
    placeholder: "Search operators, pages…",
    dialogPlaceholder: "Search operators or jump to a page…",
    noResults: "No results found.",
    pages: "Pages",
    operators: "Operators",
  },

  languages: {
    az: "Azərbaycanca",
    ru: "Русский",
    en: "English",
    switch: "Change language",
  },
}

/**
 * No `as const`: literal types would make every translation a type error,
 * since "Dashboard" is not assignable to the literal type `"Dashboard"`.
 * Widened strings still catch missing and misspelled keys, which is the point.
 */
export type Dictionary = typeof en
