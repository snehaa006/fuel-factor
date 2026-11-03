import { hasNutrient } from './nutrients';
import type { Minutes } from './session';
import { hasSessionDay, PROTEIN_PER_MEAL_MAX_G, PROTEIN_WEEK } from './targets';
import type { DaySummary, MealSlot } from './today';
import type { Tables } from './database.types';

export type AdviceRule = Pick<
  Tables<'advice_rules'>,
  'code' | 'domain' | 'message_en' | 'severity' | 'reviewed_by'
> &
  /** Which week's deck the sentence is from, e.g. 'week-2-deck'. Absent on older rows. */
  Partial<Pick<Tables<'advice_rules'>, 'source'>>;

export type Nudge = {
  code: string;
  domain: string;
  message: string;
  severity: number;
  /** False while the rule is still a seed row the dietitian has not signed off. */
  reviewed: boolean;
  /** The deck the sentence came from, so the card can say which week's material it is. */
  source?: string;
};

/**
 * The reading at which the tracker's own scale stops describing and starts
 * instructing. Not a threshold the app chose: the seeded rule's trigger names
 * it, and the workbook's wording for 5 is already "drink more today".
 */
const URINE_ACT_NOW = 5;

/**
 * The two windows the timing rules measure, in minutes.
 *
 * Both are the programme's. The refuel rule's own trigger says "nothing has
 * been logged in the 30 minutes since" and its sentence says "refuel within 30
 * minutes"; the pre-training rule's says "still unlogged two hours before the
 * session". The app supplies the clock, never the number.
 */
const REFUEL_WINDOW_MIN = 30;
const PRE_TRAINING_WINDOW_MIN = 120;

/**
 * How many cards the screen will carry at once.
 *
 * The brief caps advice at two or three. Two is the app-side call: a third
 * pushes the meal timeline off a phone screen, and a stack of advice reads as
 * nagging rather than as help.
 */
export const MAX_NUDGES = 2;

/**
 * Which rules today's log fires.
 *
 * The engine evaluates plain events only -- a slot logged with no carbohydrate,
 * a training-day breakfast still unlogged, a urine reading the programme's own
 * scale calls act-now -- and the card it shows is the rule's own sentence,
 * unedited. No threshold is computed here and no message is composed here;
 * both belong to the programme.
 *
 * The two timing rules need a clock, so they fire only once the athlete has
 * said when the session is. An unrecorded session fires nothing: the deck's
 * windows are measured against a time the athlete supplied or against nothing
 * at all, never against a guess.
 *
 * `now` is passed in rather than read here. This module stays pure -- it is
 * the one place a nutrition rule is turned into a card, and it should be
 * answerable at any time of day in a test without mocking a clock.
 */
export function evaluate(
  summary: DaySummary,
  rules: AdviceRule[],
  now: Minutes,
  programmeWeek = 1
): Nudge[] {
  const byCode = new Map(rules.map((r) => [r.code, r]));
  const fired: string[] = [];

  const breakfast = summary.slots.find((s) => s.slot === 'breakfast');
  if (hasSessionDay(summary.dayType) && breakfast && !breakfast.logged) {
    fired.push('no_breakfast_training_day');
  }

  // A slot the athlete logged food into, where nothing in it carries carbohydrate.
  const carbless = summary.slots.some(
    (s) => s.items.length > 0 && s.items.every((i) => i.carbs_g === 0)
  );
  if (carbless) fired.push('no_carbs_in_slot');

  // Null is "the check-in has not been filled", which fires nothing.
  if (summary.urineColour !== null && summary.urineColour >= URINE_ACT_NOW) {
    fired.push('urine_five_or_worse');
  }

  const { startsAt, endsAt } = summary.session;
  const slotLogged = (slot: MealSlot) =>
    summary.slots.find((s) => s.slot === slot)?.logged ?? false;

  // The last two hours before the session, and not after it has begun: once
  // training has started, telling the athlete to eat two hours beforehand is
  // advice about a moment that has gone.
  if (
    hasSessionDay(summary.dayType) &&
    startsAt !== null &&
    !slotLogged('pre_training') &&
    now >= startsAt - PRE_TRAINING_WINDOW_MIN &&
    now < startsAt
  ) {
    fired.push('pre_training_meal');
  }

  // The window has opened and nothing has gone into the post-training slot.
  // It stays up after the 30 minutes have run out, because the athlete who
  // has not eaten is exactly the one the card is for.
  if (endsAt !== null && !slotLogged('post_training') && now >= endsAt + REFUEL_WINDOW_MIN) {
    fired.push('refuel_window_open');
  }

  // Protein is taught in week 2. Before it, nothing is said about protein:
  // an athlete told off for a carb-only breakfast in week 1 has been graded
  // on a lesson they have not had.
  if (programmeWeek >= PROTEIN_WEEK) {
    const slot = (s: MealSlot) => summary.slots.find((x) => x.slot === s);
    const loggedWithout = (s: MealSlot) => {
      const state = slot(s);
      return (
        state !== undefined &&
        state.items.length > 0 &&
        !state.items.some((i) => hasNutrient(i, 'protein'))
      );
    };

    if (loggedWithout('breakfast')) fired.push('no_protein_breakfast');
    if (loggedWithout('lunch') || loggedWithout('dinner')) fired.push('no_protein_in_meal');
    if (loggedWithout('post_training')) fired.push('post_training_no_protein');

    // The one rule here that reads a computed figure: the deck's own line
    // that above 35 g a meal adds no muscle protein synthesis.
    const dinner = slot('dinner')?.protein_g ?? null;
    if (dinner !== null && dinner > PROTEIN_PER_MEAL_MAX_G) fired.push('protein_piled_at_dinner');
  }

  return fired
    .map((code) => byCode.get(code))
    .filter((rule): rule is AdviceRule => rule !== undefined)
    .map((rule) => ({
      code: rule.code,
      domain: rule.domain,
      message: rule.message_en,
      severity: rule.severity,
      reviewed: rule.reviewed_by !== null,
      source: rule.source,
    }))
    // Severity is the rule row's own. Ties keep evaluation order rather than
    // being broken here, because ranking one domain above another -- hydration
    // over carbohydrate -- would be a judgement the programme has not made.
    .sort((a, b) => b.severity - a.severity);
}

/** The cards the screen shows, most severe first, capped at {@link MAX_NUDGES}. */
export function topNudges(
  summary: DaySummary,
  rules: AdviceRule[],
  now: Minutes,
  limit = MAX_NUDGES,
  programmeWeek = 1
): Nudge[] {
  return evaluate(summary, rules, now, programmeWeek).slice(0, Math.max(limit, 0));
}
