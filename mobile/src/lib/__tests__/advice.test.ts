import { evaluate, MAX_NUDGES, sourceWeek, topNudges, type AdviceRule } from '@/lib/advice';
import { summariseDay, type LoggedItem } from '@/lib/today';
import type { TrainingSession } from '@/lib/session';
import { DEMO_RULES } from '@/lib/__fixtures__/today';

/** Midday. Only the timing tests care what the clock says. */
const NOON = 12 * 60;

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

describe('the week 2 protein rules', () => {
  const eggs: LoggedItem = { slot: 'breakfast', quantity: 1, carbs_g: null, protein_g: 18, name: 'Telur', proteinSource: true };
  const nasiLunch: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: 57, protein_g: null, name: 'Nasi putih', carbSource: true };
  const tempeLunch: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: null, protein_g: 19, name: 'Tempe', proteinSource: true };
  const day = (items: LoggedItem[]) => summariseDay({ ...log, breakfast: true }, items, 68);
  const codes = (items: LoggedItem[], week: number) =>
    evaluate(day(items), DEMO_RULES, NOON, week).map((n) => n.code);

  it('says nothing about protein in week 1, before it is taught', () => {
    expect(codes([oats, nasiLunch], 1).filter((c) => c.includes('protein'))).toEqual([]);
  });

  it('from week 2, flags a breakfast with no protein in it', () => {
    expect(codes([oats, tempeLunch], 2)).toEqual(['no_protein_breakfast']);
  });

  it('flags a lunch or dinner with no protein in it', () => {
    expect(codes([eggs, nasiLunch], 2)).toEqual(['no_protein_in_meal']);
  });

  it('counts tahu, which the deck names but gives no figure for', () => {
    const tahu: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: null, protein_g: null, name: 'Tahu', proteinSource: true };
    expect(codes([eggs, tahu], 2)).toEqual([]);
  });

  it('says nothing about a meal that has not been logged', () => {
    expect(codes([eggs], 2)).toEqual([]);
  });

  it('flags a post-training entry with no protein', () => {
    const pisang: LoggedItem = { slot: 'post_training', quantity: 1, carbs_g: 27, protein_g: null, name: 'Pisang', carbSource: true };
    expect(codes([eggs, tempeLunch, pisang], 2)).toEqual(['post_training_no_protein']);
  });

  it('flags dinner past the deck’s 35 g a meal, and not at it', () => {
    const chicken = (q: number): LoggedItem => ({
      slot: 'dinner', quantity: q, carbs_g: null, protein_g: 24 * q, name: 'Ayam dada', proteinSource: true,
    });
    // 24 g sits inside the 25-35 g sweet spot's ceiling; 36 g and 48 g are past it.
    expect(codes([eggs, tempeLunch, chicken(1)], 2)).toEqual([]);
    expect(codes([eggs, tempeLunch, chicken(1.5)], 2)).toEqual(['protein_piled_at_dinner']);
    expect(codes([eggs, tempeLunch, chicken(2)], 2)).toEqual(['protein_piled_at_dinner']);
  });

  it('carries the deck’s sentence through unedited', () => {
    const [nudge] = evaluate(day([oats, tempeLunch]), DEMO_RULES, NOON, 2);
    expect(nudge.message).toBe(
      'Starting your day at 0g protein means an entire repair window is missed before training even begins.'
    );
  });
});

/** What the week 3 and 4 tests change on the base log. */
type LogOver = {
  day_type?: 'training' | 'match' | 'rest';
  urine_colour?: number | null;
  dinner?: boolean;
  pre_training?: boolean;
};

describe('the week 3 recovery rules', () => {
  const day = { ...log, breakfast: true };
  // A dinner the week 2 protein rules have nothing to say about, so only week 3's speak.
  const rice: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: 57, name: 'Nasi Putih', carbSource: true };
  const chicken: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: 0, protein_g: 24, name: 'Ayam Dada', proteinSource: true };
  const snack = (name: string): LoggedItem => ({ slot: 'evening_snack', quantity: 1, carbs_g: null, name });
  const codes = (over: LogOver, items: LoggedItem[], week: number) =>
    evaluate(summariseDay({ ...day, ...over }, items, 68), DEMO_RULES, NOON, week).map((n) => n.code);

  describe('the pre-sleep snack', () => {
    it('fires on a training night with dinner in and no milk or banana, from week 3', () => {
      expect(codes({}, [rice, chicken], 3)).toEqual(['no_presleep_snack_training_night']);
    });

    it('says nothing in weeks 1 and 2, before sleep is taught', () => {
      expect(codes({}, [rice, chicken], 1)).toEqual([]);
      expect(codes({}, [rice, chicken], 2)).not.toContain('no_presleep_snack_training_night');
    });

    it('keeps firing in week 4', () => {
      expect(codes({}, [rice, chicken], 4)).toContain('no_presleep_snack_training_night');
    });

    it('waits for dinner', () => {
      // Before dinner the evening has not started.
      expect(codes({}, [], 3)).not.toContain('no_presleep_snack_training_night');
    });

    it('counts a dinner ticked without items', () => {
      expect(codes({ dinner: true }, [], 3)).toContain('no_presleep_snack_training_night');
    });

    it('stops once milk or a banana is the evening snack', () => {
      for (const name of ['Susu Sapi', 'Pisang Ambon', 'milk', 'Banana']) {
        expect(codes({}, [rice, chicken, snack(name)], 3)).not.toContain('no_presleep_snack_training_night');
      }
    });

    it('still fires for another evening snack, or banana heart', () => {
      expect(codes({}, [rice, chicken, snack('Roti Putih')], 3)).toContain('no_presleep_snack_training_night');
      expect(codes({}, [rice, chicken, snack('Jantung Pisang')], 3)).toContain('no_presleep_snack_training_night');
    });

    it('does not count milk drunk at dinner as the evening snack', () => {
      const milkAtDinner: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: null, name: 'Susu Sapi' };
      expect(codes({}, [rice, chicken, milkAtDinner], 3)).toContain('no_presleep_snack_training_night');
    });

    it('fires on a match night, and not on a rest night', () => {
      expect(codes({ day_type: 'match' }, [rice, chicken], 3)).toEqual(['no_presleep_snack_training_night']);
      expect(codes({ day_type: 'rest' }, [rice, chicken], 3)).toEqual([]);
    });

    it('carries the deck’s sentence', () => {
      const [nudge] = evaluate(summariseDay(day, [rice, chicken], 68), DEMO_RULES, NOON, 3);
      expect(nudge.message).toBe('On training nights, have warm milk or a banana 30 minutes before sleep.');
      expect(nudge.reviewed).toBe(false);
      expect(nudge.source).toBe('week-3-deck');
    });
  });

  describe('the 3–4 urine band', () => {
    const rest = { day_type: 'rest' as const };

    it('fires at 3 and at 4 from week 3', () => {
      expect(codes({ ...rest, urine_colour: 3 }, [], 3)).toEqual(['urine_three_or_four']);
      expect(codes({ ...rest, urine_colour: 4 }, [], 3)).toEqual(['urine_three_or_four']);
      expect(codes({ ...rest, urine_colour: 4 }, [], 4)).toEqual(['urine_three_or_four']);
    });

    it('says nothing at 3 or 4 in weeks 1 and 2', () => {
      for (const week of [1, 2]) {
        expect(codes({ ...rest, urine_colour: 3 }, [], week)).toEqual([]);
        expect(codes({ ...rest, urine_colour: 4 }, [], week)).toEqual([]);
      }
    });

    it('stays quiet at 1 and 2, and before the check-in', () => {
      expect(codes({ ...rest, urine_colour: 1 }, [], 3)).toEqual([]);
      expect(codes({ ...rest, urine_colour: 2 }, [], 3)).toEqual([]);
      expect(codes({ ...rest, urine_colour: null }, [], 3)).toEqual([]);
    });

    it('leaves 5 and above to the week 1 rule, so a reading never fires both', () => {
      expect(codes({ ...rest, urine_colour: 5 }, [], 3)).toEqual(['urine_five_or_worse']);
      expect(codes({ ...rest, urine_colour: 8 }, [], 3)).toEqual(['urine_five_or_worse']);
    });

    it('carries the deck’s band as written', () => {
      const [nudge] = evaluate(summariseDay({ ...day, ...rest, urine_colour: 4 }, [], 68), DEMO_RULES, NOON, 3);
      expect(nudge.message).toBe('3–4: drink more today.');
      expect(nudge.domain).toBe('hydration');
    });
  });
});

describe('the week 4 top-up snack', () => {
  const SESSION: TrainingSession = { startsAt: 16 * 60 + 30, endsAt: 18 * 60 };
  const at = (h: number, m = 0) => h * 60 + m;
  const day = { ...log, breakfast: true };
  const codes = (now: number, week: number, over: LogOver = {}, rules = DEMO_RULES) =>
    evaluate(summariseDay({ ...day, ...over }, [], 68, SESSION), rules, now, week).map((n) => n.code);

  it('fires in the hour before the session from week 4, in place of the week 1 card', () => {
    expect(codes(at(16), 4)).toEqual(['top_up_snack_hour_before']);
  });

  it('fires exactly at the hour mark', () => {
    expect(codes(at(15, 30), 4)).toEqual(['top_up_snack_hour_before']);
  });

  it('leaves the hour before that to the week 1 card', () => {
    expect(codes(at(15, 29), 4)).toEqual(['pre_training_meal']);
    expect(codes(at(14, 30), 4)).toEqual(['pre_training_meal']);
  });

  it('says nothing in weeks 1 to 3, where the week 1 card runs to the start', () => {
    for (const week of [1, 2, 3]) {
      expect(codes(at(16), week)).not.toContain('top_up_snack_hour_before');
      expect(codes(at(16), week)).toContain('pre_training_meal');
    }
  });

  it('stops once the session has begun, or the pre-training slot is logged', () => {
    expect(codes(at(16, 30), 4)).toEqual([]);
    expect(codes(at(16), 4, { pre_training: true })).toEqual([]);
  });

  it('fires on a match day, and not on a rest day', () => {
    expect(codes(at(16), 4, { day_type: 'match' })).toEqual(['top_up_snack_hour_before']);
    expect(codes(at(16), 4, { day_type: 'rest' })).toEqual([]);
  });

  it('falls back to the week 1 card when the week 4 row is not in the table', () => {
    const withoutTopUp = DEMO_RULES.filter((r) => r.code !== 'top_up_snack_hour_before');
    expect(codes(at(16), 4, {}, withoutTopUp)).toEqual(['pre_training_meal']);
  });

  it('carries the slide’s row', () => {
    const [nudge] = evaluate(summariseDay(day, [], 68, SESSION), DEMO_RULES, at(16), 4);
    expect(nudge.message).toBe(
      'Top-up snack + 500mL fluid. Pisang (banana) or roti + selai kacang (bread + peanut butter).'
    );
    expect(nudge.source).toBe('week-4-slides');
  });
});

describe('this week’s material leads', () => {
  /**
   * Sofia, 25 November: "if that message can be, you know, in real time for
   * that week. If it's protein, it's the protein week." Two rules that fire
   * together: the one from the week the programme is in comes first, even
   * against a higher severity from another week.
   */
  const rule = (code: string, source: string, severity: number): AdviceRule => ({
    code,
    domain: 'carbohydrate',
    message_en: code,
    severity,
    reviewed_by: null,
    source,
  });
  const rules = [
    rule('no_breakfast_training_day', 'week-1-deck', 3),
    rule('urine_five_or_worse', 'week-3-deck', 1),
  ];
  const day = summariseDay({ ...log, urine_colour: 6 }, [], 68);

  it('puts the current week’s sentence first', () => {
    expect(evaluate(day, rules, NOON, 3).map((n) => n.code)).toEqual([
      'urine_five_or_worse',
      'no_breakfast_training_day',
    ]);
  });

  it('falls back to severity when neither is this week’s', () => {
    expect(evaluate(day, rules, NOON, 2).map((n) => n.code)).toEqual([
      'no_breakfast_training_day',
      'urine_five_or_worse',
    ]);
  });

  it('reads the week off the rule’s own source', () => {
    expect(sourceWeek('week-2-deck')).toBe(2);
    expect(sourceWeek('week-4-slides')).toBe(4);
    expect(sourceWeek('tkpi')).toBeNull();
    expect(sourceWeek(undefined)).toBeNull();
  });
});
