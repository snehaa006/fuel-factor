import type { MascotMotion, MascotPose } from '@/components/mascot';
import { en } from '@/i18n/en';
import { id } from '@/i18n/id';
import type { Strings } from '@/i18n';

/**
 * What the mascot says, and which pose says it.
 *
 * Pure, so every line the character can utter is in one file and a test can
 * read all of them at once. That matters more here than anywhere else in the
 * app: a cartoon astronaut is the most persuasive voice on the screen and the
 * least qualified one.
 *
 * **The mascot never says anything about food.** Every line below is about
 * logging, streaks, badges or challenges -- the app's own side, which needs
 * nobody's sign-off. The programme's sentences go through `NudgeCard`, which
 * carries a rule code and a source and can be reviewed. A line like "eat more
 * carbohydrate" in a speech bubble would be unreviewed dietary advice given to
 * a 14-year-old by a mascot, which is the single worst place to put it.
 *
 * A test asserts the whole vocabulary against that rule, in both languages.
 *
 * Every cue takes the dictionary to speak from and defaults to English. The
 * screens pass the one `useStrings()` gives them; the constants at the bottom
 * are the English cues, kept for the tests.
 */

export type MascotCue = {
  pose: MascotPose;
  message: string;
  motion: MascotMotion;
  eyebrow?: string;
};

/**
 * Today, by how much of the day has been recorded.
 *
 * Counts slots filled, never what filled them: a day of nasi goreng and a day
 * of ubi jalar get the same line, because the mascot is counting the logging
 * and the app has no business grading the food.
 */
export function dayCue(loggedSlots: number, totalSlots: number, t: Strings = en): MascotCue {
  const m = t.mascot;
  if (loggedSlots <= 0) {
    return {
      pose: 'stand',
      eyebrow: m.readyWhenYouAre,
      message: m.nothingLogged,
      // A hop every few seconds, to pull an eye back to something undone.
      motion: 'nudge',
    };
  }

  if (loggedSlots >= totalSlots) {
    return { pose: 'best', eyebrow: m.allSix, message: m.everyMeal, motion: 'celebrate' };
  }

  return {
    pose: 'fuel',
    eyebrow: m.inProgress,
    message: m.slotsLogged(loggedSlots, totalSlots),
    motion: 'idle',
  };
}

/** The Team screen, by how far along the badge ladder the athlete is. */
export function badgeCue(earned: number, total: number, t: Strings = en): MascotCue {
  const m = t.mascot;
  if (earned <= 0) {
    return { pose: 'think', eyebrow: m.nothingYet, message: m.firstBadge, motion: 'nudge' };
  }

  if (earned >= total) {
    return { pose: 'best', eyebrow: m.theLot, message: m.everyBadge, motion: 'celebrate' };
  }

  return { pose: 'best', eyebrow: m.earned, message: m.badgesEarned(earned, total), motion: 'idle' };
}

/** The Learn section's cover. */
export function learnCue(t: Strings = en): MascotCue {
  return { pose: 'learn', eyebrow: t.mascot.fourWeeks, message: t.mascot.learnLine, motion: 'enter' };
}

/** The consent gate, where the app introduces itself. */
export function welcomeCue(t: Strings = en): MascotCue {
  return { pose: 'float', eyebrow: t.mascot.fuelFactor, message: t.mascot.welcomeLine, motion: 'enter' };
}

/** Progress, which is mostly a screen about what has not been measured yet. */
export function progressCue(t: Strings = en): MascotCue {
  return {
    pose: 'think',
    eyebrow: t.mascot.beforeAndAfter,
    message: t.mascot.progressLine,
    motion: 'enter',
  };
}

/**
 * A write the database refused.
 *
 * The mascot's own words are fixed and vetted like every other line here.
 * The refusal's own text is passed to the banner as `detail` and shown
 * beneath, so what the database said is never put in the mascot's mouth --
 * an arbitrary server message cannot be held to the vocabulary rule below,
 * and should not pretend to be the character speaking.
 */
export function saveFailedCue(t: Strings = en): MascotCue {
  return { pose: 'think', eyebrow: t.mascot.didNotSave, message: t.mascot.saveFailed, motion: 'shake' };
}

export const LEARN_CUE = learnCue();
export const WELCOME_CUE = welcomeCue();
export const PROGRESS_CUE = progressCue();
export const SAVE_FAILED_CUE = saveFailedCue();

function cuesIn(t: Strings): MascotCue[] {
  return [
    dayCue(0, 6, t),
    dayCue(3, 6, t),
    dayCue(6, 6, t),
    badgeCue(0, 7, t),
    badgeCue(3, 7, t),
    badgeCue(7, 7, t),
    learnCue(t),
    welcomeCue(t),
    progressCue(t),
    saveFailedCue(t),
  ];
}

/** Every line the mascot can say, in English, for the test that holds it to its lane. */
export const ALL_CUES: MascotCue[] = cuesIn(en);

/** The same lines in Bahasa Indonesia, held to the same lane. */
export const ALL_CUES_ID: MascotCue[] = cuesIn(id);
