import type { Dictionary } from "@/lib/i18n/en"

/** Azerbaijani. Typed against `en`, so a missing key fails the build. */
export const az: Dictionary = {
  brand: {
    name: "SOCAR SASIS",
    tagline: "Xəbərdarlıq və Dürüstlük Mərkəzi",
    systemOnline: "Sistem işləyir",
  },

  nav: {
    sectionIntegrity: "Monitorinq",
    alerts: "Xəbərdarlıqlar",
    workers: "İşçilər",
    wall: "Xəbərdarlıq lövhəsi",
  },

  common: {
    previousPage: "Əvvəlki",
    nextPage: "Növbəti",
    perPage: (n: number) => `səhifədə ${n}`,
    showingRange: (from: number, to: number, total: number) =>
      `${total} nəticədən ${from}–${to}`,
    station: "Stansiya",
    department: "Şöbə",
    shift: "Növbə",
    operator: "İşçi",
    loading: "Yüklənir…",
    tryAgain: "Yenidən cəhd edin",
    search: "Axtarış",
    reset: "Sıfırla",
    operationalDay: "İş günü",
    previousDay: "Əvvəlki gün",
    nextDay: "Növbəti gün",
    allStations: "Bütün stansiyalar",
    allDepartments: "Bütün şöbələr",
    allShifts: "Bütün növbələr",
    weekdays: ["B.", "B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş."],
  },

  shifts: {
    Morning: "Səhər",
    Evening: "Axşam",
    Night: "Gecə",
  },

  roles: {
    admin: "Administrator",
    supervisor: "Regional nəzarətçi",
    manager: "Stansiya rəhbəri",
    staff: "İşçi",
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

  alerts: {
    title: "Xəbərdarlıq mərkəzi",
    description:
      "Yalnız verilənlər bazasının sübut edə bildikləri — çatışmayan toxunuşlar və növbədən kənar satışlar.",
    totalFlagged: "Xəbərdarlıqlar",
    workersAffected: "İşçilər",
    amountInvolved: "Cəlb olunan məbləğ",
    worstDay: "Ən ağır gün",
    searchPlaceholder: "İşçi, kart və ya stansiya…",
    clearSearch: "Axtarışı təmizlə",
    severityFilter: "Dərəcə üzrə filtr",
    severityAll: "Bütün dərəcələr",
    severity: {
      high: "Yüksək",
      medium: "Orta",
      low: "Aşağı",
    },
    colWhen: "Vaxt",
    colWhat: "Bazanın göstərdiyi",
    colAmount: "Məbləğ",
    incidentLog: "İnsident jurnalı",
    incidentLogDesc:
      "Ən yenilər əvvəl · hər sətir xam cədvəllərdə yoxlanıla bilər",
    noneDetected: "Bu dövrdə xəbərdarlıq yoxdur",
    noneDetectedDesc:
      "Hər toxunuş cütlənib və hər satış işçinin toxunuş pəncərəsi daxilindədir.",
    liveFeed: "Canlı axın",
    liveFeedLog: "Canlı axın jurnalı",
    liveFeedEmpty: "Hələ heç nə yoxdur — axını yandırın, hadisələr burada görünəcək.",
    liveFeedError: "sorğu alınmadı",
    liveFeedLastCheck: "yoxlanıb",
    types: {
      missingOut: "Giriş var, çıxış yoxdur",
      missingIn: "Çıxış var, giriş yoxdur",
      doubleTapIn: "Giriş iki dəfə vurulub",
      doubleTapOut: "Çıxış iki dəfə vurulub",
      saleOffClock: "Toxunuş pəncərəsindən kənar satış",
      noTapsSales: "Heç toxunuş olmadan satışlar",
    },
  },

  workers: {
    title: "İşçilər",
    description:
      "İşçi üzrə iştirak və satışlar — kim nə vaxt giriş edib, nə vaxt çıxıb və fobu nə satıb.",
    searchPlaceholder: "Ad, kart və ya stansiya…",
    clearSearch: "Axtarışı təmizlə",
    colWorker: "İşçi",
    colInOut: "Giriş → Çıxış",
    colHours: "Saat",
    colSales: "Satışlar",
    colLitres: "Litr",
    colRevenue: "Gəlir",
    colTime: "Vaxt",
    colGrade: "Yanacaq",
    colAmount: "Məbləğ",
    onDuty: "Növbədə",
    tapsMissing: "Çatışmayan toxunuşlar",
    noWorkers: "Bu gündə işçi yoxdur",
    noWorkersDesc:
      "Bu iş günü üçün heç bir toxunuş və ya satış qeydə alınmayıb.",
    absentTitle: "Bu gün növbədə olmayıb",
    absentDesc: "Bu işçi üçün bu gün heç bir toxunuş və satış qeydə alınmayıb.",
    backToWorkers: "Bütün işçilər",
    timeline: "Gün, bir ox üzərində",
    timelineDesc:
      "Yuxarıda: iştirak, toxunuşların dediyi kimi. Aşağıda: satışlar 15 dəqiqəlik zolaqlara yığılıb, aparıcı yanacağa görə rənglənib (rəqəmlər üçün üzərinə gəlin) — qırmızı işarələr iştirak zolağından kənar satışlardır.",
    presence: "İştirak",
    offClock: "Növbədən kənar",
    salesTitle: "Satışlar",
    noSales: "Bu gün satış qeydə alınmayıb.",
    tapsTitle: "Toxunuşlar",
    tapsDesc: "Xam check_time / check_type sətirləri, ardıcıllıqla.",
    noTaps: "Bu gün toxunuş qeydə alınmayıb.",
    tapIn: "GİRİŞ",
    tapOut: "ÇIXIŞ",
  },

  wall: {
    title: "Xəbərdarlıq lövhəsi",
    alertsToday: "bu gün xəbərdarlıq",
    missingTaps: "çatışmayan toxunuş",
    clearStations: "təmiz stansiya",
    alertsShort: "bu gün",
    missingShort: (n: number) => `${n} toxunuş çatışmır`,
    highShort: (n: number) => `${n} yüksək dərəcəli`,
    status: {
      clear: "Təmiz",
      attention: "Diqqət",
      critical: "Kritik",
    },
    notLive: "Gündə bir dəfə yüklənir — canlı yayım deyil.",
    stale: "Məlumat köhnəlib",
    ageHours: (n: number) => `${n} saat əvvəl`,
    ageDays: (n: number) => `${n} gün əvvəl`,
    latestTitle: "Son aşkarlamalar",
    noEvents: "Son gündə aşkarlama yoxdur.",
  },

  errors: {
    dataTitle: "Əməliyyat məlumatlarını yükləmək mümkün olmadı",
    dataDesc:
      "Tətbiq Firestore-dan oxuya bilmədi. Bu pulsuz tarif layihəsidirsə, günlük oxuma limiti tükənmiş ola bilər — Sakit okean vaxtı ilə gecə yarısı sıfırlanır. Əks halda server jurnallarını yoxlayın.",
  },

  search: {
    placeholder: "İşçi, səhifə axtar…",
    dialogPlaceholder: "İşçi axtarın və ya səhifəyə keçin…",
    noResults: "Nəticə tapılmadı.",
    pages: "Səhifələr",
    workers: "İşçilər",
  },

  theme: {
    switch: "Görünüş",
    light: "İşıqlı",
    dark: "Qaranlıq",
    system: "Sistem",
  },
  credit: {
    developedBy: "Hazırlayan",
    author: "Nihat Shikhizada",
  },
  languages: {
    az: "Azərbaycanca",
    ru: "Русский",
    en: "English",
    switch: "Dili dəyiş",
  },
}
