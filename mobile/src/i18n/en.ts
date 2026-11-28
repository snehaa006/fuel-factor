/**
 * The app's words in English: the source dictionary.
 *
 * Grouped by the screen or component that says them. A function is a
 * sentence with a number or a name in it, so each language can put the number
 * where its grammar wants it.
 *
 * Changing a sentence here means changing it in `id.ts` too; the typecheck
 * only catches a missing key, not a stale translation.
 */
export const en = {
  common: {
    back: '← BACK',
    continue: 'Continue',
    working: 'Working…',
    signIn: 'Sign in',
    signOut: 'Sign out',
    notRecorded: 'Not recorded',
    optional: 'Optional',
    somethingWentWrong: 'Something went wrong.',
    iAmACoach: 'I am a coach →',
    needAccount: 'I need an account',
    haveAccount: 'I already have an account',
    confirmEmail: 'Check your email to confirm the account, then sign in.',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading…',
    tryAgain: 'Try again',
  },

  preferences: {
    title: 'SETTINGS',
    language: 'LANGUAGE',
    theme: 'THEME',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    systemShort: 'Auto',
    themeHint: 'System follows your phone’s setting.',
    languageLabel: 'Language',
    themeLabel: (name: string) => `${name} theme`,
  },

  credentials: {
    email: 'EMAIL',
    emailLabel: 'Email',
    password: 'PASSWORD',
    passwordLabel: 'Password',
    newPasswordHint: 'At least 6 characters',
  },

  signIn: {
    welcomeBack: 'Welcome back',
    makeAccount: 'Make your account',
    signInLead: 'Sign in to pick up where you left off.',
    signUpLead: 'You’ll enter your team code next.',
    createAccount: 'Create my account',
  },

  coachAccount: {
    signInTitle: 'Coach sign-in',
    signUpTitle: 'New coach account',
    lead: 'Sign in to manage your team.',
    createAccount: 'Create the account',
  },

  consent: {
    heading: 'Before you start',
    whatItIs:
      'Fuel Factor records what you eat and shows you and your coach where your fuel gaps are. It is part of a school nutrition programme.',
    whatItIsNot:
      'It never sets a weight goal, never tells you to eat less, and never calls a food bad. Nothing it shows you is a substitute for advice from a dietitian or a doctor.',
    checkbox: 'I am under 18 and my parent or guardian has agreed to this.',
  },

  welcome: {
    signedInAs: 'SIGNED IN AS',
    notYou: 'Not you? Sign out',
    teamCodeHeading: 'Your team code',
    teamCodeHint: 'Six letters and numbers, like K7XRMP.',
    teamCodeLabel: 'Team code',
    looking: 'Looking…',
    findTeam: 'Find my team',
    noTeam: 'No team with that code.',
    whichOne: 'Which one are you?',
    alreadyTaken: (name: string) => `${name}, already taken`,
    iAm: (name: string) => `I am ${name}`,
    onAnotherDevice: 'Already on another device',
    notListed: 'I am not on this list →',
  },

  join: {
    heading: 'About you',
    invitedTo: (team: string) => `You have been invited to ${team}.`,
    onlyName: 'Only your name is required. Leave anything you don’t know blank.',
    name: 'Name',
    namePlaceholder: 'Your name',
    sport: 'Sport',
    sportPlaceholder: 'Football',
    age: 'Age',
    ageLabel: (band: string) => `Age ${band}`,
    measurements: 'Measurements — all optional',
    measurementLabel: (label: string, unit: string) => `${label} in ${unit}`,
    parentContact: 'Parent or guardian contact',
    anythingElse: 'Anything else',
    joining: 'Joining…',
    join: (team: string | null) => `Join ${team ?? 'the team'}`,
    noTeam: 'No team with that code. Ask your coach to send the link again.',
    nameNeeded: 'Your name is needed.',
    outOfRange: (label: string, unit: string, min: number, max: number) =>
      `${label} should be in ${unit}, between ${min} and ${max}.`,
  },

  /** The questionnaire's age bands. The stored value stays the English one. */
  ageBands: {
    '13 or under': '13 or under',
    '14-16': '14-16',
    '17-18': '17-18',
    '19 or over': '19 or over',
  } as Record<string, string>,

  measurements: {
    height_cm: 'Height',
    weight_kg: 'Weight',
    waist_cm: 'Waist',
    muac_cm: 'Mid-upper arm',
    calf_cm: 'Calf',
    muacHint: 'Around the widest part of your upper arm.',
    calfHint: 'Around the widest part.',
    notMeasured: 'Not measured',
  },

  entry: {
    couldNotSignIn: 'Could not sign you in',
  },

  menu: {
    open: 'Open the menu',
    close: 'Close the menu',
    profile: 'Profile',
    beforeYouStart: 'Before you start',
    beforeYouStartDetail: 'Your three baseline recall days',
    recall: 'Food recall',
    assessments: 'Assessments',
    today: 'Today',
    learn: 'Learn',
    gaps: 'Fuel gaps',
    gapsDetail: 'Your last fortnight against the programme',
    team: 'Team',
    progress: 'Progress',
    signOut: 'Sign out',
    squad: 'Squad',
    teamAndCodes: 'Team and codes',
    teamAndCodesDetail: 'The join code to hand out, and day one of the four weeks.',
    coachAssessmentsDetail: 'Week 0 and Week 4 measures.',
    export: 'Export data',
    exportDetail: 'The squad’s rows as CSV, one file per tracker tab.',
  },

  mascot: {
    readyWhenYouAre: 'READY WHEN YOU ARE',
    nothingLogged: 'Nothing logged yet. Start with your last meal.',
    programmeDone: 'PROGRAMME COMPLETE',
    programmeDoneLine: 'Four weeks done. No more daily logging from here.',
    allSix: 'ALL SIX',
    everyMeal: 'Every meal logged today.',
    inProgress: 'IN PROGRESS',
    slotsLogged: (logged: number, total: number) => `${logged} of ${total} slots logged today.`,
    nothingYet: 'NOTHING YET',
    firstBadge: 'Log once to earn your first badge.',
    theLot: 'THE LOT',
    everyBadge: 'Every badge earned.',
    earned: 'EARNED',
    badgesEarned: (earned: number, total: number) => `${earned} of ${total} badges earned.`,
    fourWeeks: 'FOUR WEEKS',
    learnLine: 'One theme a week, with a challenge to go with it.',
    fuelFactor: 'FUEL FACTOR',
    welcomeLine: 'Log what you eat, keep your streak, and see how the squad is doing.',
    beforeAndAfter: 'BEFORE AND AFTER',
    progressLine: 'Your baseline against now.',
    didNotSave: 'DID NOT SAVE',
    saveFailed: 'That didn’t save. Try again.',
  },

  profile: {
    leaveAthlete: 'Sign back in any time. Your logs stay with your account.',
    leaveCoach: 'Sign back in any time. Your team stays as it is.',
    signingOut: 'Signing out…',
    yesSignOut: 'Yes, sign out',
    staySignedIn: 'Stay signed in',
    teamCodeHint: 'Teammates join with this code. Copy it into your team chat.',
    theProgramme: 'THE PROGRAMME',
    sport: 'Sport',
    age: 'Age',
    programmeStarts: 'Programme starts',
    coachNotSet: 'Your coach has not set it',
    followUpOpens: (weeks: number) => `The follow-up recall opens ${weeks} weeks after that day.`,
    measurements: 'MEASUREMENTS',
    coachUpdates: 'Your coach updates these.',
    consent: 'CONSENT',
    paperForm: 'Parent or guardian form',
    signed: 'Signed',
    notSigned: 'Not recorded as signed',
    acceptedInApp: 'Accepted in the app',
    consentNote:
      'The first is the programme’s paper form. The second is this app’s own screen. They are kept apart on purpose.',
    coach: 'Coach',
    noEmail: 'No email on this session',
    yourTeam: 'YOUR TEAM',
    noTeamYet: 'No team yet',
    athletes: (n: number) => `${n} ${n === 1 ? 'athlete' : 'athletes'}`,
    squadJoins: 'The squad joins with this code.',
    createTeam: 'Create a team',
    teamAndInvite: 'Team and invite link',
  },

  dates: {
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    shortWeekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    /** The month grid's column heads, Monday first. */
    initials: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    long: (weekday: string, day: number, month: string, year: number) =>
      `${weekday} ${day} ${month} ${year}`,
    short: (weekday: string, day: number, month: string) => `${weekday} ${day} ${month}`,
  },

  calendar: {
    pickADate: 'PICK A DATE',
    pickPlaceholder: 'Pick a date',
    close: 'Close the calendar',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    today: ', today',
    notSet: 'not set',
    clear: (label: string) => `Clear ${label}`,
    clearTheDate: 'Clear the date',
    todayShortcut: (date: string) => `Today · ${date}`,
  },

  /** The six meal slots, by their database code. */
  slots: {
    breakfast: 'Breakfast',
    pre_training: 'Pre-training',
    lunch: 'Lunch',
    post_training: 'Post-training',
    dinner: 'Dinner',
    evening_snack: 'Evening snack',
  } as Record<string, string>,

  /** The letters on a challenge card's pips. */
  slotInitials: {
    breakfast: 'B',
    lunch: 'L',
    post_training: 'P',
    dinner: 'D',
  } as Record<string, string>,

  habits: {
    urine: { initial: 'U', label: 'Urine colour' },
    presleep: { initial: 'S', label: 'Milk or banana before sleep (training nights)' },
    breakfast: { initial: 'B', label: 'Breakfast' },
  } as Record<string, { initial: string; label: string }>,

  today: {
    couldNotLoad: 'Could not load today',
    today: 'TODAY',
    bestSoFar: (days: number) => `Best so far: ${days} days`,
    meals: 'Meals',
    dqScore: 'DIET QUALITY SCORE',
    logMeal: '🍽️ Log a meal',
    checkIn: '🌙 Check-in',
    /** From day 29: the four weeks are over and only these are left. */
    whatsLeft: 'WHAT’S LEFT',
    endedOn: (date: string) => `The four weeks ended on ${date}. Meals and the evening check-in are closed.`,
    recallAllIn: 'Your follow-up food recall is all in.',
    seeYourWeeks: 'See your four weeks',
  },

  streak: {
    none: 'No streak yet',
    label: (days: number, lit: boolean) =>
      `${days} day streak, ${lit ? 'logged today' : 'not logged today yet'}`,
    dayStreak: 'DAY STREAK',
    strip: (logged: number, total: number) => `${logged} of the last ${total} days logged`,
    /** The strip's day letters, Sunday first. */
    dayInitials: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },

  fuelRing: {
    gCarbs: 'G CARBS',
    ofBand: (min: number, max: number) => `of ${min}–${max} g`,
    noTarget: 'no target set',
    withoutFigure: (n: number) => `+${n} item${n === 1 ? '' : 's'} without a figure`,
  },

  timeline: {
    slot: (label: string, logged: boolean) => `${label}, ${logged ? 'logged' : 'not logged yet'}`,
    nothingLogged: 'Nothing logged yet',
  },

  nudge: {
    nextTip: 'Next tip →',
    domains: {
      carbohydrate: 'CARBOHYDRATE',
      hydration: 'HYDRATION',
      timing: 'TIMING',
      protein: 'PROTEIN',
    } as Record<string, string>,
    weekMaterial: (week: string) => `Week ${week} material`,
    programmeMaterial: 'Programme material',
    awaitingReview: 'Awaiting dietitian review',
  },

  protein: {
    today: 'PROTEIN TODAY',
    withBand: (g: number, min: number, max: number) =>
      `${g} grams of protein. The programme's band is ${min} to ${max} grams.`,
    grams: (g: number) => `${g} grams of protein.`,
    target: (min: number, max: number) => `Target ${min}–${max} g a day`,
    addWeight: 'Add your weight to see a target.',
  },

  session: {
    title: 'TRAINING SESSION',
    clearLabel: 'Clear the training session',
    clear: 'Clear',
    starts: 'Starts',
    ends: 'Ends',
    step: (label: string, later: boolean) => `${later ? 'later' : 'earlier'} ${label}`,
    value: (label: string, time: string | null) => `${label}: ${time ?? 'not set'}`,
  },

  dayType: {
    training: 'Training',
    match: 'Match',
    rest: 'Rest',
    day: (label: string) => `${label} day`,
  },

  challenge: {
    eyebrow: (week: number) => `WEEK ${week} CHALLENGE`,
    starts: (date: string) => `Starts ${date}`,
    doneOneDay: 'Done. Challenge complete!',
    doneWeek: '7 of 7 days. Challenge complete!',
    notDoneYet: 'Not done yet',
    daysOf7: (n: number) => `${n} of 7 days`,
    weekOver: (tally: string) => `Week over · ${tally}`,
    streak: (n: number) => `${n}-day streak`,
    today: (hits: number, target: string) => `today ${hits}/${target}`,
    aboutMeals: (carb: boolean) => `${carb ? 'a carb' : 'protein'} at meals`,
    and: ' and ',
    strip: (done: number, needed: number, about: string) =>
      `${done} of ${needed} ${needed === 1 ? 'day' : 'days'} needed, checking ${about}`,
    day: (date: string, about: string, hits: number, needed: number, status: string) =>
      `${date}: ${about}, ${hits} of ${needed} met, ${status}`,
    statuses: { done: 'done', missed: 'missed', today: 'today', upcoming: 'upcoming' } as Record<
      string,
      string
    >,
    unrecordedWater: 'The app does not record water on waking, so that part is yours to tick off.',
  },

  timeMachine: {
    previousDay: 'Previous day',
    nextDay: 'Next day',
    label: (date: string) => `Time machine. Today is ${date}. Choose a date`,
    title: 'TIME MACHINE',
    realDate: 'REAL DATE',
    hint: 'Pick the day the app treats as today.',
    backToReal: (date: string) => `Back to the real today · ${date}`,
  },

  photo: {
    cameraDenied: 'Fuel Factor cannot open the camera without permission.',
    libraryDenied: 'Fuel Factor cannot open your photos without permission.',
    optional: 'PHOTO — OPTIONAL',
    yours: 'Your photo for this challenge',
    uploading: 'Uploading…',
    take: 'Take a photo',
    retake: 'Retake',
    choose: 'Choose one',
    replace: 'Replace',
    remove: 'Remove',
    onlyYou: 'Only you can see this.',
  },

  macros: {
    kcal: (n: number) => `${n} kcal`,
    carbs: (n: number) => `${n} g carbs`,
    protein: (n: number) => `${n} g protein`,
    fat: (n: number) => `${n} g fat`,
  },

  logger: {
    unknownSlot: 'Unknown meal slot',
    cancel: 'Cancel',
    cancelCaps: 'CANCEL',
    whatDidYouEat: 'What did you eat?',
    searchPlaceholder: 'Search 1,300+ foods: nasi, telur, pisang…',
    searchLabel: 'Search foods',
    noMatch: (query: string) => `Nothing matches “${query}”. It may not be in the database yet.`,
    per100g: 'per 100 g:',
    portion: 'PORTION',
    howMany: 'HOW MANY',
    noFigure: 'No figure for this yet — it will still be logged.',
    signInToSave: 'Sign in as an athlete to save.',
    add: 'Add to this meal',
  },

  foodPicker: {
    title: 'FOOD DATABASE',
    done: 'DONE',
    searchPlaceholder: 'Search: nasi, telur, tempe…',
    searchLabel: 'Search the food database',
    noMatch: (query: string) => `Nothing matches “${query}”. Write it in the box above instead.`,
    noFiguresYet: 'no figures yet',
    times: (q: number) => `${q} times`,
    noFiguresPortion: 'No figures for this portion yet.',
    add: 'Add',
  },

  checkIn: {
    thisEvening: 'THIS EVENING',
    howWasToday: 'How was today?',
    servings: 'Servings',
    servingsNote: 'How many you had.',
    fluid: 'Fluid',
    fluidNote: 'Millilitres across the whole day.',
    fluidPlaceholder: 'e.g. 2000',
    fluidLabel: 'Fluid in millilitres',
    hydration: 'Hydration',
    howYouFelt: 'How you felt',
    ratingRange: (max: number) => `1 to ${max}.`,
    anythingElse: 'Anything else',
    notesPlaceholder: 'Illness, a hard session, anything worth noting.',
    notesLabel: 'Notes',
    finish: 'Finish today',
    /** The DAILY LOG columns, by field. */
    fields: {
      fruit_servings: 'Fruit',
      veg_servings: 'Vegetables',
      protein_sources: 'Protein sources',
      carb_portions: 'Carb portions',
      energy_am: 'Morning energy',
      energy_training: 'Training energy',
      recovery: 'Recovery',
      mood: 'Mood',
      concentration: 'Concentration',
    } as Record<string, string>,
  },

  scales: {
    notAnswered: 'not answered',
    ratingLevel: (label: string, level: number, max: number) => `${label} ${level} out of ${max}`,
    stepper: (label: string, plus: boolean) => `${plus ? 'plus' : 'minus'} ${label}`,
    stepperValue: (label: string, value: string) => `${label}: ${value}`,
    urineLevel: (level: number, wording: string | null) =>
      `Urine colour ${level}${wording ? `, ${wording}` : ''}`,
    matchTheChart: 'Match the chart, then tap the number.',
    ratingTitle: 'The 1–10 scale',
    urineTitle: 'The hydration scale',
    guideHint: 'Opens the scale from your workbook',
    guideLabel: (title: string) => `${title}, what the numbers mean`,
    whatDoTheNumbersMean: 'What do the numbers mean?',
    closeScale: 'Close the scale',
    fromWorkbook: 'FROM YOUR WORKBOOK',
    ratingFooter: 'Pick the number that fits the day.',
    urineFooter: 'Match the colour on the chart, then tap its number.',
    /** Shown above the workbook's own wording when the app speaks Bahasa. */
    inWorkbookWords: '',
  },

  recall: {
    title: 'Food recall',
    tellUs: 'Tell us about one whole day of eating.',
    dayChoice: 'Pick one weekend day and two school days.',
    rounds: { baseline: 'Before you start', 'follow-up': 'Four weeks on' } as Record<string, string>,
    daysOf: (done: number, total: number) => `${done} of ${total} days`,
    baselineBlurb: 'Three days before the programme starts.',
    followUpBlurb: (weeks: number) => `Three more days, ${weeks} weeks in.`,
    opensOn: (date: string, days: number) =>
      `Opens on ${date}, ${days} ${days === 1 ? 'day' : 'days'} from now.`,
    opensAfter: (weeks: number) => `Opens ${weeks} weeks after the start.`,
    dayAnswered: (n: number) => `Day ${n}, answered. Open to change it.`,
    dayNotAnswered: (n: number) => `Day ${n}, not answered yet`,
    day: (n: number) => `Day ${n}`,
    dayCaps: (n: number) => `DAY ${n}`,
    notAnswered: 'Not answered',
    answered: 'Answered',
    noMeals: 'No meals recorded',
    testingMode: 'Testing mode: the four-weeks-on recall is open now instead of after the programme.',
    noStartDate: 'Your coach hasn’t set a start date yet.',
    fillInDay: (n: number) => `Fill in day ${n}`,
    fillAllThree: 'Fill all three in one go',
    noMealsWritten:
      'No meals written in yet. The day will still be saved, but it cannot go through the food database without them.',
    saved: 'Saved',
    saveDay: (n: number) => `Save day ${n}`,
    backToRecall: 'Back to the recall',
    fromFoodDatabase: 'FROM THE FOOD DATABASE',
    savedDot: 'Saved.',
    notComputed: 'Not computed yet',
    macros: { kcal: 'Calories', carbs_g: 'Carbohydrate', protein_g: 'Protein', fat_g: 'Fat' } as Record<
      string,
      string
    >,
    allThreeDays: 'All three days',
    oneSitting: 'Fill them in one sitting, or leave and come back — each day is saved as you finish it.',
    daysIn: (done: number, total: number) => `${done} of ${total} days in.`,
    tab: (n: number, saved: boolean) => `Day ${n}${saved ? ', saved' : ', not saved yet'}`,
    notYet: 'Not yet',
    noMealsShort: 'No meals written in yet.',
    saveAndGo: (n: number) => `Save and go to day ${n}`,
    allIn: 'All three days are in.',
    done: 'Done',
    remaining: (left: number, total: number) =>
      `${left} of ${total} ${left === 1 ? 'day still to go' : 'days still to go'}.`,
  },

  recallFields: {
    addFromDatabase: '+ ADD FROM FOOD DATABASE',
    theDay: 'The day',
    whichDay: 'Which day was it',
    whichDayCaps: 'WHICH DAY WAS IT',
    pickTheDay: 'Pick the day',
    sleep: (max: number) => `Sleep, in hours (0–${max})`,
    sleepLabel: 'Sleep in hours',
    whatYouAte: 'What you ate',
    meals: {
      breakfast: {
        label: 'Breakfast',
        hint: 'What you had, and roughly how much. If you skipped it, say so.',
      },
      lunch: { label: 'Lunch', hint: 'What you had, and roughly how much.' },
      dinner: { label: 'Dinner', hint: 'What you had, and roughly how much.' },
    } as Record<string, { label: string; hint: string }>,
    noFiguresFood: 'No figures for this food yet',
    remove: (name: string) => `Remove ${name}`,
    removeCaps: 'REMOVE',
    fromFoodsPicked: 'FROM THE FOODS PICKED',
    notEnough: 'Not enough figures to add up',
    restOfDay: 'The rest of the day',
    training: 'Training or activity',
    supplements: 'Supplements, if any',
    fluid: 'Fluid, in mL',
    bottle: 'A large bottle is about 1500 mL.',
    howItFelt: 'How it felt',
    ratings: { energy: 'Energy', recovery: 'Recovery' } as Record<string, string>,
    hydrationReading: 'Hydration reading',
    anythingElse: 'Anything else',
  },

  recallPrompt: {
    due: (position: number, of: number, done: number) =>
      `Day ${position} of ${of}. ${done} ${done === 1 ? 'day is' : 'days are'} in.`,
    waiting: (days: number, date: string) =>
      `Opens in ${days} ${days === 1 ? 'day' : 'days'}, on ${date}.`,
    fourWeeksOn: 'FOUR WEEKS ON',
    dueLabel: (position: number, of: number) => `Fill in food recall day ${position} of ${of}`,
    waitingLabel: (date: string) => `The follow-up recall opens on ${date}`,
    yourRecall: 'Your food recall',
    yourNextRecall: 'Your next food recall',
    fillFirst: 'FILL THIS IN FIRST →',
    fillIt: 'FILL IT IN →',
  },

  beforeYouStart: {
    yourSquad: 'YOUR SQUAD',
    title: 'BEFORE YOU START',
    allIn: 'ALL THREE ARE IN',
    firstJob: 'FIRST JOB',
    baselineDone: 'Baseline done. See you on day one.',
    writeDown: 'Write down three normal days of eating.',
    yourThreeDays: 'Your three recall days',
    justDay: (n: number) => `Just day ${n} for now`,
  },

  programme: {
    noDate: 'Your coach has not set the first day of the programme yet.',
    tomorrow: 'The programme starts tomorrow.',
    startsIn: (days: number, date: string) => `The programme starts in ${days} days, on ${date}.`,
    dayOf: (day: number, of: number) => `Day ${day} of ${of}.`,
  },

  learn: {
    source: (note: string) => `Source: ${note}`,
    couldNotLoad: 'Could not load the programme',
    backToToday: 'Back to today',
    todayCaps: '← TODAY',
    title: 'Learn',
    weekOpen: (week: number, theme: string | null) => `Week ${week}: ${theme ?? 'open'}`,
    weekNotWritten: (week: number) => `Week ${week}, not written yet`,
    weekCaps: (week: number) => `WEEK ${week}`,
    notWrittenYet: 'Not written yet',
    challenge: (text: string) => `Challenge: ${text}`,
    notAWeek: 'That is not a week of the programme.',
    couldNotOpen: 'Could not open this week',
    backToProgramme: 'Back to the programme',
    learnCaps: '← LEARN',
    doneToday: 'Done today ✓',
    markDone: 'Mark the challenge done',
    lastDone: (date: string) => `Last done ${date}`,
    noFigureYet: 'No figure yet',
    carbs: (g: number | string) => `${g}g carbs`,
    protein: (g: number | string) => `${g}g protein`,
  },

  gaps: {
    couldNotLoad: 'Could not load your fuel gaps',
    lastDays: (days: number) => `LAST ${days} DAYS`,
    title: 'Your fuel gaps',
    whatYourLogShows: 'WHAT YOUR LOG SHOWS',
    nothingToShow: 'NOTHING TO SHOW YET',
    everyBar: 'Every bar is one day you logged.',
    logAFewDays: 'Log a few days and this fills in on its own.',
    baselineAgainstNow: 'Baseline against now',
    backToToday: 'Back to today',
    noDaysBetween: (from: string, to: string) => `No days logged between ${from} and ${to}.`,
    daysBetween: (n: number, from: string, to: string) =>
      `${n} ${n === 1 ? 'day' : 'days'} logged between ${from} and ${to}.`,
    noWeightAthlete:
      'Both of the programme’s bands are set per kilogram of body weight, and yours is not recorded yet. Ask your coach to add it and these charts fill in.',
    noWeightCoach:
      'Both of the programme’s bands are set per kilogram of body weight, and this athlete’s is not recorded yet. Add it to their profile and these charts fill in.',
    readingTheCharts: 'READING THE CHARTS',
    inside: 'Inside the programme’s band',
    below: 'Below it',
    above: 'Above it',
    notEnough: 'Not enough recorded to say',
    nutrients: { carb: 'Carbohydrate', protein: 'Protein' } as Record<string, string>,
    sources: {
      carb: 'Week 1 deck · 5–7 g/kg training, 6–8 match, 3–4 rest',
      protein: 'Week 2 deck · 1.6–2.2 g/kg every day',
    } as Record<string, string>,
    average: (g: number) => `${g} g average`,
    programmeAsks: (min: number, max: number) => `The programme asks for ${min}–${max} g a day`,
    nothingInWindow: 'Nothing logged in this window yet.',
    noneMeasurable: (label: string, days: number) =>
      `${label} for ${days} days. None of them could be measured against the programme's band.`,
    noneYet: 'None of these days can be measured against the programme’s band yet.',
    reasons: {
      'no-weight': 'No body weight recorded, so the programme’s g/kg band cannot be worked out.',
      'no-day-type': 'No day type set, so there is no band for the day.',
      'missing-figures': 'Some foods logged have no figure in the database yet.',
    } as Record<string, string>,
    noneBelow: (label: string) => `No day fell below the programme’s ${label} band.`,
    below_: (below: number, judged: number, label: string, shortfall: number) =>
      `${below} of ${judged} recorded ${judged === 1 ? 'day' : 'days'} fell below the programme’s ${label} band, by ${shortfall} g on average.`,
  },

  progress: {
    couldNotLoad: 'Could not load your progress',
    title: 'Progress',
    assessmentsButton: 'Assessments: Week 0 vs Week 4',
    fitnessTests: 'Fitness tests',
    notMeasured: 'Not measured',
    atBaseline: (value: string) => `${value} at baseline`,
    now: (value: string) => `${value} now`,
    retestedFrom: (date: string) => `re-tested in week 4, from ${date}`,
    notRemeasured: 'not re-measured yet',
    metrics: {
      urine: 'Hydration',
      fluid: 'Fluid',
      breakfast: 'Breakfast',
      energy: 'Morning energy',
    } as Record<string, string>,
    units: {
      urine: 'on the 1–8 scale',
      fluid: 'mL a day',
      breakfast: '% of days',
      energy: 'out of 10',
    } as Record<string, string>,
    missing: {
      urine: 'No urine readings recorded yet.',
      fluid: 'Fluid has never been collected by the programme.',
      breakfast: 'The three-day recall holds this as free text, which has not been exported yet.',
      energy: 'The three-day recall holds this as free text, which has not been exported yet.',
    } as Record<string, string>,
    baseline: 'BASELINE',
    nowCaps: 'NOW',
    notMeasuredLower: 'not measured',
    days: (n: number) => `${n} days`,
    change: 'Change: ',
    trackerCalls: (note: string) => `The tracker calls this: ${note}`,
  },

  assess: {
    title: 'Assessments',
    testingMode: 'Testing mode: Week 4 is open now instead of in the programme’s fourth week.',
    coachLead: 'Week 0 and Week 4 measures for each athlete.',
    athleteLead: 'Week 0 and Week 4 measures. Leave anything you didn’t measure empty.',
    athleteCaps: 'ATHLETE',
    noAthletes: 'No athletes on this team yet.',
    phases: { pre: 'Week 0', post: 'Week 4' } as Record<string, string>,
    compare: 'Compare',
    deltaNote: 'Δ = Week 4 minus Week 0. For sprint time, negative is faster.',
    saved: (phase: string) => `${phase} saved.`,
    save: (phase: string) => `Save ${phase}`,
    fieldLabel: (label: string, phase: string) => `${label}, ${phase}`,
    autoBest: 'auto: best',
    autoAverage: 'auto: average',
    fromRecallBreakfast: (value: number, days: number) =>
      `From recall: breakfast on ${value} of ${days} days`,
    recallAverage: (value: number, days: number) =>
      `Recall average: ${value} (${days} day${days === 1 ? '' : 's'})`,
    enterNumber: 'Enter a number.',
    between: (min: number, max: number, unit: string | null) =>
      `Between ${min} and ${max}${unit ? ` ${unit}` : ''}.`,
    week4NoDate: 'Week 4 opens in the programme’s fourth week. No start date is set yet.',
    week4Before: (date: string) =>
      `Week 4 opens in the programme’s fourth week. The programme starts on ${date}.`,
    week4In: (days: number) => `Week 4 opens in ${days} day${days === 1 ? '' : 's'}.`,
    measure: 'MEASURE',
    wk0: 'WK 0',
    wk4: 'WK 4',
    /** By domain code, as the tracker sheet names its blocks. */
    domains: {} as Record<string, string>,
    /** By measure key. Empty in English: the measure's own label is the English. */
    measures: {} as Record<string, string>,
    units: {} as Record<string, string>,
    rows: {} as Record<string, string>,
    rowNotes: {} as Record<string, string>,
  },

  team: {
    couldNotLoad: 'Could not load the team',
    yourTeam: 'Your team',
    rankedOver: (days: number) => `Ranked on days logged over the last ${days} days.`,
    mvp: 'MVP THIS WEEK',
    mvpShared: 'MVP THIS WEEK — SHARED',
    playerOf: (days: number) => `PLAYER OF THE LAST ${days} DAYS`,
    playerOfShared: (days: number) => `PLAYER OF THE LAST ${days} DAYS — SHARED`,
    noTeammates: 'No teammates yet.',
    logToJoin: 'Log a meal today and you are on the board.',
    youAre: (position: string, days: number, window: number) =>
      `You are ${position} on ${days} of ${window} days.`,
    ordinal: (n: number) => {
      const rest = n % 100;
      if (rest >= 11 && rest <= 13) return `${n}th`;
      return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
    },
    someoneMissing: 'Someone missing from the board? Send them this code.',
    badges: 'Badges',
    badgeCount: (earned: number, total: number) => `${earned} of ${total}`,
    rankedNever: 'Ranked on days logged, never on weight or size.',
    rowDays: (days: number, window: number) => `${days} of ${window} days`,
    rowYou: (name: string) => `${name}, you`,
    rowLogged: (logged: boolean): string => (logged ? 'logged today' : 'not logged today'),
    you: 'YOU',
  },

  badges: {
    earned: 'Earned',
    earnedLabel: (name: string) => `${name}, earned`,
    notYetLabel: (name: string, description: string, progress: number, threshold: number) =>
      `${name}, not yet. ${description} ${progress} of ${threshold}`,
    progress: (description: string, progress: number, threshold: number) =>
      `${description} ${progress} of ${threshold}`,
    /** By badge code. Empty in English: the row's own name and description are the English. */
    names: {} as Record<string, { name: string; description: string }>,
  },

  teamCode: {
    title: 'TEAM CODE',
    label: (spaced: string) => `Team code ${spaced}`,
    copied: 'Copied ✓',
    copy: 'Copy code',
    share: 'Share',
    noClipboard: 'Could not reach the clipboard. Press and hold the code to copy it.',
    myTeam: 'my team',
    invite: (team: string, url: string, code: string) =>
      [
        `Join ${team} on Fuel Factor.`,
        '',
        url,
        '',
        `Already have the Fuel Factor app? Open it and enter the team code ${code}.`,
      ].join('\n'),
  },

  coach: {
    coachesSide: 'This is the coach’s side',
    signedInAsAthlete: 'You’re signed in as an athlete. Use a coach account to see the dashboard.',
    backToMyDay: 'Back to my day',
    couldNotLoad: 'Could not load the squad',
    coach: 'Coach',
    coachCaps: 'COACH',
    enterCode: 'Enter your coach code. It is not the same code the squad uses to join.',
    createInstead: 'Create a team instead',
    coachCodeLabel: 'Coach code',
    joining: 'Joining…',
    openDashboard: 'Open the dashboard',
    yourSquad: 'Your squad',
    loggedToday: (logged: number, total: number, days: number) =>
      `${logged} of ${total} logged today · last ${days} days`,
    /** From day 29: the dashboard shows the programme's last days. */
    programmeEnded: (date: string, logged: number, total: number, days: number) =>
      `The four weeks ended on ${date}; daily logging is closed. ${logged} of ${total} logged on the last day · its last ${days} days.`,
    noAthletes: 'No athletes on this team yet.',
    athletesJoin: 'Athletes join with this code.',
    counts: (days: number, breakfast: number) => `Logged ${days} days · breakfast ${breakfast} · `,
    noDayMeasured: 'no day could be measured against the band',
    insideBand: (inside: number, total: number) => `${inside} of ${total} days inside the band`,
    flagUnder: 'UNDER-FUELLING',
    flagHydration: 'HYDRATION',
    flagUnderDetail: (days: number) => `${days} recorded days running below the programme's band.`,
    flagDehydratedDetail: (reading: number, at: number) =>
      `Last urine reading was ${reading}. The tracker's scale calls ${at} or worse act now.`,
    seeGaps: 'See fuel gaps',
    coachSignIn: 'Coach sign-in',
    createTeam: 'Create a team',
    signedInAs: (email: string) =>
      `Signed in as ${email}. You get a link to send the squad as soon as the team exists.`,
    teamNameCaps: 'TEAM NAME',
    teamNamePlaceholder: 'Your team’s name',
    teamNameLabel: 'Team name',
    firstDayCaps: 'FIRST DAY OF THE PROGRAMME',
    firstDayPlaceholder: 'Pick the first day',
    firstDayHint: 'Logging, the ring and the streak open on this day.',
    firstDayLabel: 'First day of the programme',
    untilThisDay: (weeks: number) =>
      `Until this day the squad sees their three baseline recall days and nothing else. Logging, the ring and the streak open on it, and the app asks for the recall again ${weeks} weeks later. You can move it afterwards.`,
    creating: 'Creating…',
    createTheTeam: 'Create the team',
    teamCount: (n: number, email: string | null) =>
      `${n} ${n === 1 ? 'athlete' : 'athletes'} · signed in as ${email ?? ''}`,
    teamCodeShare: 'TEAM CODE — SHARE THIS',
    copied: 'Copied ✓',
    copyCode: 'Copy the code',
    copyMessage: 'Copy the message',
    noClipboard: 'Could not reach the clipboard. Press and hold the code to copy it.',
    sendInvite: 'Send the invite',
    linkOpens:
      'The link opens Fuel Factor in any phone’s browser, with nothing to install. The message carries the code too, for anyone who already has the app.',
    coachCodeCaps: 'COACH CODE — DO NOT SHARE',
    coachCodeNote: 'For other coaches only: it opens every athlete’s logs.',
    fourWeeks: 'The four weeks',
    notSetYet: 'Not set yet. Logging opens on this date.',
    dayOne: (date: string, weeks: number) =>
      `Day one: ${date}. Follow-up recall opens ${weeks} weeks later.`,
    setDate: 'Set the date',
    moveDate: 'Move the date',
    startToday: 'Start today',
    backToSquad: 'Back to the squad',
    squadCaps: '← SQUAD',
    notOnSquad: 'This athlete is not on your squad, or their record could not be read.',
    gapsCaps: (days: number) => `FUEL GAPS · LAST ${days} DAYS`,
    athlete: 'Athlete',
    whatTheyLogged: 'What they logged against the programme’s own targets. Every bar is one day.',
  },

  /**
   * Messages the server or a library sends in English, by their exact text,
   * lower-cased. Empty in English: the message is shown as it came.
   */
  errors: {} as Record<string, string>,

  /** Learn run week by week: the gate, the one-card lesson, the fact, the check. */
  weekly: {
    thisWeek: 'THIS WEEK',
    doneCaps: 'DONE',
    opensOn: (date: string) => `Opens ${date}`,
    lockedTitle: (week: number) => `Week ${week} is not open yet`,
    lockedBody: (date: string) => `It opens on ${date}, for the whole squad at once.`,
    backToLearn: 'Back to Learn',
    cardOf: (n: number, total: number) => `${n} of ${total}`,
    next: 'Next',
    previous: 'Back',
    showAll: 'Show the whole lesson',
    showOne: 'One card at a time',
    lessonDone: 'That’s the lesson.',
    didYouKnow: 'DID YOU KNOW?',
    hide: 'Hide',
    showFact: 'Show today’s fact',
    hideFact: 'Hide today’s fact',
    /** Where today's fact sits in the week: one part of the lesson a day. */
    dayOf: (day: number, week: number) => `Day ${day} of 7 · Week ${week}`,
    funFact: 'Today’s fun fact',
    newFact: 'New fun fact for today',
    gotIt: 'Got it!',
    partsCovered: (day: number) => `Part ${day} of 7 of this week’s lesson`,
    fromLesson: (topic: string) => `From the lesson: ${topic}`,
  },

  /** The Sunday check-in: the WEEKLY LOG tab's five questions. */
  checkin: {
    title: (week: number) => `Week ${week} check-in`,
    about: (week: number, theme: string | null) => `About week ${week}${theme ? ` · ${theme}` : ''}`,
    lead: 'Five quick questions. Your answers go into the programme’s weekly log.',
    /** The four fixed questions, as Theo sent them in the week 3 message. */
    energy: 'Average training energy last week (1–10)',
    urine: 'Average urine colour — 1 = pale/clear, 8 = dark brown',
    water: 'Average water per day (mL)',
    waterPlaceholder: 'e.g. 2000',
    waterHint: 'A large bottle is about 1500 mL.',
    breakfast: 'Breakfast last week',
    /** By the value stored, which is the English. */
    breakfastOptions: {
      'Every day': 'Every day',
      'Most days': 'Most days',
      'Some days': 'Some days',
      Skipped: 'Skipped',
    } as Record<string, string>,
    /** The week's question and its options, by their exact English. Empty: the row is the English. */
    questions: {} as Record<string, string>,
    options: {} as Record<string, string>,
    hoursPlaceholder: 'e.g. 8',
    answerPlaceholder: 'Your answer',
    fromLogs: (days: number) =>
      `Filled in from your daily logs (${days} ${days === 1 ? 'day' : 'days'}). Change anything that’s off.`,
    breakfastFromLogs: (breakfast: number, days: number) =>
      `Your log has breakfast on ${breakfast} of ${days} days.`,
    draft: 'Draft question — awaiting the dietitian’s review.',
    notes: 'Anything else (optional)',
    send: 'Send my check-in',
    sending: 'Sending…',
    update: 'Update my check-in',
    alreadyIn: (date: string) => `You checked in on ${date}. You can still change your answers.`,
    thanks: (week: number) => `Week ${week} is in.`,
    thanksBody: 'Thanks. That’s your row in the programme’s weekly log.',
    done: 'Done',
    stillNeeded: 'Answer all five to send it.',
    noQuestion: 'This week’s own question has not been set yet.',
    signIn: 'Sign in as an athlete to check in.',
    promptTitle: (week: number) => `WEEK ${week} CHECK-IN`,
    promptBody: 'Five quick questions on how the week went.',
    promptCta: 'Check in →',
    lineDone: (week: number) => `Week ${week} check-in done`,
    seeAnswers: 'See answers',
    lineUpcoming: (week: number, date: string) => `Week ${week} check-in opens ${date}`,
    statusDone: 'Checked in',
    statusNotDone: 'Not checked in yet',
  },

  /** The end-of-programme reflection: Sofia's three questions and Theo's feedback. */
  reflection: {
    title: 'Looking back',
    lead: 'Four weeks done. Tell the programme how it went.',
    rating: 'How was the programme? (1–10)',
    liked: 'Did you like it?',
    likedOptions: { Yes: 'Yes', Somewhat: 'Somewhat', No: 'No' } as Record<string, string>,
    takeaway: 'What was your best takeaway?',
    takeawayPlaceholder: 'The one thing you’ll keep doing',
    feedback: 'Anything else? Feedback on the programme or the app (optional)',
    send: 'Send my reflection',
    sending: 'Sending…',
    update: 'Update my reflection',
    alreadyIn: 'You sent this already. You can still change it.',
    needed: 'Answer the first three to send it.',
    thanks: 'Thanks for looking back.',
    thanksBody: 'Your coach and the programme can read it now.',
    done: 'Done',
    notYet: 'This opens in the last days of week 4.',
    signIn: 'Sign in as an athlete to send it.',
    promptTitle: 'FOUR WEEKS DONE',
    promptBody: 'How was it? Three quick questions.',
    promptCta: 'Look back →',
  },

  /** The coach's research export. */
  export: {
    title: 'Export data',
    lead: 'Your squad’s rows as CSV, one file per tab of the research tracker. Opens in Google Sheets or Excel.',
    sheets: {
      participants: 'Participants',
      daily_logs: 'Daily log',
      weekly_logs: 'Weekly log',
      recalls: 'Recalls',
      assessments: 'Assessments',
      programme_reflections: 'Reflections',
    } as Record<string, string>,
    details: {
      participants: 'PARTICIPANTS tab',
      daily_logs: 'DAILY LOG tab: one row per athlete per day',
      weekly_logs: 'WEEKLY LOG tab: the Sunday check-ins',
      recalls: 'RECALL tabs, one row per athlete per recall day',
      assessments: 'ASSESSMENTS tab: Week 0 and Week 4, pre and post',
      programme_reflections: 'End-of-programme reflections (not a tracker tab yet)',
    } as Record<string, string>,
    download: 'Download',
    working: 'Preparing…',
    done: (rows: number) => (rows === 1 ? 'Downloaded: 1 row.' : `Downloaded: ${rows} rows.`),
    shared: (rows: number) => (rows === 1 ? 'Shared: 1 row.' : `Shared: ${rows} rows.`),
    signIn: 'Sign in as a coach to export your squad’s data.',
  },
};

export type Strings = typeof en;
