import { evaluate, topNudge, type AdviceRule } from '@/lib/advice';
import { summariseDay, type LoggedItem } from '@/lib/today';
import { DEMO_RULES } from '@/lib/__fixtures__/today';

const log = {
  day_type: 'training' as const,
  dq_score: null,
  breakfast: false,
  pre_training: false,
  lunch: false,
  post_training: false,
  dinner: false,
  evening_snack: false,
};

const oats: LoggedItem = { slot: 'breakfast', quantity: 1, carbs_g: 54, name: 'Oat' };
const carbless: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: 0, name: 'Ayam goreng' };

describe('the advice engine', () => {
  it('fires the breakfast rule on a training day with breakfast unlogged', () => {
    const nudges = evaluate(summariseDay(log, [], 68), DEMO_RULES);
    expect(nudges.map((n) => n.code)).toEqual(['no_breakfast_training_day']);
  });

  it('does not fire it once breakfast is logged', () => {
    const nudges = evaluate(summariseDay({ ...log, breakfast: true }, [oats], 68), DEMO_RULES);
    expect(nudges.map((n) => n.code)).not.toContain('no_breakfast_training_day');
  });

  it('does not fire it on a rest day', () => {
    // The rule the deck wrote is about training days. It is not generalised here.
    const nudges = evaluate(summariseDay({ ...log, day_type: 'rest' }, [], 68), DEMO_RULES);
    expect(nudges).toEqual([]);
  });

  it('fires the carbohydrate rule on a slot logged with no carbohydrate in it', () => {
    const nudges = evaluate(summariseDay({ ...log, breakfast: true }, [oats, carbless], 68), DEMO_RULES);
    expect(nudges.map((n) => n.code)).toEqual(['no_carbs_in_slot']);
  });

  it('does not fire it for a portion whose figure is simply missing', () => {
    // Null is "not supplied yet", not "contains no carbohydrate". Firing on it
    // would tell an athlete their mie instan had no carbs, which is invented.
    const unknown: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: null, name: 'Mie instan' };
    const nudges = evaluate(summariseDay({ ...log, breakfast: true }, [oats, unknown], 68), DEMO_RULES);
    expect(nudges).toEqual([]);
  });

  it('carries the rule’s sentence through unedited', () => {
    const [nudge] = evaluate(summariseDay(log, [], 68), DEMO_RULES);
    expect(nudge.message).toBe(
      'Eat breakfast every training day, even a pisang or roti with telur. No training on empty.'
    );
  });

  it('marks a seed rule as unreviewed', () => {
    const [nudge] = evaluate(summariseDay(log, [], 68), DEMO_RULES);
    expect(nudge.reviewed).toBe(false);
  });

  it('marks a rule the dietitian has signed off as reviewed', () => {
    const signed: AdviceRule[] = [{ ...DEMO_RULES[0], reviewed_by: 'Sofia' }];
    expect(evaluate(summariseDay(log, [], 68), signed)[0].reviewed).toBe(true);
  });

  it('composes nothing of its own when a rule is missing from the table', () => {
    // The app never writes advice copy. No row, no card.
    expect(evaluate(summariseDay(log, [], 68), [])).toEqual([]);
  });

  it('shows the most severe rule first', () => {
    const summary = summariseDay(log, [carbless], 68);
    expect(evaluate(summary, DEMO_RULES).map((n) => n.severity)).toEqual([2, 1]);
    expect(topNudge(summary, DEMO_RULES)?.code).toBe('no_breakfast_training_day');
  });

  it('has no card for a quiet day', () => {
    expect(topNudge(summariseDay({ ...log, day_type: 'rest' }, [], 68), DEMO_RULES)).toBeNull();
  });
});
