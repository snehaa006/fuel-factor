import { evaluate, MAX_NUDGES, topNudges, type AdviceRule } from '@/lib/advice';
import { summariseDay, type LoggedItem } from '@/lib/today';
import type { TrainingSession } from '@/lib/session';

/** Midday. Only the timing tests care what the clock says. */
const NOON = 12 * 60;
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
    const nudges = evaluate(summariseDay(log, [], 68), DEMO_RULES, NOON);
    expect(nudges.map((n) => n.code)).toEqual(['no_breakfast_training_day']);
  });

  it('does not fire it once breakfast is logged', () => {
    const nudges = evaluate(summariseDay({ ...log, breakfast: true }, [oats], 68), DEMO_RULES, NOON);
    expect(nudges.map((n) => n.code)).not.toContain('no_breakfast_training_day');
  });

  it('does not fire it on a rest day', () => {
    // The rule the deck wrote is about training days. It is not generalised here.
    const nudges = evaluate(summariseDay({ ...log, day_type: 'rest' }, [], 68), DEMO_RULES, NOON);
    expect(nudges).toEqual([]);
  });

  it('fires the carbohydrate rule on a slot logged with no carbohydrate in it', () => {
    const nudges = evaluate(summariseDay({ ...log, breakfast: true }, [oats, carbless], 68), DEMO_RULES, NOON);
    expect(nudges.map((n) => n.code)).toEqual(['no_carbs_in_slot']);
  });

  it('does not fire it for a portion whose figure is simply missing', () => {
    // Null is "not supplied yet", not "contains no carbohydrate". Firing on it
    // would tell an athlete their mie instan had no carbs, which is invented.
    const unknown: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: null, name: 'Mie instan' };
    const nudges = evaluate(summariseDay({ ...log, breakfast: true }, [oats, unknown], 68), DEMO_RULES, NOON);
    expect(nudges).toEqual([]);
  });

  it('carries the rule’s sentence through unedited', () => {
    const [nudge] = evaluate(summariseDay(log, [], 68), DEMO_RULES, NOON);
    expect(nudge.message).toBe(
      'Eat breakfast every training day, even a pisang or roti with telur. No training on empty.'
    );
  });

  it('marks a seed rule as unreviewed', () => {
    const [nudge] = evaluate(summariseDay(log, [], 68), DEMO_RULES, NOON);
    expect(nudge.reviewed).toBe(false);
  });

  it('marks a rule the dietitian has signed off as reviewed', () => {
    const signed: AdviceRule[] = [{ ...DEMO_RULES[0], reviewed_by: 'Sofia' }];
    expect(evaluate(summariseDay(log, [], 68), signed, NOON)[0].reviewed).toBe(true);
  });

  it('composes nothing of its own when a rule is missing from the table', () => {
    // The app never writes advice copy. No row, no card.
    expect(evaluate(summariseDay(log, [], 68), [], NOON)).toEqual([]);
  });

  it('shows the most severe rule first', () => {
    const summary = summariseDay(log, [carbless], 68);
    expect(evaluate(summary, DEMO_RULES, NOON).map((n) => n.severity)).toEqual([2, 1]);
    expect(topNudges(summary, DEMO_RULES, NOON)[0].code).toBe('no_breakfast_training_day');
  });

  it('has no card for a quiet day', () => {
    expect(topNudges(summariseDay({ ...log, day_type: 'rest' }, [], 68), DEMO_RULES, NOON)).toEqual([]);
  });

  describe('the hydration rule', () => {
    // The threshold is the seeded rule's own: the tracker's scale reads 5 as
    // "drink more today" and 6 as "dehydrated -- drink immediately".
    it('fires at 5, where the programme\u2019s scale says act', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 5 }, [], 68);
      expect(evaluate(summary, DEMO_RULES, NOON).map((n) => n.code)).toEqual(['urine_five_or_worse']);
    });

    it('fires at 6, Theo\u2019s own baseline reading', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 6 }, [], 68);
      expect(evaluate(summary, DEMO_RULES, NOON).map((n) => n.code)).toEqual(['urine_five_or_worse']);
    });

    it('stays quiet at 4', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 4 }, [], 68);
      expect(evaluate(summary, DEMO_RULES, NOON)).toEqual([]);
    });

    it('stays quiet before the check-in is filled', () => {
      // Null is "not answered", which is not a reading of 1 and not a reading
      // of 8. An unfilled check-in fires nothing.
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: null }, [], 68);
      expect(evaluate(summary, DEMO_RULES, NOON)).toEqual([]);
    });

    it('carries the deck\u2019s sentence through unedited', () => {
      const summary = summariseDay({ ...log, day_type: 'rest', urine_colour: 6 }, [], 68);
      expect(evaluate(summary, DEMO_RULES, NOON)[0].message).toBe(
        'Losing 2% of your body weight to dehydration cuts sprint speed by about 10%.'
      );
    });
  });

  describe('the timing rules', () => {
    const SESSION: TrainingSession = { startsAt: 16 * 60 + 30, endsAt: 18 * 60 };
    const rest = { ...log, day_type: 'rest' as const };
    const at = (h: number, m = 0) => h * 60 + m;

    function summary(session: TrainingSession = SESSION, over: Partial<typeof log> = {}) {
      return summariseDay({ ...log, ...over }, [], 68, session);
    }

    it('fires neither when no session has been recorded', () => {
      // The whole reason both sat dormant: a window measured against nothing.
      const none = summariseDay({ ...rest, breakfast: true }, [], 68);
      expect(evaluate(none, DEMO_RULES, at(23))).toEqual([]);
    });

    describe('the pre-training meal', () => {
      it('fires inside the two hours before the session', () => {
        expect(evaluate(summary(), DEMO_RULES, at(15)).map((n) => n.code))
          .toContain('pre_training_meal');
      });

      it('fires exactly at the two-hour mark', () => {
        expect(evaluate(summary(), DEMO_RULES, at(14, 30)).map((n) => n.code))
          .toContain('pre_training_meal');
      });

      it('stays quiet before the window opens', () => {
        expect(evaluate(summary(), DEMO_RULES, at(14, 29)).map((n) => n.code))
          .not.toContain('pre_training_meal');
      });

      it('stops once the session has begun', () => {
        // Telling an athlete to eat two hours before training, during
        // training, is advice about a moment that has gone.
        expect(evaluate(summary(), DEMO_RULES, at(16, 30)).map((n) => n.code))
          .not.toContain('pre_training_meal');
      });

      it('stays quiet once the pre-training slot is logged', () => {
        const logged = summary(SESSION, { pre_training: true });
        expect(evaluate(logged, DEMO_RULES, at(15)).map((n) => n.code))
          .not.toContain('pre_training_meal');
      });

      it('does not fire on a rest day', () => {
        const day = summariseDay({ ...rest, breakfast: true }, [], 68, SESSION);
        expect(evaluate(day, DEMO_RULES, at(15))).toEqual([]);
      });

      it('needs the start, not the end', () => {
        const endOnly = summary({ startsAt: null, endsAt: 18 * 60 });
        expect(evaluate(endOnly, DEMO_RULES, at(15)).map((n) => n.code))
          .not.toContain('pre_training_meal');
      });
    });

    describe('the refuel window', () => {
      it('fires once thirty minutes have passed since the session ended', () => {
        expect(evaluate(summary(), DEMO_RULES, at(18, 30)).map((n) => n.code))
          .toContain('refuel_window_open');
      });

      it('stays quiet while the window is still open', () => {
        expect(evaluate(summary(), DEMO_RULES, at(18, 29)).map((n) => n.code))
          .not.toContain('refuel_window_open');
      });

      it('stays quiet during the session', () => {
        expect(evaluate(summary(), DEMO_RULES, at(17)).map((n) => n.code))
          .not.toContain('refuel_window_open');
      });

      it('stays up well after the window, because that athlete still has not eaten', () => {
        expect(evaluate(summary(), DEMO_RULES, at(21)).map((n) => n.code))
          .toContain('refuel_window_open');
      });

      it('stops once the post-training slot is logged', () => {
        const logged = summary(SESSION, { post_training: true });
        expect(evaluate(logged, DEMO_RULES, at(21)).map((n) => n.code))
          .not.toContain('refuel_window_open');
      });

      it('fires on a rest day too, because a session was recorded', () => {
        // The rule is about having trained, not about the Day Type column.
        const day = summariseDay({ ...rest, breakfast: true }, [], 68, SESSION);
        expect(evaluate(day, DEMO_RULES, at(21)).map((n) => n.code))
          .toEqual(['refuel_window_open']);
      });

      it('needs the end, not the start', () => {
        const startOnly = summary({ startsAt: 16 * 60 + 30, endsAt: null });
        expect(evaluate(startOnly, DEMO_RULES, at(21)).map((n) => n.code))
          .not.toContain('refuel_window_open');
      });
    });
  });

  describe('the card stack', () => {
    it('carries at most two cards', () => {
      // A training day with breakfast unlogged, a carbless slot and a bad
      // reading fires three rules. The screen shows two.
      const summary = summariseDay({ ...log, urine_colour: 6 }, [carbless], 68);
      expect(evaluate(summary, DEMO_RULES, NOON)).toHaveLength(3);
      expect(topNudges(summary, DEMO_RULES, NOON)).toHaveLength(MAX_NUDGES);
    });

    it('drops the least severe rule when it has to drop one', () => {
      const summary = summariseDay({ ...log, urine_colour: 6 }, [carbless], 68);
      expect(topNudges(summary, DEMO_RULES, NOON).map((n) => n.code)).not.toContain('no_carbs_in_slot');
    });

    it('keeps evaluation order for rules of equal severity', () => {
      // Breakfast and hydration are both severity 2. Neither domain is ranked
      // above the other here, so the order the engine evaluated them in stands.
      const summary = summariseDay({ ...log, urine_colour: 6 }, [], 68);
      expect(topNudges(summary, DEMO_RULES, NOON).map((n) => n.code)).toEqual([
        'no_breakfast_training_day',
        'urine_five_or_worse',
      ]);
    });

    it('does not pad the stack when only one rule fires', () => {
      expect(topNudges(summariseDay(log, [], 68), DEMO_RULES, NOON)).toHaveLength(1);
    });
  });
});
