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
 * Which rules today's log fires.
 *
 * The engine evaluates plain events only -- a slot logged with no carbohydrate,
 * a training-day breakfast still unlogged -- and the card it shows is the
 * rule's own sentence, unedited. No threshold is computed here and no message
 * is composed here; both belong to the programme.
 *
 * Only the two rules that today's data can actually answer are evaluated. The
 * timing rules need a session time and the hydration rule needs the evening
 * check-in, so they stay dormant until those screens exist rather than firing
 * on a guess.
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
    .sort((a, b) => b.severity - a.severity);
}

/** The screen shows one card. The most severe rule wins. */
export function topNudge(summary: DaySummary, rules: AdviceRule[]): Nudge | null {
  return evaluate(summary, rules)[0] ?? null;
}
