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
    cases: "Hallar",
    staffing: "İşçi sayı",
    boardPack: "Hesabat",
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
    fair: {
      title: "\u018fdal\u0259tli reytinq",
      subtitle:
        "H\u0259r k\u0259s \u00f6z stansiyas\u0131n\u0131n v\u0259 n\u00f6vb\u0259sinin adi g\u00f6st\u0259ricisi il\u0259 m\u00fcqayis\u0259 olunur \u2014 b\u00fct\u00fcn \u015f\u0259b\u0259k\u0259 il\u0259 yox.",
      why: "N\u0259 d\u0259yi\u015fdi",
      whyBody:
        "G\u0259lir\u0259 g\u00f6r\u0259 s\u0131ralama i\u015f\u0259 deyil, i\u015f yerin\u0259 g\u00f6r\u0259 qiym\u0259t verirdi. Magistral stansiya regional stansiyan\u0131 h\u0259r g\u00fcn \u00fcst\u0259l\u0259yir, gec\u0259 n\u00f6vb\u0259si is\u0259 he\u00e7 vaxt yer ala bilmirdi. \u0130ndi h\u0259r k\u0259s \u00f6z n\u00f6vb\u0259sinin median g\u00fcn\u00fc il\u0259 m\u00fcqayis\u0259 olunur.",
      percentOfExpected: "G\u00f6zl\u0259nil\u0259n\u0259 nisb\u0259t\u0259n %",
      expected: "G\u00f6zl\u0259nil\u0259n",
      actual: "Faktiki",
      overWindow: (n: number) => `${n} g\u00fcn \u0259rzind\u0259`,
      mostImproved: "\u018fn \u00e7ox ir\u0259lil\u0259y\u0259nl\u0259r",
      mostImprovedDesc:
        "D\u00f6vr\u00fcn birinci v\u0259 ikinci yar\u0131s\u0131 aras\u0131nda \u0259n b\u00f6y\u00fck art\u0131m \u2014 nisb\u0259t bal\u0131 il\u0259 \u00f6l\u00e7\u00fcl\u00fcr, ona g\u00f6r\u0259 sakit stansiyada ir\u0259lil\u0259yi\u015f d\u0259 eyni d\u0259y\u0259r\u0259 malikdir.",
      noImproved: "Bu d\u00f6vrd\u0259 aydın ir\u0259lil\u0259yi\u015f yoxdur.",
      improvementPoints: (n: number) => `${n > 0 ? "+" : ""}${n} bal`,
      tierLabel: "Kateqoriya",
      tiers: {
        exceptional: "F\u00f6vq\u0259lad\u0259",
        strong: "G\u00fccl\u00fc",
        expected: "G\u00f6zl\u0259nil\u0259n s\u0259viyy\u0259d\u0259",
        below: "G\u00f6zl\u0259nil\u0259nd\u0259n a\u015fa\u011f\u0131",
        "needs-support": "D\u0259st\u0259k laz\u0131md\u0131r",
      },
      tierNote:
        "Kateqoriyalar n\u00f6vb\u0259nin normas\u0131na g\u00f6r\u0259 n\u0259tic\u0259ni g\u00f6st\u0259rir. \u201cG\u00f6zl\u0259nil\u0259nd\u0259n a\u015fa\u011f\u0131\u201d s\u0259y haqq\u0131nda h\u00f6km deyil \u2014 s\u0259b\u0259bini soru\u015fmaq \u00fc\u00e7\u00fcn i\u015far\u0259dir: s\u0131nm\u0131\u015f nasos, yeni i\u015f\u00e7i v\u0259 ya s\u0259hv g\u00f6zl\u0259nti.",
      rawNote: "\u00dcmumi g\u0259lir yaln\u0131z kontekst \u00fc\u00e7\u00fcnd\u00fcr. S\u0131ralamaya t\u0259sir etmir.",
    },
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

  cases: {
    title: "Fırıldaq halları",
    description:
      "Aşkarlama qaydalarının baxış üçün təklif etdiyi hallar. Qaydanın işə düşməsi baxmaq üçün səbəbdir, nəticə deyil.",
    queue: "Baxış növbəsi",
    queueDesc: "Əvvəlcə açıq işlər, sonra çəkiyə görə.",
    openCases: "Açıq",
    investigating: "Araşdırılır",
    closed: "Bağlanmış",
    noCases: "Açıq hal yoxdur",
    noCasesDesc:
      "Heç bir operator kifayət qədər ayrı gündə kifayət qədər qaydanı pozmayıb.",
    proposed: "Sistem təklifi",
    proposedNote: "Qaydalar tərəfindən təklif olunub — nəticə deyil.",
    score: "Çəki",
    flaggedDays: "İşarələnmiş günlər",
    window: "Dövr",
    rulesTripped: "Pozulan qaydalar",
    daysCount: (n: number) => `${n} gün`,
    openCase: "Halı aç",
    backToCases: "Hallara qayıt",
    assignedTo: "Məsul şəxs",
    unassigned: "Təyin edilməyib",
    assignToMe: "Mənə təyin et",
    statusLabel: "Status",
    noteLabel: "Baxış qeydləri",
    notePlaceholder: "Nəyi yoxladınız və hansı nəticəyə gəldiniz?",
    save: "Yadda saxla",
    saved: "Yadda saxlanıldı",
    timeline: "Hal tarixçəsi",
    timelineDesc: "Yalnız əlavə olunur. Hər dəyişiklik saxlanılır.",
    noTimeline: "Hələ dəyişiklik qeydə alınmayıb.",
    evidence: "Sübutlar",
    evidenceDesc:
      "Kameradan baxılacaq dəqiq vaxt aralıqları — hal ilə birlikdə yaradılır ki, heç kim onları yenidən hesablamasın.",
    cctvWindow: "Kamera aralığı",
    noEvidence: "Bu qayda üçün vaxt aralığı qeydə alınmayıb.",
    observed: "Müşahidə olunan",
    baseline: "Normal",
    amounts: "Məbləğlər",
    viewDay: "Bu günə bax",
    fairnessTitle: "Addım atmazdan əvvəl",
    fairnessBody:
      "Bu qaydalar kassa məlumatlarındakı təkrarlanan davranışı ölçür, niyyəti yox. Təkrarın günahsız izahı ola bilər — sınmış nasos, sürüşmüş saat, daimi müştəri. Nəticə yazmadan əvvəl görüntülərə baxın və şəxslə danışın.",
    needsSupervisorHint:
      "Halı yalnız nəzarətçi və ya admin bağlaya bilər. Öz komandasını qiymətləndirən stansiya rəhbərinin maraqlar toqquşması var.",
    noteRequiredHint:
      "Fırıldağı təsdiqləmək üçün ən azı 10 simvoldan ibarət yazılı əsaslandırma tələb olunur.",
    statusOpen: "Açıq",
    statusInvestigating: "Araşdırılır",
    statusConfirmed: "Təsdiqlənib",
    statusExplained: "İzah olunub",
    statusDismissed: "Rədd edilib",
    errors: {
      notSignedIn: "Sessiyanızın vaxtı bitdi. Yenidən daxil olun.",
      notAllowed: "Bu halı dəyişməyə icazəniz yoxdur.",
      badRequest: "Sorğuda nəyinsə çatışmır.",
      badStatus: "Bu, düzgün status deyil.",
      needsSupervisor: "Halı yalnız nəzarətçi və ya admin bağlaya bilər.",
      noteRequired: "Fırıldağı təsdiqləməzdən əvvəl nə tapdığınızı yazın.",
      notFound: "Bu hal artıq mövcud deyil.",
    },
    rules: {
      afterHours: "Növbədən kənar satışlar",
      lateClose: "Çıxışdan sonrakı satışlar",
      shiftEndBurst: "Növbə sonunda sıxlıq",
      duplicateAmounts: "Təkrarlanan eyni məbləğlər",
      roundAmount: "Həddindən artıq yuvarlaq məbləğ",
      velocityOutlier: "Həmkarlardan çox fərqli sürət",
      deadHours: "Demək olar ki, satışsız saatlar",
    },
    ruleHelp: {
      afterHours: "Bu şəxs növbədə olmadığı vaxt qeydə alınmış əməliyyatlar.",
      lateClose: "Çıxış etdikdən sonra qeydə alınmış əməliyyatlar.",
      shiftEndBurst:
        "Növbənin son dəqiqələrində qeyri-adi satış sıxlığı.",
      duplicateAmounts:
        "Qısa aralıqda təkrarlanan eyni məbləğ — təkrar istifadə olunmuş qəbzin mümkün əlaməti.",
      roundAmount:
        "Eyni stansiyadakı həmkarlardan xeyli çox yuvarlaq məbləğli satış.",
      velocityOutlier:
        "Satış sürəti həmkarların medianından çox uzaqdır. Tək başına bu, sübut deyil — sürətli operator sadəcə sürətlidir.",
      deadHours:
        "Demək olar ki, gəlir gətirməyən uzun aralıqlar. Adətən sınmış nasos və ya sakit stansiya, oğurluq yox.",
    },
  },

  staffing: {
    title: "\u0130\u015f\u00e7i say\u0131 v\u0259 y\u00fckl\u0259nm\u0259",
    description:
      "\u018fhat\u0259 il\u0259 t\u0259l\u0259bin uy\u011fun g\u0259ldiyi v\u0259 g\u0259lm\u0259diyi yerl\u0259r. H\u0259ft\u0259nin saatlar\u0131 \u00fczr\u0259 operator-saat\u0131na d\u00fc\u015f\u0259n g\u0259lir.",
    heatmap: "Operator-saat\u0131na t\u0259l\u0259b",
    heatmapDesc:
      "Daha t\u00fcnd r\u0259ng n\u00f6vb\u0259d\u0259ki h\u0259r operatorun daha \u00e7ox i\u015f g\u00f6rd\u00fcy\u00fcn\u00fc bildirir. Bu, n\u0259 q\u0259d\u0259r m\u00fc\u015ft\u0259ri g\u0259ldiyini \u0259ks etdirir, kimins\u0259 n\u0259 q\u0259d\u0259r \u00e7al\u0131\u015fd\u0131\u011f\u0131n\u0131 yox.",
    networkLabel: "B\u00fct\u00fcn \u015f\u0259b\u0259k\u0259",
    perOperatorHour: "operator-saat\u0131na",
    onShift: "n\u00f6vb\u0259d\u0259",
    noData: "Profil qurmaq \u00fc\u00e7\u00fcn kifay\u0259t q\u0259d\u0259r m\u0259lumat yoxdur.",
    suggestions: "Diqq\u0259t\u0259 layiq",
    suggestionsDesc:
      "Ba\u015fqa g\u00fcnl\u0259rd\u0259ki EYN\u0130 saatdan k\u0259skin f\u0259rql\u0259n\u0259n saatlar. H\u0259ft\u0259lik ortalama il\u0259 m\u00fcqayis\u0259 sad\u0259c\u0259 \u201cgec\u0259l\u0259r sakitdir\u201d dey\u0259rdi \u2014 do\u011frudur, lakin 24 saatl\u0131q stansiya bununla ba\u011fl\u0131 he\u00e7 n\u0259 ed\u0259 bilm\u0259z.",
    noSuggestions: "\u018fhat\u0259 t\u0259l\u0259b\u0259 uy\u011fundur. D\u0259yi\u015fiklik laz\u0131m deyil.",
    stretched: "Y\u00fckl\u0259nib",
    idle: "Art\u0131q \u0259hat\u0259",
    stretchedDesc: (x: number) => `bu saat \u00fc\u00e7\u00fcn adi s\u0259viyy\u0259nin ${x} misli`,
    idleDesc: (x: number) => `bu saat \u00fc\u00e7\u00fcn adi s\u0259viyy\u0259nin ${x} misli`,
    usualAt: (v: number) => `ad\u0259t\u0259n ${v}`,
    busiest: "\u018fn y\u00fckl\u00fc saat",
    quietest: "\u018fn sakit saat",
    median: "Adi s\u0259viyy\u0259",
    caveat:
      "\u018fhat\u0259 yaln\u0131z g\u0259lirl\u0259 ba\u011fl\u0131 deyil. Gec\u0259 n\u00f6vb\u0259l\u0259ri t\u0259hl\u00fck\u0259sizlik v\u0259 t\u0259k i\u015fl\u0259m\u0259 qaydalar\u0131na g\u00f6r\u0259 m\u00f6vcuddur v\u0259 bu g\u00f6r\u00fcn\u00fc\u015f onlar haqq\u0131nda he\u00e7 n\u0259 bilmir.",
    weekdays: ["B.", "B.e.", "\u00c7.a.", "\u00c7.", "C.a.", "C.", "\u015e."],
  },

  boardPack: {
    title: "Ayl\u0131q idar\u0259 hey\u0259ti hesabat\u0131",
    description: "Ay \u00fczr\u0259 bir s\u0259hif\u0259 \u2014 \u00e7ap etm\u0259y\u0259 v\u0259 ya PDF kimi saxlamağa haz\u0131rd\u0131r.",
    print: "\u00c7ap et / PDF kimi saxla",
    generatedOn: (d: string) => `${d} tarixind\u0259 haz\u0131rlan\u0131b`,
    period: "D\u00f6vr",
    scopeNetwork: "B\u00fct\u00fcn \u015f\u0259b\u0259k\u0259",
    headline: "\u018fsas g\u00f6st\u0259ricil\u0259r",
    revenue: "G\u0259lir",
    transactions: "\u018fm\u0259liyyatlar",
    operators: "Operatorlar",
    perStation: "Stansiyalar \u00fczr\u0259",
    station: "Stansiya",
    days: "G\u00fcn",
    dailyAverage: "G\u00fcnl\u00fck orta",
    integrity: "\u0130tkil\u0259rin qar\u015f\u0131s\u0131n\u0131n al\u0131nmas\u0131",
    integrityDesc:
      "Qaydalar\u0131n t\u0259klif etdiyi hallar v\u0259 insanlar\u0131n g\u0259ldiyi n\u0259tic\u0259l\u0259r. T\u0259klif n\u0259tic\u0259 demək deyil.",
    casesOpen: "Bax\u0131\u015f g\u00f6zl\u0259yir",
    casesInvestigating: "Ara\u015fd\u0131r\u0131l\u0131r",
    casesConfirmed: "T\u0259sdiql\u0259nib",
    casesExplained: "\u0130zah olunub",
    casesDismissed: "R\u0259dd edilib",
    outstanding: "H\u0259l\u0259 q\u0259rar g\u00f6zl\u0259yir",
    noOutstanding: "B\u00fct\u00fcn hallara bax\u0131l\u0131b.",
    people: "\u018fm\u0259kda\u015flar",
    topPerformers: "\u018fn yax\u015f\u0131 n\u0259tic\u0259l\u0259r",
    topPerformersDesc:
      "\u00d6z stansiyas\u0131n\u0131n v\u0259 n\u00f6vb\u0259sinin adi g\u00f6st\u0259ricisi il\u0259 m\u00fcqayis\u0259 olunur \u2014 yəni r\u0259q\u0259m i\u015f yerini deyil, i\u015fi \u0259ks etdirir.",
    improved: "\u018fn \u00e7ox ir\u0259lil\u0259y\u0259nl\u0259r",
    rota: "N\u00f6vb\u0259 c\u0259dv\u0259li",
    rotaDesc: "Ba\u015fqa g\u00fcnl\u0259rd\u0259ki eyni saatdan f\u0259rql\u0259n\u0259n saatlar.",
    noRota: "\u018fhat\u0259 t\u0259l\u0259b\u0259 uy\u011fun olub.",
    dataHealth: "M\u0259lumat keyfiyy\u0259ti",
    dataHealthDesc:
      "Yuxar\u0131dak\u0131 r\u0259q\u0259ml\u0259ri d\u00fczg\u00fcn qiym\u0259tl\u0259ndirm\u0259k \u00fc\u00e7\u00fcn g\u00f6st\u0259rilir. Taml\u0131\u011f\u0131 bildirilm\u0259y\u0259n r\u0259q\u0259ml\u0259r yoxlan\u0131lmam\u0131\u015f q\u0259rarlara aparır.",
    daysCovered: (a: number, b: number) => `${b} g\u00fcnd\u0259n ${a}-i y\u00fckl\u0259nib`,
    complete: "Tam ay",
    incomplete: "Natamam ay \u2014 a\u015fa\u011f\u0131dak\u0131 c\u0259ml\u0259r yaln\u0131z y\u00fckl\u0259n\u0259n g\u00fcnl\u0259ri \u0259hat\u0259 edir",
    lastImport: "Son y\u00fckl\u0259m\u0259",
    warningsTitle: "Y\u00fckl\u0259m\u0259 zaman\u0131 qeyd\u0259 al\u0131n\u0131b",
    noWarnings: "Y\u00fckl\u0259m\u0259 zaman\u0131 problem qeyd\u0259 al\u0131nmay\u0131b.",
    confidential:
      "M\u0259xfidir. Ad\u0131 \u00e7\u0259kil\u0259n \u0259m\u0259kda\u015flar haqq\u0131nda m\u0259lumat ehtiva edir.",
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

  dataHealth: {
    title: "Məlumat vəziyyəti",
    description: "Son idxal və orada yoxlanmalı olanlar.",
    lastImport: "Son idxal",
    source: "Mənbə",
    days: "Günlər",
    shifts: "Növbələr",
    sales: "Satışlar",
    stations: "Stansiyalar",
    workers: "İşçilər",
    clean: "Təmiz idxal edildi",
    cleanDesc: "Son idxalda problem tapılmadı.",
    errors: (n: number) => `${n} xəta`,
    warnings: (n: number) => `${n} xəbərdarlıq`,
    affectedRows: (n: number) => `${n} sətir`,
    example: "Nümunə",
    never: "Hələ idxal qeydə alınmayıb",
    neverDesc: "Paneli doldurmaq üçün idxalı işə salın.",
    issueCodes: {
      "no-attendance": "Davamiyyət faylında sətir yox idi",
      "no-sales": "Satış faylında sətir yox idi",
      "attendance-unparseable-date": "Oxunmayan növbə vaxtları",
      "duplicate-shift": "Eyni operator bir gündə iki dəfə — çox güman ikiqat idxal",
      "invalid-shift-window": "Növbə başlamazdan əvvəl bitir",
      "implausible-shift-length": "Çox uzun növbələr — çıxış qeydinin olmamasını yoxlayın",
      "sale-unparseable-date": "Oxunmayan satış vaxt möhürləri",
      "invalid-amount": "Sıfır, mənfi və ya rəqəm olmayan məbləğlər",
      "unknown-employee": "Uyğun operatoru olmayan satışlar — gəlir itir",
      "duplicate-sale": "Eyni satış sətirləri — ehtimal ki, ikiqat sayılıb",
      "implausible-amount": "Qeyri-adi böyük tək satışlar",
      "sale-far-outside-shift": "Növbədən çox uzaq satışlar — fırıldaq saymadan saatı yoxlayın",
      "future-date": "Gələcək tarixlər",
      "already-imported": "Artıq mövcud olan və üzərinə yazılan günlər",
      "missing-days": "Təqvimdə boşluqlar — həmin günlərdə heç bir məlumat yoxdur",
    } as Record<string, string>,
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
