import type { Dictionary } from "@/lib/i18n/en"

/** Russian. Typed against `en`, so a missing key fails the build. */
export const ru: Dictionary = {
  brand: {
    name: "SOCAR SASIS",
    tagline: "Аналитика продаж и персонала",
    systemOnline: "Система работает",
  },

  nav: {
    sectionAnalysis: "Аналитика",
    sectionAdmin: "Администрирование",
    dashboard: "Панель управления",
    operators: "Операторы",
    leaderboard: "Рейтинг",
    stations: "Станции",
    alerts: "Оповещения",
    settings: "Настройки",
    cases: "Дела",
  },

  common: {
    revenue: "Выручка",
    transactions: "Транзакции",
    operators: "Операторы",
    station: "Станция",
    stations: "Станции",
    department: "Отдел",
    departments: "Отделы",
    shift: "Смена",
    shifts: "Смены",
    hours: "Часы",
    sales: "Продажи",
    attendance: "Посещаемость",
    productivity: "Производительность",
    score: "Балл",
    grade: "Оценка",
    risk: "Риск",
    health: "Состояние",
    rank: "Место",
    operator: "Оператор",
    controller: "Контролёр",
    all: "Все",
    none: "нет",
    perHour: "AZN/ч",
    azn: "AZN",
    of: "из",
    loading: "Загрузка…",
    tryAgain: "Повторить",
    search: "Поиск",
    reset: "Сбросить",
    scope: "Охват",
    operationalDay: "Рабочий день",
    previousDay: "Предыдущий день",
    nextDay: "Следующий день",
    allStations: "Все станции",
    allDepartments: "Все отделы",
    allShifts: "Все смены",
  },

  shifts: {
    Morning: "Утро",
    Evening: "Вечер",
    Night: "Ночь",
  },

  risk: {
    LOW: "Низкий",
    MEDIUM: "Средний",
    HIGH: "Высокий",
  },

  roles: {
    admin: "Администратор",
    supervisor: "Региональный супервайзер",
    manager: "Руководитель станции",
    staff: "Оператор",
  },

  auth: {
    signIn: "Войти",
    signingIn: "Вход…",
    signOut: "Выйти",
    signingOut: "Выход…",
    workEmail: "Рабочая почта",
    password: "Пароль",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    internalOnly: "Внутренняя система — только для уполномоченных сотрудников.",
    sessionNote: "Сессия завершается через 8 часов — одна смена.",
    account: "Аккаунт",
    profile: "Профиль",
    signedInAs: (email: string) => `Вы вошли как ${email}`,
    allStations: "Все станции",
    errors: {
      badCredentials: "Неверная почта или пароль.",
      disabled: "Учётная запись отключена. Обратитесь к администратору.",
      tooMany: "Слишком много попыток. Подождите несколько минут.",
      network: "Ошибка сети. Проверьте подключение и повторите.",
      generic: "Не удалось войти. Попробуйте ещё раз.",
      noSession: "Не удалось начать сессию.",
    },
  },

  dashboard: {
    title: "Панель операций",
    description:
      "Обзор продаж, персонала и рисков по всей сети за рабочий день.",
    reviewAlerts: "Просмотреть оповещения",
    totalRevenue: "Общая выручка",
    targetProgress: (pct: number, target: string) =>
      `${pct}% от дневной цели в ${target} AZN`,
    noTarget: "Цель по выручке не задана",
    completedSales: "завершённых продаж топлива",
    operatorsOnDuty: "Операторов на смене",
    acrossStations: (n: number) => `на ${n} станциях`,
    avgProductivity: "Средняя производительность",
    revenuePerHour: "выручка за рабочий час",
    aboveTarget: "выше цели",
    nearTarget: "близко к цели",
    belowTarget: "ниже цели",
    openAlerts: "Открытые оповещения",
    allClear: "всё в порядке",
    needsReview: "требует проверки",

    dailyTarget: "Дневная цель по выручке",
    progressToward: (target: string) => `Прогресс к ${target} AZN`,
    setTargetsPrompt: "Задайте цели в Настройках, чтобы отслеживать прогресс",
    targetExceeded: "Цель превышена.",
    remainingToTarget: (amount: string) =>
      `До сегодняшней цели осталось ${amount} AZN.`,
    noTargetLong:
      "Цель не задана — администратор может установить её для каждой станции в Настройках.",
    operationalHealth: "Операционное состояние",
    healthStable: "Стабильно — значимой нагрузки инцидентов нет",
    healthMonitor: "Наблюдать — нагрузка инцидентов растёт",
    healthDegraded: "Ухудшение — рекомендуется проверка руководством",

    workforceRisk: "Риски персонала",
    workforceRiskDesc: "Операторы по классификации риска",
    operatorCount: (n: number) => `${n} оператор(ов)`,

    highlights: "Показатели дня",
    highlightsDesc: "Лучшие результаты в текущей выборке",
    topOperator: "Лучший оператор",
    bestStation: "Лучшая станция",
    bestDepartment: "Лучший отдел",
    avgRevenuePerOperator: "Средняя выручка на оператора",
    highRiskOperators: "Операторы высокого риска",

    revenueThroughDay: "Выручка в течение дня",
    hourlyRevenue: "Почасовая выручка от продаж топлива, AZN",
    revenueByStation: "Выручка по станциям",
    totalPerStation: "Всего AZN по станции",
    revenueByDepartment: "Выручка по отделам",
    totalPerDepartment: "Всего AZN по отделу",
    shiftCoverage: "Покрытие смен",
    operatorsPerShift: "Операторов в смену",
    onDuty: "на смене",

    top5: "Топ-5 операторов",
    top5Desc: "По выручке, затем по производительности",
    fullRanking: "Полный рейтинг",

    executiveBrief: "Сводка для руководства",
    executiveBriefDesc: "Сформирована автоматически по данным дня",
    briefLine1: (revenue: string, transactions: number) =>
      `Сегодня сеть принесла ${revenue} AZN за ${transactions} транзакций`,
    briefTargetPart: (pct: number) => ` — ${pct}% от дневной цели по выручке.`,
    briefNoTargetPart: ", цель по выручке не задана.",
    briefLine2: (
      leader: string,
      amount: string,
      station: string,
      department: string
    ) =>
      `${leader} лидирует с ${amount} AZN; ${station} — сильнейшая станция, ${department} — сильнейший отдел.`,
    briefLine3: (productivity: string, attendance: number) =>
      `Средняя производительность — ${productivity} AZN в час, посещаемость — ${attendance}%.`,
    briefNoAlerts: "Подозрительной активности не обнаружено.",
    briefAlerts: (n: number) =>
      `${n} подозрительных транзакций требуют проверки до закрытия смены.`,
    targetExceededShort: "Цель по выручке превышена",
    targetNearlyShort: "Цель по выручке почти достигнута",
    targetMissedShort: "Цель по выручке не достигнута",

    recentAlerts: "Недавние оповещения",
    recentAlertsDesc: "Продажи, зафиксированные вне рабочих часов",
    alertCenter: "Центр оповещений",
    noAlerts: "Операционных оповещений нет",
    noAlertsDesc:
      "Все продажи в этой выборке попадают в зарегистрированные рабочие часы оператора.",
  },

  operators: {
    title: "Операторы",
    description:
      "Каждый оператор на смене — производительность и риск с первого взгляда.",
    inCurrentSlice: "в текущей выборке",
    transactionsCount: (n: number) => `${n} транзакций`,
    perWorkingHour: "за рабочий час",
    againstShift: "относительно 8-часовой смены",
    avgAttendance: "Средняя посещаемость",
    countLabel: (visible: number, total: number) =>
      visible === total
        ? `${total} оператор(ов)`
        : `${visible} из ${total} операторов`,
    clickForProfile: "нажмите на имя для полного профиля",
    searchPlaceholder: "Поиск по имени, станции, отделу…",
    clearSearch: "Очистить поиск",
    noMatch: (query: string) => `Операторы по запросу «${query}» не найдены`,
    noMatchDesc: "Попробуйте другое имя, станцию или отдел.",
    revenueAzn: "Выручка (AZN)",
  },

  operatorDetail: {
    title: "Профиль оператора",
    description: (shift: string) =>
      `Полная оценка производительности и рисков за смену «${shift}».`,
    allOperators: "Все операторы",
    grade: "оценка",
    fleetAvg: (value: string) => `среднее по сети ${value}`,
    above: "выше",
    below: "ниже",
    perHourCount: (n: number) => `${n} в час`,
    performanceScore: "Балл производительности",
    scoreBlend: "посещаемость + производительность",
    workingHours: "Рабочие часы",
    ofScheduled: (n: number) => `из ${n} по графику`,
    revenueThroughShift: "Выручка в течение смены",
    hourlyBy: (name: string) =>
      `Почасовая выручка, зафиксированная ${name}, AZN`,
    assessment: "Оценка",
    assessmentDesc: "Автоматическая рекомендация",
    topTier: "Высочайшая эффективность",
    topTierBody: (name: string) =>
      `${name} — один из сильнейших операторов дня: отличная посещаемость и высокая выручка.`,
    topTierAction:
      "Рекомендация: отметить оператора и рассмотреть руководящие обязанности.",
    performingWell: "Работает хорошо",
    performingWellBody: (name: string) =>
      `${name} работает хорошо; отдельные показатели ещё можно улучшить.`,
    performingWellAction:
      "Рекомендация: продолжать наблюдение и оказывать поддержку при необходимости.",
    needsAttention: "Требуется внимание руководства",
    needsAttentionBody: "Показатели ниже ожидаемых за день.",
    needsAttentionAction:
      "Рекомендация: проверить посещаемость и производительность, отслеживать последующие транзакции.",
    riskHigh: (n: number) =>
      `${n} подозрительных транзакций — рекомендуется немедленная проверка.`,
    riskMedium: "Держите этого оператора под наблюдением.",
    riskLow: "Операционных замечаний не выявлено.",
    flagged: "Отмеченные транзакции",
    flaggedDesc: (window: string) =>
      `Продажи вне рабочего окна оператора ${window}`,
  },

  leaderboard: {
    title: "Рейтинг эффективности",
    description: "Операторы по выручке, затем по производительности.",
    revenueChampion: "Лидер по выручке",
    revenueChampionDesc: "Наибольшая выручка в выборке",
    productivityChampion: "Лидер по производительности",
    productivityChampionDesc: "Больше всего AZN за рабочий час",
    attendanceChampion: "Лидер по посещаемости",
    attendanceChampionDesc: "Лучшее соблюдение часов смены",
    completeRanking: "Полный рейтинг",
    allOperators: (n: number) => `Все ${n} операторов в текущей выборке`,
    shiftSuffix: (shift: string) => `смена «${shift}»`,
    fair: {
      title: "\u0421\u043f\u0440\u0430\u0432\u0435\u0434\u043b\u0438\u0432\u044b\u0439 \u0440\u0435\u0439\u0442\u0438\u043d\u0433",
      subtitle:
        "\u041a\u0430\u0436\u0434\u043e\u0433\u043e \u0441\u0440\u0430\u0432\u043d\u0438\u0432\u0430\u044e\u0442 \u0441 \u0442\u0435\u043c, \u0447\u0442\u043e \u043e\u0431\u044b\u0447\u043d\u043e \u0434\u0430\u0451\u0442 \u0435\u0433\u043e \u0441\u0442\u0430\u043d\u0446\u0438\u044f \u0438 \u0441\u043c\u0435\u043d\u0430 \u2014 \u0430 \u043d\u0435 \u0441\u043e \u0432\u0441\u0435\u0439 \u0441\u0435\u0442\u044c\u044e.",
      why: "\u0427\u0442\u043e \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c",
      whyBody:
        "\u0420\u0435\u0439\u0442\u0438\u043d\u0433 \u043f\u043e \u0432\u044b\u0440\u0443\u0447\u043a\u0435 \u043e\u0446\u0435\u043d\u0438\u0432\u0430\u043b \u043c\u0435\u0441\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u044b, \u0430 \u043d\u0435 \u0440\u0430\u0431\u043e\u0442\u0443. \u0422\u0440\u0430\u0441\u0441\u043e\u0432\u0430\u044f \u0441\u0442\u0430\u043d\u0446\u0438\u044f \u043e\u0431\u0433\u043e\u043d\u044f\u0435\u0442 \u0440\u0435\u0433\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0443\u044e \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c, \u0430 \u043d\u043e\u0447\u043d\u0430\u044f \u0441\u043c\u0435\u043d\u0430 \u043d\u0435 \u043c\u043e\u0433\u043b\u0430 \u043f\u043e\u043f\u0430\u0441\u0442\u044c \u0432 \u0442\u043e\u043f \u0432\u043e\u043e\u0431\u0449\u0435. \u0422\u0435\u043f\u0435\u0440\u044c \u0441\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435 \u0438\u0434\u0451\u0442 \u0441 \u043c\u0435\u0434\u0438\u0430\u043d\u043d\u044b\u043c \u0434\u043d\u0451\u043c \u0441\u0432\u043e\u0435\u0439 \u0436\u0435 \u0441\u043c\u0435\u043d\u044b.",
      percentOfExpected: "% \u043e\u0442 \u043e\u0436\u0438\u0434\u0430\u0435\u043c\u043e\u0433\u043e",
      expected: "\u041e\u0436\u0438\u0434\u0430\u0435\u043c\u043e",
      actual: "\u0424\u0430\u043a\u0442",
      overWindow: (n: number) => `\u0437\u0430 ${n} \u0434\u043d.`,
      mostImproved: "\u041d\u0430\u0438\u0431\u043e\u043b\u044c\u0448\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441",
      mostImprovedDesc:
        "\u041c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u043e\u0441\u0442 \u043c\u0435\u0436\u0434\u0443 \u043f\u0435\u0440\u0432\u043e\u0439 \u0438 \u0432\u0442\u043e\u0440\u043e\u0439 \u043f\u043e\u043b\u043e\u0432\u0438\u043d\u043e\u0439 \u043f\u0435\u0440\u0438\u043e\u0434\u0430 \u0432 \u043f\u0443\u043d\u043a\u0442\u0430\u0445 \u043e\u0442\u043d\u043e\u0448\u0435\u043d\u0438\u044f \u2014 \u043f\u043e\u044d\u0442\u043e\u043c\u0443 \u0440\u043e\u0441\u0442 \u043d\u0430 \u0442\u0438\u0445\u043e\u0439 \u0441\u0442\u0430\u043d\u0446\u0438\u0438 \u0446\u0435\u043d\u0438\u0442\u0441\u044f \u0442\u0430\u043a \u0436\u0435.",
      noImproved: "\u0412 \u044d\u0442\u043e\u043c \u043f\u0435\u0440\u0438\u043e\u0434\u0435 \u044f\u0432\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430 \u043d\u0435\u0442.",
      improvementPoints: (n: number) => `${n > 0 ? "+" : ""}${n} \u043f.`,
      tierLabel: "\u0413\u0440\u0443\u043f\u043f\u0430",
      tiers: {
        exceptional: "\u0412\u044b\u0434\u0430\u044e\u0449\u0438\u0439\u0441\u044f",
        strong: "\u0421\u0438\u043b\u044c\u043d\u044b\u0439",
        expected: "\u041a\u0430\u043a \u043e\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044f",
        below: "\u041d\u0438\u0436\u0435 \u043e\u0436\u0438\u0434\u0430\u0435\u043c\u043e\u0433\u043e",
        "needs-support": "\u041d\u0443\u0436\u043d\u0430 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430",
      },
      tierNote:
        "\u0413\u0440\u0443\u043f\u043f\u044b \u043e\u0442\u0440\u0430\u0436\u0430\u044e\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043d\u043e\u0440\u043c\u044b \u0441\u043c\u0435\u043d\u044b. \u00ab\u041d\u0438\u0436\u0435 \u043e\u0436\u0438\u0434\u0430\u0435\u043c\u043e\u0433\u043e\u00bb \u2014 \u043f\u043e\u0432\u043e\u0434 \u0432\u044b\u044f\u0441\u043d\u0438\u0442\u044c \u043f\u0440\u0438\u0447\u0438\u043d\u0443, \u0430 \u043d\u0435 \u043e\u0446\u0435\u043d\u043a\u0430 \u0441\u0442\u0430\u0440\u0430\u043d\u0438\u0439.",
      rawNote: "\u0412\u044b\u0440\u0443\u0447\u043a\u0430 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u0430 \u0434\u043b\u044f \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430 \u0438 \u043d\u0435 \u0432\u043b\u0438\u044f\u0435\u0442 \u043d\u0430 \u0440\u0435\u0439\u0442\u0438\u043d\u0433.",
    },
  },

  stations: {
    title: "Эффективность станций",
    description:
      "Региональный обзор — выручка, персонал и состояние по каждой станции.",
    inSlice: "в текущей выборке",
    regionalRevenue: "Региональная выручка",
    perOperatorHour: "за рабочий час оператора",
    avgHealth: "Среднее состояние станций",
    stable: "стабильно",
    monitor: "наблюдение",
    intervention: "рекомендуется вмешательство",
    bestStation: "Лучшая станция",
    bestStationDesc: "Наибольшая выручка в текущей выборке",
    viewOperators: "Показать операторов",
    onDutyCount: (n: number) => `${n} оператор(ов) на смене`,
    operatorsTransactions: (ops: number, tx: number) =>
      `${ops} оператор(ов) · ${tx} транзакций`,
    alertsCount: (n: number) => `${n} оповещений`,
    stableShort: "Стабильно",
    monitorShort: "Наблюдение",
    reviewShort: "Рекомендуется проверка",
    comparison: "Сравнение станций",
    comparisonDesc: "Полные показатели по станциям",
  },

  cases: {
    title: "Дела о мошенничестве",
    description:
      "Дела, предложенные правилами для проверки. Срабатывание правила — повод посмотреть, а не вывод.",
    queue: "Очередь на проверку",
    queueDesc: "Сначала открытые, затем по весу.",
    openCases: "Открытые",
    investigating: "Расследуется",
    closed: "Закрытые",
    noCases: "Открытых дел нет",
    noCasesDesc:
      "Ни один оператор не нарушил достаточно правил в достаточном числе отдельных дней.",
    proposed: "Предложено системой",
    proposedNote: "Предложено правилами — это не вывод.",
    score: "Вес",
    flaggedDays: "Отмеченные дни",
    window: "Период",
    rulesTripped: "Сработавшие правила",
    daysCount: (n: number) => `${n} дн.`,
    openCase: "Открыть дело",
    backToCases: "К списку дел",
    assignedTo: "Ответственный",
    unassigned: "Не назначен",
    assignToMe: "Назначить мне",
    statusLabel: "Статус",
    noteLabel: "Заметки проверяющего",
    notePlaceholder: "Что вы проверили и к какому выводу пришли?",
    save: "Сохранить",
    saved: "Сохранено",
    timeline: "История дела",
    timelineDesc: "Только добавление. Каждое изменение сохраняется.",
    noTimeline: "Изменений пока нет.",
    evidence: "Доказательства",
    evidenceDesc:
      "Точные интервалы для просмотра на видео — формируются вместе с делом, чтобы их не пришлось восстанавливать.",
    cctvWindow: "Интервал видео",
    noEvidence: "Для этого правила интервалы не записаны.",
    observed: "Наблюдалось",
    baseline: "Норма",
    amounts: "Суммы",
    viewDay: "Посмотреть этот день",
    fairnessTitle: "Прежде чем действовать",
    fairnessBody:
      "Эти правила измеряют закономерности в кассовых данных, а не намерения. У закономерности бывают невинные объяснения — сломанная колонка, сбившиеся часы, постоянный клиент. Посмотрите записи и поговорите с человеком, прежде чем фиксировать вывод.",
    needsSupervisorHint:
      "Закрыть дело может только супервайзер или администратор. У руководителя станции, оценивающего свою же команду, есть конфликт интересов.",
    noteRequiredHint:
      "Для подтверждения мошенничества нужно письменное обоснование не короче 10 символов.",
    statusOpen: "Открыто",
    statusInvestigating: "Расследуется",
    statusConfirmed: "Подтверждено",
    statusExplained: "Объяснено",
    statusDismissed: "Отклонено",
    errors: {
      notSignedIn: "Сессия истекла. Войдите снова.",
      notAllowed: "У вас нет прав изменять это дело.",
      badRequest: "В запросе чего-то не хватает.",
      badStatus: "Недопустимый статус.",
      needsSupervisor: "Закрыть дело может только супервайзер или администратор.",
      noteRequired: "Запишите, что вы обнаружили, прежде чем подтверждать.",
      notFound: "Этого дела больше нет.",
    },
    rules: {
      afterHours: "Продажи вне смены",
      lateClose: "Продажи после ухода",
      shiftEndBurst: "Всплеск в конце смены",
      duplicateAmounts: "Повторяющиеся одинаковые суммы",
      roundAmount: "Слишком много круглых сумм",
      velocityOutlier: "Темп сильно отличается от коллег",
      deadHours: "Часы почти без продаж",
    },
    ruleHelp: {
      afterHours: "Операции, записанные когда человек не был на смене.",
      lateClose: "Операции, записанные после ухода со смены.",
      shiftEndBurst:
        "Необычное скопление продаж в последние минуты смены.",
      duplicateAmounts:
        "Одна и та же сумма повторяется подряд — возможный признак повторно использованного чека.",
      roundAmount:
        "Заметно больше продаж на круглые суммы, чем у коллег на той же станции.",
      velocityOutlier:
        "Темп продаж далёк от медианы коллег. Само по себе это не доказательство — быстрый оператор просто быстрый.",
      deadHours:
        "Долгие промежутки почти без выручки. Обычно это сломанная колонка или тихая станция, а не кража.",
    },
  },

  alerts: {
    title: "Центр оповещений",
    description:
      "Подозрительные транзакции — продажи вне рабочих часов оператора.",
    flaggedTransactions: "Отмеченные транзакции",
    inSlice: "в текущей выборке",
    highPriority: "Высокий приоритет",
    twoPlusFlagged: "2+ отмеченных продажи",
    mediumPriority: "Средний приоритет",
    oneFlagged: "1 отмеченная продажа",
    clearOperators: "Операторы без замечаний",
    noFlagged: "отмеченных продаж нет",
    incidentLog: "Журнал инцидентов",
    incidentLogDesc:
      "Сначала новые · нажмите на оператора для полного профиля",
    noneDetected: "Подозрительных транзакций не обнаружено",
    noneDetectedDesc:
      "Все продажи в этой выборке попадают в зарегистрированные рабочие часы оператора.",
    recommendedActions: "Рекомендуемые действия",
    standardProcedure: "Стандартная процедура по инцидентам",
    noAction: "Действий не требуется.",
    noActionDesc:
      "Все продажи в текущей выборке попадают в зарегистрированные рабочие часы операторов.",
    generated: (alerts: number, ops: number) =>
      `Сегодняшние операции дали ${alerts} отмеченных транзакций у ${ops} оператор(ов).`,
    beforeEndOfDay: "До конца рабочего дня:",
    step1: "Сверьте каждую отмеченную транзакцию с кассовой записью.",
    step2: "Просмотрите записи камер за отмеченные интервалы времени.",
    step3: "Подтвердите график смен оператора у руководителя станции.",
    priorityReview: "Приоритетная проверка",
    byPriority: "Операторы по приоритету",
    byPriorityDesc:
      "Сгруппированы по количеству отмеченных продаж у каждого оператора",
    tabHigh: "Высокий",
    tabMedium: "Средний",
    tabClear: "Без замечаний",
    flaggedSuffix: (n: number) => `${n} отмечено`,
    noHigh: "Операторов высокого приоритета нет.",
    noMedium: "Операторов среднего приоритета нет.",
    noClear: "Операторов без замечаний нет.",
    outsideHours: "Продажа зафиксирована вне рабочих часов",
  },

  settings: {
    title: "Настройки",
    description:
      "Бизнес-правила, определяющие каждый балл, оценку и метку риска. Изменения вступают в силу сразу — разработчик не нужен.",

    scoring: "Расчёт баллов",
    scoringDesc:
      "Как рабочие часы и темп продаж превращаются в балл 0–100. Изменения применяются ко всем рабочим дням сразу.",
    scheduledHours: "Длительность смены по графику",
    scheduledHoursDesc:
      "Знаменатель балла посещаемости. Сейчас все работают ровно столько, поэтому посещаемость близка к 100%.",
    productivityTarget: "Цель по производительности",
    productivityTargetDesc:
      "AZN в час для полного балла. Прежнее жёстко заданное значение 15 было рассчитано на загруженные бакинские станции — повышение несправедливо к тихим станциям, понижение — к загруженным.",
    graceMinutes: "Допустимое опоздание",
    graceMinutesDesc:
      "Опоздание, которое прощается до влияния на балл посещаемости.",

    riskThresholds: "Пороги риска",
    riskThresholdsDesc:
      "Когда оператор помечается как СРЕДНИЙ или ВЫСОКИЙ риск.",
    riskHighSuspicious: "Отмеченных продаж для ВЫСОКОГО риска",
    riskHighSuspiciousDesc:
      "Количество подозрительных продаж за смену, дающее ВЫСОКИЙ риск.",
    riskMediumAttendance: "Посещаемость ниже этого — СРЕДНИЙ риск",
    riskHighAttendance: "Посещаемость ниже этого — ВЫСОКИЙ риск",
    riskHighAttendanceDesc: "Должно быть ниже среднего порога.",

    gradeBoundaries: "Границы оценок",
    gradeBoundariesDesc:
      "Минимальный балл для каждой оценки. Должны убывать: A+ > A > B > C.",
    gradeFrom: (grade: string) => `Оценка ${grade} от`,
    belowC: "Всё ниже границы C получает оценку D.",

    revenueTargets: "Цели по выручке",
    revenueTargetsDesc:
      "Заменяет старую формулу, которая выводила цель из измеряемой выручки и потому всегда показывала 87%.",
    targetMode: "Как задаются цели",
    targetModeDesc:
      "Ручной режим использует числа ниже. Базовый режим выводит цель станции из её собственных последних дней.",
    manualMode: "Вручную по станциям",
    baselineMode: "От собственного среднего станции",
    baselineUplift: "Надбавка к среднему",
    baselineUpliftDesc:
      "1.05 требует от станции на 5% больше её собственного среднего.",
    defaultTarget: "Цель по умолчанию за день",
    defaultTargetDesc:
      "Используется для станций без собственного значения ниже.",

    language: "Язык",
    languageDesc:
      "Язык интерфейса по умолчанию для тех, кто не выбрал свой.",
    defaultLanguage: "Язык по умолчанию",
    defaultLanguageDesc: "Пользователи всё равно могут переключить.",

    unsaved: "Несохранённые изменения",
    saved: "Сохранено",
    appliesImmediately: "Применяется ко всем рабочим дням сразу.",
    restoreDefaults: "Вернуть значения по умолчанию",
    save: "Сохранить настройки",
    saving: "Сохранение…",
    savedToast: "Настройки сохранены — баллы обновлены за все дни.",
    restoredToast: "Правила по умолчанию восстановлены.",
    auditNote:
      "Каждое изменение записывается вместе с автором, поэтому решения по оценкам и рискам остаются проверяемыми.",

    units: {
      hours: "часов",
      aznPerHour: "AZN/ч",
      min: "мин",
      sales: "продаж",
      pts: "балл",
      azn: "AZN",
      times: "×",
    },
  },

  dataHealth: {
    title: "Состояние данных",
    description: "Последний импорт и всё, что стоит в нём проверить.",
    lastImport: "Последний импорт",
    source: "Источник",
    days: "Дней",
    shifts: "Смен",
    sales: "Продаж",
    stations: "Станций",
    workers: "Сотрудников",
    clean: "Импорт прошёл чисто",
    cleanDesc: "В последнем импорте проблем не найдено.",
    errors: (n: number) => `${n} ошибок`,
    warnings: (n: number) => `${n} предупреждений`,
    affectedRows: (n: number) => `${n} строк`,
    example: "Пример",
    never: "Импорт ещё не выполнялся",
    neverDesc: "Запустите импорт, чтобы наполнить панель.",
    issueCodes: {
      "no-attendance": "В файле посещаемости не было строк",
      "no-sales": "В файле продаж не было строк",
      "attendance-unparseable-date": "Нечитаемое время смены",
      "duplicate-shift": "Один оператор дважды за день — вероятно, двойной импорт",
      "invalid-shift-window": "Смена заканчивается раньше начала",
      "implausible-shift-length": "Очень длинные смены — проверьте отметку об уходе",
      "sale-unparseable-date": "Нечитаемые отметки времени продаж",
      "invalid-amount": "Нулевые, отрицательные или нечисловые суммы",
      "unknown-employee": "Продажи без соответствующего оператора — выручка теряется",
      "duplicate-sale": "Идентичные строки продаж — возможно, посчитаны дважды",
      "implausible-amount": "Необычно крупные разовые продажи",
      "sale-far-outside-shift": "Продажи далеко от смены — проверьте часы, прежде чем считать это мошенничеством",
      "future-date": "Даты в будущем",
      "already-imported": "Дни, которые уже существовали и были перезаписаны",
      "missing-days": "Пропуски в календаре — за эти дни нет данных",
    } as Record<string, string>,
  },

  errors: {
    dataTitle: "Не удалось загрузить операционные данные",
    dataDesc:
      "Панель не смогла прочитать данные из Firestore. Если это проект на бесплатном тарифе, дневная квота на чтение могла быть исчерпана — она сбрасывается в полночь по тихоокеанскому времени. Иначе проверьте журналы сервера.",
    noMatch: (subject: string) =>
      `Нет записей (${subject}), подходящих под текущие фильтры`,
    noMatchDesc: (subject: string) =>
      `Расширьте охват выше, чтобы вернуть ${subject} в поле зрения.`,
  },

  search: {
    placeholder: "Поиск операторов, страниц…",
    dialogPlaceholder: "Найдите оператора или перейдите на страницу…",
    noResults: "Ничего не найдено.",
    pages: "Страницы",
    operators: "Операторы",
  },

  languages: {
    az: "Azərbaycanca",
    ru: "Русский",
    en: "English",
    switch: "Сменить язык",
  },
}
