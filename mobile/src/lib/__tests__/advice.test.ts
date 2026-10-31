import { evaluate, MAX_NUDGES, topNudges, type AdviceRule } from '@/lib/advice';
import { summariseDay, type LoggedItem } from '@/lib/today';
import { DEMO_RULES } from '@/lib/__fixtures__/today';

const log = {
  day_type: 'training' as const,
  dq_score: null,
  urine_colour: null,
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
    expect(topNudges(summary, DEMO_RULES)[0].code).toBe('no_breakfast_training_day');
  });

  it('has no card for a quiet day', () => {
    expect(topNudges(summariseDay({ ...log, day_type: 'rest' }, [], 68), DEMO_RULES)).toEqual([]);
  });

  describe('the hydration rule', () => {
    // The threshold is the seeded rule's own: the tracker's scale reads 5 as
    // "drink more today" and 6 as "dehydrated -- drink immediately".
    it('fires at 5, where the programme\u2019s scale says act', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 5 }, [], 68);
      expect(evaluate(summary, DEMO_RULES).map((n) => n.code)).toEqual(['urine_five_or_worse']);
    });

    it('fires at 6, Theo\u2019s own baseline reading', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 6 }, [], 68);
      expect(evaluate(summary, DEMO_RULES).map((n) => n.code)).toEqual(['urine_five_or_worse']);
    });

    it('stays quiet at 4', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 4 }, [], 68);
      expect(evaluate(summary, DEMO_RULES)).toEqual([]);
    });

    it('stays quiet before the check-in is filled', () => {
      // Null is "not answered", which is not a reading of 1 and not a reading
      // of 8. An unfilled check-in fires nothing.
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: null }, [], 68);
      expect(evaluate(summary, DEMO_RULES)).toEqual([]);
    });

    it('carries the deck\u2019s sentence through unedited', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 6 }, [], 68);
      expect(evaluate(summary, DEMO_RULES)[0].message).toBe(
        'Losing 2% of your body weight to dehydration cuts sprint speed by about 10%.'
      );
    });
  });

  describe('the card stack', () => {
    it('carries at most two cards', () => {
      // A training day with breakfast unlogged, a carbless slot and a bad
      // reading fires three rules. The screen shows two.
      const summary = summariseDay({ ...log, urine_colour: 6 }, [carbless], 68);
      expect(evaluate(summary, DEMO_RULES)).toHaveLength(3);
      expect(topNudges(summary, DEMO_RULES)).toHaveLength(MAX_NUDGES);
    });

    it('drops the least severe rule when it has to drop one', () => {
      const summary = summariseDay({ ...log, urine_colour: 6 }, [carbless], 68);
      expect(topNudges(summary, DEMO_RULES).map((n) => n.code)).not.toContain('no_carbs_in_slot');
    });

    it('keeps evaluation order for rules of equal severity', () => {
      // Breakfast and hydration are both severity 2. Neither domain is ranked
      // above the other here, so the order the engine evaluated them in stands.
      const summary = summariseDay({ ...log, urine_colour: 6 }, [], 68);
      expect(topNudges(summary, DEMO_RULES).map((n) => n.code)).toEqual([
        'no_breakfast_training_day',
        'urine_five_or_worse',
      ]);
    });

    it('does not pad the stack when only one rule fires', () => {
      expect(topNudges(summariseDay(log, [], 68), DEMO_RULES)).toHaveLength(1);
    });
  });
});
