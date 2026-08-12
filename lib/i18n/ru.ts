import type { Dictionary } from "@/lib/i18n/en"

/** Russian. Typed against `en`, so a missing key fails the build. */
export const ru: Dictionary = {
  brand: {
    name: "SOCAR SASIS",
    tagline: "Центр сигналов и добросовестности",
    systemOnline: "Система работает",
  },

  nav: {
    sectionIntegrity: "Мониторинг",
    alerts: "Сигналы",
    workers: "Сотрудники",
    wall: "Табло сигналов",
  },

  common: {
    previousPage: "Назад",
    nextPage: "Далее",
    perPage: (n: number) => `${n} на странице`,
    showingRange: (from: number, to: number, total: number) =>
      `${from}–${to} из ${total}`,
    station: "Станция",
    department: "Отдел",
    shift: "Смена",
    operator: "Сотрудник",
    loading: "Загрузка…",
    tryAgain: "Повторить",
    search: "Поиск",
    reset: "Сбросить",
    operationalDay: "Операционный день",
    previousDay: "Предыдущий день",
    nextDay: "Следующий день",
    allStations: "Все станции",
    allDepartments: "Все отделы",
    allShifts: "Все смены",
    weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },

  shifts: {
    Morning: "Утро",
    Evening: "Вечер",
    Night: "Ночь",
  },

  roles: {
    admin: "Администратор",
    supervisor: "Региональный супервайзер",
    manager: "Руководитель станции",
    staff: "Сотрудник",
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
      disabled: "Аккаунт отключён. Обратитесь к администратору.",
      tooMany: "Слишком много попыток. Подождите несколько минут.",
      network: "Ошибка сети. Проверьте подключение и повторите.",
      generic: "Не удалось войти. Попробуйте ещё раз.",
      noSession: "Не удалось начать сессию.",
    },
  },

  alerts: {
    title: "Центр сигналов",
    description:
      "Только то, что база может доказать — пропущенные отметки и продажи вне смены.",
    totalFlagged: "Сигналы",
    workersAffected: "Сотрудники",
    amountInvolved: "Затронутая сумма",
    worstDay: "Самый тяжёлый день",
    searchPlaceholder: "Сотрудник, карта или станция…",
    clearSearch: "Очистить поиск",
    severityFilter: "Фильтр по важности",
    severityAll: "Любая важность",
    severity: {
      high: "Высокая",
      medium: "Средняя",
      low: "Низкая",
    },
    colWhen: "Когда",
    colWhat: "Что показывает база",
    colAmount: "Сумма",
    incidentLog: "Журнал инцидентов",
    incidentLogDesc:
      "Сначала новые · каждую строку можно проверить в исходных таблицах",
    noneDetected: "Сигналов за этот период нет",
    noneDetectedDesc:
      "Каждая отметка парная, и каждая продажа лежит внутри окна присутствия сотрудника.",
    liveFeed: "Живая лента",
    liveFeedLog: "Журнал живой ленты",
    liveFeedEmpty: "Пока пусто — включите ленту.",
    liveFeedQuiet: "нет новых строк",
    liveFeedSales: "продажи",
    liveFeedTaps: "отметки",
    liveFeedError: "сбой запроса",
    types: {
      missingOut: "Вошёл, но не отметил выход",
      missingIn: "Вышел, но не отмечал вход",
      doubleTapIn: "Вход отмечен дважды",
      doubleTapOut: "Выход отмечен дважды",
      saleOffClock: "Продажа вне окна присутствия",
      noTapsSales: "Продажи вовсе без отметок",
    },
  },

  workers: {
    title: "Сотрудники",
    description:
      "Присутствие и продажи по сотрудникам — кто когда вошёл, когда вышел и что продал его брелок.",
    searchPlaceholder: "Имя, карта или станция…",
    clearSearch: "Очистить поиск",
    colWorker: "Сотрудник",
    colInOut: "Вход → Выход",
    colHours: "Часы",
    colSales: "Продажи",
    colLitres: "Литры",
    colRevenue: "Выручка",
    colTime: "Время",
    colGrade: "Топливо",
    colAmount: "Сумма",
    onDuty: "На смене",
    tapsMissing: "Пропущенные отметки",
    noWorkers: "В этот день сотрудников нет",
    noWorkersDesc:
      "За этот операционный день не записано ни отметок, ни продаж.",
    absentTitle: "В этот день не на смене",
    absentDesc: "За этот день у сотрудника не записано ни отметок, ни продаж.",
    backToWorkers: "Все сотрудники",
    timeline: "День на одной оси",
    timelineDesc:
      "Сверху: присутствие, ровно как говорят отметки. Ниже: каждая продажа на той же оси — продажа за пределами полосы не требует объяснений.",
    presence: "Присутствие",
    offClock: "Вне смены",
    salesTitle: "Продажи",
    noSales: "Продаж за этот день нет.",
    tapsTitle: "Отметки",
    tapsDesc: "Сырые строки check_time / check_type, по порядку.",
    noTaps: "Отметок за этот день нет.",
    tapIn: "ВХОД",
    tapOut: "ВЫХОД",
  },

  wall: {
    title: "Табло сигналов",
    alertsToday: "сигналов сегодня",
    missingTaps: "пропущенных отметок",
    clearStations: "станций чисто",
    alertsShort: "сегодня",
    missingShort: (n: number) => `пропущено отметок: ${n}`,
    highShort: (n: number) => `высокой важности: ${n}`,
    status: {
      clear: "Чисто",
      attention: "Внимание",
      critical: "Критично",
    },
    notLive: "Обновляется раз в день при импорте — это не прямой эфир.",
    stale: "Данные устарели",
    ageHours: (n: number) => `${n} ч назад`,
    ageDays: (n: number) => `${n} дн. назад`,
    latestTitle: "Последние срабатывания",
    noEvents: "За последний день срабатываний нет.",
  },

  errors: {
    dataTitle: "Не удалось загрузить операционные данные",
    dataDesc:
      "Приложение не смогло прочитать данные из Firestore. Если это бесплатный тариф, дневная квота чтения могла закончиться — она сбрасывается в полночь по тихоокеанскому времени. Иначе проверьте логи сервера.",
  },

  search: {
    placeholder: "Поиск сотрудников, страниц…",
    dialogPlaceholder: "Найдите сотрудника или перейдите на страницу…",
    noResults: "Ничего не найдено.",
    pages: "Страницы",
    workers: "Сотрудники",
  },

  theme: {
    switch: "Оформление",
    light: "Светлая",
    dark: "Тёмная",
    system: "Системная",
  },
  credit: {
    developedBy: "Разработал",
    author: "Nihat Shikhizada",
  },
  languages: {
    az: "Azərbaycanca",
    ru: "Русский",
    en: "English",
    switch: "Сменить язык",
  },
}
