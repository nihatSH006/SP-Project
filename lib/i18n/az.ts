import type { Dictionary } from "@/lib/i18n/en"

/** Azerbaijani. Typed against `en`, so a missing key fails the build. */
export const az: Dictionary = {
  brand: {
    name: "SOCAR SASIS",
    tagline: "Satış və Kadr İntellekti",
    systemOnline: "Sistem işləyir",
  },

  nav: {
    sectionAnalysis: "Təhlil",
    sectionAdmin: "İdarəetmə",
    dashboard: "İdarə paneli",
    operators: "Operatorlar",
    leaderboard: "Reytinq",
    stations: "Stansiyalar",
    alerts: "Xəbərdarlıqlar",
    settings: "Parametrlər",
  },

  common: {
    revenue: "Gəlir",
    transactions: "Əməliyyatlar",
    operators: "Operatorlar",
    station: "Stansiya",
    stations: "Stansiyalar",
    department: "Şöbə",
    departments: "Şöbələr",
    shift: "Növbə",
    shifts: "Növbələr",
    hours: "Saat",
    sales: "Satışlar",
    attendance: "Davamiyyət",
    productivity: "Məhsuldarlıq",
    score: "Bal",
    grade: "Qiymət",
    risk: "Risk",
    health: "Vəziyyət",
    rank: "Sıra",
    operator: "Operator",
    controller: "Nəzarətçi",
    all: "Hamısı",
    none: "yoxdur",
    perHour: "AZN/saat",
    azn: "AZN",
    of: "/",
    loading: "Yüklənir…",
    tryAgain: "Yenidən cəhd edin",
    search: "Axtarış",
    reset: "Sıfırla",
    scope: "Əhatə",
    operationalDay: "İş günü",
    previousDay: "Əvvəlki gün",
    nextDay: "Növbəti gün",
    allStations: "Bütün stansiyalar",
    allDepartments: "Bütün şöbələr",
    allShifts: "Bütün növbələr",
  },

  shifts: {
    Morning: "Səhər",
    Evening: "Axşam",
    Night: "Gecə",
  },

  risk: {
    LOW: "Aşağı",
    MEDIUM: "Orta",
    HIGH: "Yüksək",
  },

  roles: {
    admin: "Administrator",
    supervisor: "Regional nəzarətçi",
    manager: "Stansiya rəhbəri",
    staff: "Operator",
  },

  auth: {
    signIn: "Daxil ol",
    signingIn: "Daxil olunur…",
    signOut: "Çıxış",
    signingOut: "Çıxılır…",
    workEmail: "İş e-poçtu",
    password: "Şifrə",
    showPassword: "Şifrəni göstər",
    hidePassword: "Şifrəni gizlət",
    internalOnly: "Daxili sistem — yalnız səlahiyyətli işçilər üçün.",
    sessionNote: "Sessiya 8 saatdan sonra bitir — bir növbə.",
    account: "Hesab",
    profile: "Profil",
    signedInAs: (email: string) => `${email} kimi daxil olmusunuz`,
    allStations: "Bütün stansiyalar",
    errors: {
      badCredentials: "E-poçt və ya şifrə yanlışdır.",
      disabled: "Bu hesab deaktiv edilib. Administratorla əlaqə saxlayın.",
      tooMany: "Çox cəhd edildi. Bir neçə dəqiqə sonra yenidən cəhd edin.",
      network: "Şəbəkə xətası. Bağlantınızı yoxlayıb yenidən cəhd edin.",
      generic: "Daxil olmaq mümkün olmadı. Yenidən cəhd edin.",
      noSession: "Sessiya başlatmaq mümkün olmadı.",
    },
  },

  dashboard: {
    title: "Əməliyyat paneli",
    description:
      "İş günü üzrə şəbəkə miqyasında satış, kadr və risk icmalı.",
    reviewAlerts: "Xəbərdarlıqlara bax",
    totalRevenue: "Ümumi gəlir",
    targetProgress: (pct: number, target: string) =>
      `Günlük ${target} AZN hədəfinin ${pct}%-i`,
    noTarget: "Gəlir hədəfi təyin edilməyib",
    completedSales: "tamamlanmış yanacaq satışı",
    operatorsOnDuty: "Növbədə olan operatorlar",
    acrossStations: (n: number) => `${n} stansiya üzrə`,
    avgProductivity: "Orta məhsuldarlıq",
    revenuePerHour: "iş saatı başına gəlir",
    aboveTarget: "hədəfdən yuxarı",
    nearTarget: "hədəfə yaxın",
    belowTarget: "hədəfdən aşağı",
    openAlerts: "Açıq xəbərdarlıqlar",
    allClear: "hər şey qaydasındadır",
    needsReview: "baxılmalıdır",

    dailyTarget: "Günlük gəlir hədəfi",
    progressToward: (target: string) => `${target} AZN hədəfinə doğru`,
    setTargetsPrompt:
      "İrəliləyişi izləmək üçün Parametrlərdə hədəf təyin edin",
    targetExceeded: "Hədəf aşıldı.",
    remainingToTarget: (amount: string) =>
      `Bugünkü hədəfə çatmaq üçün ${amount} AZN qalıb.`,
    noTargetLong:
      "Hədəf təyin edilməyib — administrator Parametrlərdə hər stansiya üçün hədəf qoya bilər.",
    operationalHealth: "Əməliyyat vəziyyəti",
    healthStable: "Sabit — ciddi insident yükü yoxdur",
    healthMonitor: "Nəzarətdə saxlayın — insident yükü artır",
    healthDegraded: "Pisləşib — rəhbərliyin baxışı tövsiyə olunur",

    workforceRisk: "Kadr riski",
    workforceRiskDesc: "Risk təsnifatı üzrə operatorlar",
    operatorCount: (n: number) => `${n} operator`,

    highlights: "Bugünkü göstəricilər",
    highlightsDesc: "Cari kəsimdə ən yaxşı nəticələr",
    topOperator: "Ən yaxşı operator",
    bestStation: "Ən yaxşı stansiya",
    bestDepartment: "Ən yaxşı şöbə",
    avgRevenuePerOperator: "Operator başına orta gəlir",
    highRiskOperators: "Yüksək riskli operatorlar",

    revenueThroughDay: "Gün ərzində gəlir",
    hourlyRevenue: "Saatlıq yanacaq satışı gəliri, AZN",
    revenueByStation: "Stansiyalar üzrə gəlir",
    totalPerStation: "Stansiya üzrə ümumi AZN",
    revenueByDepartment: "Şöbələr üzrə gəlir",
    totalPerDepartment: "Şöbə üzrə ümumi AZN",
    shiftCoverage: "Növbə əhatəsi",
    operatorsPerShift: "Növbə üzrə operatorlar",
    onDuty: "növbədə",

    top5: "İlk 5 operator",
    top5Desc: "Gəlirə, sonra məhsuldarlığa görə sıralanıb",
    fullRanking: "Tam sıralama",

    executiveBrief: "Rəhbərlik üçün icmal",
    executiveBriefDesc: "Bugünkü məlumatlar əsasında avtomatik hazırlanıb",
    briefLine1: (revenue: string, transactions: number) =>
      `Bu gün şəbəkə ${transactions} əməliyyat üzrə ${revenue} AZN gəlir əldə etdi`,
    briefTargetPart: (pct: number) =>
      ` — günlük gəlir hədəfinin ${pct}%-i.`,
    briefNoTargetPart: ", gəlir hədəfi təyin edilməyib.",
    briefLine2: (
      leader: string,
      amount: string,
      station: string,
      department: string
    ) =>
      `${leader} ${amount} AZN ilə öndədir; ${station} ən güclü stansiya, ${department} isə ən güclü şöbədir.`,
    briefLine3: (productivity: string, attendance: number) =>
      `Orta məhsuldarlıq saatda ${productivity} AZN, davamiyyət ${attendance}%-dir.`,
    briefNoAlerts: "Şübhəli fəaliyyət aşkar edilmədi.",
    briefAlerts: (n: number) =>
      `${n} şübhəli əməliyyat növbə bitməzdən əvvəl yoxlanılmalıdır.`,
    targetExceededShort: "Gəlir hədəfi aşıldı",
    targetNearlyShort: "Gəlir hədəfinə demək olar ki, çatıldı",
    targetMissedShort: "Gəlir hədəfinə çatılmadı",

    recentAlerts: "Son xəbərdarlıqlar",
    recentAlertsDesc: "İş saatlarından kənar qeydə alınan satışlar",
    alertCenter: "Xəbərdarlıq mərkəzi",
    noAlerts: "Əməliyyat xəbərdarlığı yoxdur",
    noAlertsDesc:
      "Bu kəsimdəki bütün satışlar operatorun qeydiyyatlı iş saatları daxilindədir.",
  },

  operators: {
    title: "Operatorlar",
    description:
      "Növbədə olan hər operator — performans və risk bir baxışda.",
    inCurrentSlice: "cari kəsimdə",
    transactionsCount: (n: number) => `${n} əməliyyat`,
    perWorkingHour: "iş saatı başına",
    againstShift: "8 saatlıq növbəyə nisbətən",
    avgAttendance: "Orta davamiyyət",
    countLabel: (visible: number, total: number) =>
      visible === total
        ? `${total} operator`
        : `${total} operatordan ${visible}-i`,
    clickForProfile: "tam profil üçün ada klikləyin",
    searchPlaceholder: "Ad, stansiya, şöbə axtar…",
    clearSearch: "Axtarışı təmizlə",
    noMatch: (query: string) => `"${query}" üzrə operator tapılmadı`,
    noMatchDesc: "Başqa ad, stansiya və ya şöbə yoxlayın.",
    revenueAzn: "Gəlir (AZN)",
  },

  operatorDetail: {
    title: "Operator profili",
    description: (shift: string) =>
      `${shift} növbəsi üzrə tam performans və risk qiymətləndirməsi.`,
    allOperators: "Bütün operatorlar",
    grade: "qiymət",
    fleetAvg: (value: string) => `şəbəkə ortalaması ${value}`,
    above: "yuxarı",
    below: "aşağı",
    perHourCount: (n: number) => `saatda ${n}`,
    performanceScore: "Performans balı",
    scoreBlend: "davamiyyət + məhsuldarlıq birləşməsi",
    workingHours: "İş saatları",
    ofScheduled: (n: number) => `${n} saatdan`,
    revenueThroughShift: "Növbə ərzində gəlir",
    hourlyBy: (name: string) =>
      `${name} tərəfindən qeydə alınan saatlıq gəlir, AZN`,
    assessment: "Qiymətləndirmə",
    assessmentDesc: "Avtomatik hazırlanmış tövsiyə",
    topTier: "Ən yüksək səviyyəli performans",
    topTierBody: (name: string) =>
      `${name} bu gün ən güclü operatorlardan biridir — əla davamiyyət və yüksək gəlir.`,
    topTierAction:
      "Tövsiyə: bu operatoru qeyd edin və rəhbərlik məsuliyyətlərini nəzərdən keçirin.",
    performingWell: "Yaxşı işləyir",
    performingWellBody: (name: string) =>
      `${name} yaxşı işləyir; bəzi göstəricilər hələ də yaxşılaşa bilər.`,
    performingWellAction:
      "Tövsiyə: müşahidəni davam etdirin və lazım olduqda dəstək göstərin.",
    needsAttention: "Rəhbərliyin diqqətinə ehtiyac var",
    needsAttentionBody: "Performans bu gün gözləniləndən aşağıdır.",
    needsAttentionAction:
      "Tövsiyə: davamiyyət və məhsuldarlığı nəzərdən keçirin, növbəti əməliyyatları izləyin.",
    riskHigh: (n: number) =>
      `${n} şübhəli əməliyyat — dərhal araşdırma tövsiyə olunur.`,
    riskMedium: "Bu operatoru müşahidə altında saxlayın.",
    riskLow: "Əməliyyat problemi aşkar edilmədi.",
    flagged: "İşarələnmiş əməliyyatlar",
    flaggedDesc: (window: string) =>
      `Bu operatorun ${window} iş pəncərəsindən kənar qeydə alınan satışlar`,
  },

  leaderboard: {
    title: "Performans reytinqi",
    description: "Operatorlar gəlirə, sonra məhsuldarlığa görə sıralanıb.",
    revenueChampion: "Gəlir çempionu",
    revenueChampionDesc: "Kəsimdə ən yüksək gəlir",
    productivityChampion: "Məhsuldarlıq çempionu",
    productivityChampionDesc: "İş saatı başına ən çox AZN",
    attendanceChampion: "Davamiyyət çempionu",
    attendanceChampionDesc: "Ən yaxşı növbə saatlarına riayət",
    completeRanking: "Tam sıralama",
    allOperators: (n: number) => `Cari kəsimdə bütün ${n} operator`,
    shiftSuffix: (shift: string) => `${shift} növbəsi`,
  },

  stations: {
    title: "Stansiya performansı",
    description:
      "Regional baxış — stansiya üzrə gəlir, kadr və əməliyyat vəziyyəti.",
    inSlice: "cari kəsimdə",
    regionalRevenue: "Regional gəlir",
    perOperatorHour: "operatorun iş saatı başına",
    avgHealth: "Orta stansiya vəziyyəti",
    stable: "sabit",
    monitor: "nəzarətdə",
    intervention: "müdaxilə tövsiyə olunur",
    bestStation: "Ən yaxşı işləyən stansiya",
    bestStationDesc: "Cari kəsimdə ən yüksək gəlir",
    viewOperators: "Operatorlara bax",
    onDutyCount: (n: number) => `${n} operator növbədə`,
    operatorsTransactions: (ops: number, tx: number) =>
      `${ops} operator · ${tx} əməliyyat`,
    alertsCount: (n: number) => `${n} xəbərdarlıq`,
    stableShort: "Sabit",
    monitorShort: "Nəzarətdə",
    reviewShort: "Baxış tövsiyə olunur",
    comparison: "Stansiya müqayisəsi",
    comparisonDesc: "Stansiya üzrə tam göstəricilər",
  },

  alerts: {
    title: "Xəbərdarlıq mərkəzi",
    description:
      "Şübhəli əməliyyatlar — operatorun iş saatlarından kənar qeydə alınan satışlar.",
    flaggedTransactions: "İşarələnmiş əməliyyatlar",
    inSlice: "cari kəsimdə",
    highPriority: "Yüksək prioritet",
    twoPlusFlagged: "2+ işarələnmiş satış",
    mediumPriority: "Orta prioritet",
    oneFlagged: "1 işarələnmiş satış",
    clearOperators: "Təmiz operatorlar",
    noFlagged: "işarələnmiş satış yoxdur",
    incidentLog: "İnsident jurnalı",
    incidentLogDesc:
      "Ən yenilər əvvəl · tam profil üçün operatora klikləyin",
    noneDetected: "Şübhəli əməliyyat aşkar edilmədi",
    noneDetectedDesc:
      "Bu kəsimdəki bütün satışlar operatorun qeydiyyatlı iş saatları daxilindədir.",
    recommendedActions: "Tövsiyə olunan addımlar",
    standardProcedure: "Standart insident proseduru",
    noAction: "Heç bir tədbir tələb olunmur.",
    noActionDesc:
      "Cari kəsimdəki bütün satışlar operatorların qeydiyyatlı iş saatları daxilindədir.",
    generated: (alerts: number, ops: number) =>
      `Bugünkü əməliyyatlar ${ops} operator üzrə ${alerts} işarələnmiş əməliyyat yaratdı.`,
    beforeEndOfDay: "İş gününün sonuna qədər:",
    step1: "Hər işarələnmiş əməliyyatı kassa qeydi ilə tutuşdurun.",
    step2: "İşarələnmiş vaxt aralıqları üçün kamera yazılarına baxın.",
    step3: "Operatorun növbə cədvəlini stansiya rəhbəri ilə təsdiqləyin.",
    priorityReview: "Prioritet baxış",
    byPriority: "Prioritet üzrə operatorlar",
    byPriorityDesc:
      "Hər operatorun işarələnmiş satış sayına görə qruplaşdırılıb",
    tabHigh: "Yüksək",
    tabMedium: "Orta",
    tabClear: "Təmiz",
    flaggedSuffix: (n: number) => `${n} işarələnmiş`,
    noHigh: "Yüksək prioritetli operator yoxdur.",
    noMedium: "Orta prioritetli operator yoxdur.",
    noClear: "Təmiz operator yoxdur.",
    outsideHours: "İş saatlarından kənar qeydə alınan satış",
  },

  settings: {
    title: "Parametrlər",
    description:
      "Hər bal, qiymət və risk işarəsinin arxasındakı biznes qaydaları. Burada edilən dəyişikliklər dərhal qüvvəyə minir — developer lazım deyil.",

    scoring: "Balların hesablanması",
    scoringDesc:
      "İş saatları və satış sürəti 0–100 bal sisteminə necə çevrilir. Dəyişikliklər bütün iş günlərinə dərhal tətbiq olunur.",
    scheduledHours: "Planlaşdırılmış növbə müddəti",
    scheduledHoursDesc:
      "Davamiyyət balının məxrəci. Hazırda hamı tam bu qədər işləyir, buna görə davamiyyət 100%-ə yaxındır.",
    productivityTarget: "Məhsuldarlıq hədəfi",
    productivityTargetDesc:
      "Tam bal qazandıran saatlıq AZN. Köhnə sabit 15 dəyəri işlək Bakı stansiyaları üçün nəzərdə tutulmuşdu — artırmaq sakit stansiyalara, azaltmaq isə işlək stansiyalara qarşı ədalətsizdir.",
    graceMinutes: "Gecikməyə güzəşt",
    graceMinutesDesc:
      "Davamiyyət balına təsir etməzdən əvvəl bağışlanan gecikmə.",

    riskThresholds: "Risk hədləri",
    riskThresholdsDesc:
      "Operator nə vaxt ORTA və ya YÜKSƏK risk kimi işarələnir.",
    riskHighSuspicious: "YÜKSƏK risk üçün işarələnmiş satış sayı",
    riskHighSuspiciousDesc:
      "Bir növbədə YÜKSƏK risk yaradan şübhəli satış sayı.",
    riskMediumAttendance: "Bundan aşağı davamiyyət ORTA riskdir",
    riskHighAttendance: "Bundan aşağı davamiyyət YÜKSƏK riskdir",
    riskHighAttendanceDesc: "Orta hədddən aşağı olmalıdır.",

    gradeBoundaries: "Qiymət hədləri",
    gradeBoundariesDesc:
      "Hər qiymət üçün minimal bal. Azalan sırada olmalıdır: A+ > A > B > C.",
    gradeFrom: (grade: string) => `${grade} qiyməti bu baldan`,
    belowC: "C həddindən aşağı olan hər şey D qiymətidir.",

    revenueTargets: "Gəlir hədəfləri",
    revenueTargetsDesc:
      "Hədəfi ölçdüyü gəlirdən çıxaran və buna görə həmişə 87% göstərən köhnə düsturu əvəz edir.",
    targetMode: "Hədəflər necə təyin olunur",
    targetModeDesc:
      "Əl ilə rejimi aşağıdakı rəqəmləri istifadə edir. Baza rejimi hər stansiyanın hədəfini onun öz son günlərindən hesablayır.",
    manualMode: "Stansiya üzrə əl ilə",
    baselineMode: "Stansiyanın öz ortalamasından",
    baselineUplift: "Son ortalamaya əlavə",
    baselineUpliftDesc:
      "1.05 hər stansiyadan öz ortalamasından 5% çox tələb edir.",
    defaultTarget: "Standart günlük hədəf",
    defaultTargetDesc:
      "Aşağıda öz rəqəmi olmayan stansiyalar üçün istifadə olunur.",

    language: "Dil",
    languageDesc: "Dil seçməyən hər kəs üçün standart interfeys dili.",
    defaultLanguage: "Standart dil",
    defaultLanguageDesc: "İstifadəçilər yenə də dəyişə bilər.",

    unsaved: "Yadda saxlanılmamış dəyişikliklər",
    saved: "Yadda saxlanıldı",
    appliesImmediately: "Bütün iş günlərinə dərhal tətbiq olunur.",
    restoreDefaults: "Standart dəyərləri bərpa et",
    save: "Parametrləri yadda saxla",
    saving: "Yadda saxlanılır…",
    savedToast:
      "Parametrlər yadda saxlanıldı — ballar bütün günlər üzrə yeniləndi.",
    restoredToast: "Standart qaydalar bərpa edildi.",
    auditNote:
      "Hər dəyişiklik kimin etdiyi ilə birlikdə qeyd olunur, beləliklə qiymət və risk qərarları yoxlanıla bilir.",

    units: {
      hours: "saat",
      aznPerHour: "AZN/saat",
      min: "dəq",
      sales: "satış",
      pts: "bal",
      azn: "AZN",
      times: "×",
    },
  },

  errors: {
    dataTitle: "Əməliyyat məlumatlarını yükləmək mümkün olmadı",
    dataDesc:
      "Panel Firestore-dan oxuya bilmədi. Bu pulsuz tarif layihəsidirsə, günlük oxuma limiti tükənmiş ola bilər — Sakit okean vaxtı ilə gecə yarısı sıfırlanır. Əks halda server jurnallarını yoxlayın.",
    noMatch: (subject: string) =>
      `Cari filtrlərə uyğun ${subject} tapılmadı`,
    noMatchDesc: (subject: string) =>
      `${subject} yenidən görünməsi üçün yuxarıdakı əhatəni genişləndirin.`,
  },

  search: {
    placeholder: "Operator, səhifə axtar…",
    dialogPlaceholder: "Operator axtarın və ya səhifəyə keçin…",
    noResults: "Nəticə tapılmadı.",
    pages: "Səhifələr",
    operators: "Operatorlar",
  },

  languages: {
    az: "Azərbaycanca",
    ru: "Русский",
    en: "English",
    switch: "Dili dəyiş",
  },
}
