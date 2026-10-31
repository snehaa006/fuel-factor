import type { MascotMotion, MascotPose } from '@/components/mascot';

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
 * A test asserts the whole vocabulary against that rule.
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
export function dayCue(loggedSlots: number, totalSlots: number): MascotCue {
  if (loggedSlots <= 0) {
    return {
      pose: 'stand',
      eyebrow: 'READY WHEN YOU ARE',
      message: 'Nothing logged yet today. Start with whatever you ate last.',
      motion: 'enter',
    };
  }

  if (loggedSlots >= totalSlots) {
    return {
      pose: 'best',
      eyebrow: 'ALL SIX',
      message: 'Every slot logged today. That is the whole day on the board.',
      motion: 'celebrate',
    };
  }

  return {
    pose: 'fuel',
    eyebrow: 'IN PROGRESS',
    message: `${loggedSlots} of ${totalSlots} slots logged today.`,
    motion: 'idle',
  };
}

/** The Team screen, by how far along the badge ladder the athlete is. */
export function badgeCue(earned: number, total: number): MascotCue {
  if (earned <= 0) {
    return {
      pose: 'think',
      eyebrow: 'NOTHING YET',
      message: 'No badges yet. The first one only asks you to log once.',
      motion: 'enter',
    };
  }

  if (earned >= total) {
    return {
      pose: 'best',
      eyebrow: 'THE LOT',
      message: 'Every badge earned. There is nothing left on the ladder.',
      motion: 'celebrate',
    };
  }

  return {
    pose: 'best',
    eyebrow: 'EARNED',
    message: `${earned} of ${total} badges. The next one is right below.`,
    motion: 'idle',
  };
}

/** The Learn section's cover. */
export const LEARN_CUE: MascotCue = {
  pose: 'learn',
  eyebrow: 'FOUR WEEKS',
  message: 'One theme a week, with a challenge to go with it.',
  motion: 'enter',
};

/** The consent gate, where the app introduces itself. */
export const WELCOME_CUE: MascotCue = {
  pose: 'float',
  eyebrow: 'FUEL FACTOR',
  message: 'Log what you eat, keep your streak, and see how the squad is doing.',
  motion: 'enter',
};

/** Progress, which is mostly a screen about what has not been measured yet. */
export const PROGRESS_CUE: MascotCue = {
  pose: 'think',
  eyebrow: 'BEFORE AND AFTER',
  message: 'Your three-day baseline against everything you have logged since.',
  motion: 'enter',
};

/** Every line the mascot can say, for the test that holds it to its lane. */
export const ALL_CUES: MascotCue[] = [
  dayCue(0, 6),
  dayCue(3, 6),
  dayCue(6, 6),
  badgeCue(0, 7),
  badgeCue(3, 7),
  badgeCue(7, 7),
  LEARN_CUE,
  WELCOME_CUE,
  PROGRESS_CUE,
];
