import type { DaySummary } from './today';
import type { Tables } from './database.types';

export type AdviceRule = Pick<
  Tables<'advice_rules'>,
  'code' | 'domain' | 'message_en' | 'severity' | 'reviewed_by'
>;

export type Nudge = {
  code: string;
  domain: string;
  message: string;
  severity: number;
  /** False while the rule is still a seed row the dietitian has not signed off. */
  reviewed: boolean;
};

/**
 * The reading at which the tracker's own scale stops describing and starts
 * instructing. Not a threshold the app chose: the seeded rule's trigger names
 * it, and the workbook's wording for 5 is already "drink more today".
 */
const URINE_ACT_NOW = 5;

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
 * The two timing rules stay dormant. They fire relative to a training session,
 * and the app records no session time -- neither does the tracker, which has no
 * column for one. Firing them off a guessed clock would put the deck's
 * 30-minute window against a time nobody supplied.
 */
export function evaluate(summary: DaySummary, rules: AdviceRule[]): Nudge[] {
  const byCode = new Map(rules.map((r) => [r.code, r]));
  const fired: string[] = [];

  const breakfast = summary.slots.find((s) => s.slot === 'breakfast');
  if (summary.dayType === 'training' && breakfast && !breakfast.logged) {
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

  return fired
    .map((code) => byCode.get(code))
    .filter((rule): rule is AdviceRule => rule !== undefined)
    .map((rule) => ({
      code: rule.code,
      domain: rule.domain,
      message: rule.message_en,
      severity: rule.severity,
      reviewed: rule.reviewed_by !== null,
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
  limit = MAX_NUDGES
): Nudge[] {
  return evaluate(summary, rules).slice(0, Math.max(limit, 0));
}
