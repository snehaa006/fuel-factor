import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEMO_COACH_VIEW } from '@/lib/__fixtures__/today';
import {
  DEHYDRATED_AT,
  UNDER_FUELLING_DAYS,
  flagsFor,
  latestUrine,
  toCoachView,
  underFuelling,
  type CarbsByLog,
  type DayRollUp,
} from '@/lib/coach';
import { CARB_G_PER_KG } from '@/lib/targets';

const day = (over: Partial<DayRollUp> = {}): DayRollUp => ({
  date: '2026-10-31',
  breakfast: false,
  urineColour: null,
  dayType: 'training',
  carbsEaten: null,
  position: null,
  ...over,
});

describe('underFuelling', () => {
  it('fires on three judged days running below the band', () => {
    expect(
      underFuelling([day({ position: 'below' }), day({ position: 'below' }), day({ position: 'below' })])
    ).toBe(true);
  });

  it('does not fire on two', () => {
    expect(underFuelling([day({ position: 'below' }), day({ position: 'below' })])).toBe(false);
  });

  it('does not fire when the most recent judged day was inside', () => {
    expect(
      underFuelling([
        day({ position: 'below' }),
        day({ position: 'below' }),
        day({ position: 'below' }),
        day({ position: 'inside' }),
      ])
    ).toBe(false);
  });

  it('ignores days that could not be judged rather than breaking the run', () => {
    // A day with no weight, no day type or an unpriced food is not evidence
    // either way. Counting it as a break would hide a real run; counting it
    // as below would manufacture a flag out of a gap in the food database.
    expect(
      underFuelling([
        day({ position: 'below' }),
        day({ position: null }),
        day({ position: 'below' }),
        day({ position: 'below' }),
      ])
    ).toBe(true);
  });

  it('does not fire on an athlete with nothing judged at all', () => {
    expect(underFuelling([day(), day(), day(), day()])).toBe(false);
    expect(underFuelling([])).toBe(false);
  });

  it('uses the programme’s band rather than a number of its own', () => {
    // The threshold lives in targets.ts and is the Week 1 deck's.
    expect(CARB_G_PER_KG.training).toEqual({ min: 5, max: 7 });
    expect(UNDER_FUELLING_DAYS).toBe(3);
  });
});

describe('latestUrine', () => {
  it('takes the most recent reading there is', () => {
    expect(
      latestUrine([day({ urineColour: 3 }), day({ urineColour: 6 }), day({ urineColour: null })])
    ).toBe(6);
  });

  it('is null when nothing was recorded', () => {
    expect(latestUrine([day(), day()])).toBeNull();
    expect(latestUrine([])).toBeNull();
  });
});

describe('flagsFor', () => {
  it('flags a reading the tracker’s own scale calls act now', () => {
    const [flag] = flagsFor([day({ urineColour: DEHYDRATED_AT })]);
    expect(flag.code).toBe('dehydrated');
    expect(flag.detail).toMatch(/5 or worse/);
  });

  it('does not flag a reading inside the scale’s fine range', () => {
    expect(flagsFor([day({ urineColour: 3 })])).toEqual([]);
  });

  it('quotes the threshold it fired on, so a coach can check it', () => {
    // A flag a coach has to take on faith is worse than no flag.
    const flags = flagsFor([
      day({ position: 'below' }),
      day({ position: 'below' }),
      day({ position: 'below', urineColour: 6 }),
    ]);
    expect(flags.map((f) => f.code)).toEqual(['under_fuelling', 'dehydrated']);
    for (const flag of flags) {
      expect(flag.detail.length).toBeGreaterThan(20);
    }
  });

  it('gives a clean athlete no flags', () => {
    expect(flagsFor([day({ position: 'inside', urineColour: 2 })])).toEqual([]);
  });
});

describe('toCoachView', () => {
  const participants = [
    { id: 'p2', name: 'Theo', weight_kg: 68 },
    { id: 'p1', name: 'Jacob', weight_kg: 67 },
  ];

  const logs = [
    { id: 'l1', participant_id: 'p2', log_date: '2026-10-30', day_type: 'training' as const, breakfast: true, urine_colour: 6 },
    { id: 'l2', participant_id: 'p2', log_date: '2026-10-31', day_type: 'training' as const, breakfast: false, urine_colour: null },
    { id: 'l3', participant_id: 'p1', log_date: '2026-10-31', day_type: 'rest' as const, breakfast: true, urine_colour: 2 },
  ];

  // Theo's band on a training day is 340-476 g; 100 is below, 400 inside.
  const carbs: CarbsByLog = {
    l1: { grams: 100, itemsWithoutFigures: 0 },
    l2: { grams: 400, itemsWithoutFigures: 0 },
    l3: { grams: 220, itemsWithoutFigures: 0 },
  };

  it('keeps the roster alphabetical, never ranked', () => {
    // A roster sorted by a compliance figure is a league table of who is
    // eating properly, which is not something to hand a school.
    const view = toCoachView(participants, logs, carbs, '2026-10-31', 14, 'Jakarta U16');
    expect(view.athletes.map((a) => a.name)).toEqual(['Jacob', 'Theo']);
  });

  it('counts who logged today', () => {
    const view = toCoachView(participants, logs, carbs, '2026-10-31', 14, null);
    expect(view.loggedToday).toBe(2);
    expect(view.athletes.every((a) => a.loggedToday)).toBe(true);
  });

  it('counts breakfast days', () => {
    const view = toCoachView(participants, logs, carbs, '2026-10-31', 14, null);
    expect(view.athletes.find((a) => a.name === 'Theo')?.breakfastDays).toBe(1);
  });

  it('places a day against the deck’s own band', () => {
    const theo = toCoachView(participants, logs, carbs, '2026-10-31', 14, null).athletes.find(
      (a) => a.name === 'Theo'
    )!;
    expect(theo.days.map((d) => d.position)).toEqual(['below', 'inside']);
    expect(theo.insideBand).toBe(1);
    expect(theo.daysWithBand).toBe(2);
  });

  it('judges no day for an athlete with no confirmed weight', () => {
    // Two of the three real athletes have weights that disagree between the
    // tracker's tabs. Without one there is no band, and the screen must say
    // so rather than quietly reading every day as below.
    const view = toCoachView(
      [{ id: 'p3', name: 'Jeongho', weight_kg: null }],
      [{ id: 'l9', participant_id: 'p3', log_date: '2026-10-31', day_type: 'training' as const, breakfast: true, urine_colour: null }],
      { l9: { grams: 10, itemsWithoutFigures: 0 } },
      '2026-10-31',
      14,
      null
    );
    expect(view.athletes[0].daysWithBand).toBe(0);
    expect(view.athletes[0].flags).toEqual([]);
  });

  it('leaves a day holding an unpriced food unjudged', () => {
    // Seven of the fifteen seeded foods carry no carbohydrate figure. A day
    // with one of them in it must not read as under-fuelling.
    const view = toCoachView(
      [{ id: 'p2', name: 'Theo', weight_kg: 68 }],
      [{ id: 'l1', participant_id: 'p2', log_date: '2026-10-31', day_type: 'training' as const, breakfast: true, urine_colour: null }],
      { l1: { grams: 50, itemsWithoutFigures: 1 } },
      '2026-10-31',
      14,
      null
    );
    expect(view.athletes[0].days[0].position).toBeNull();
  });

  it('survives a team with no logs at all', () => {
    const view = toCoachView(participants, [], {}, '2026-10-31', 14, null);
    expect(view.loggedToday).toBe(0);
    expect(view.athletes.every((a) => a.daysLogged === 0 && a.flags.length === 0)).toBe(true);
  });

  it('survives a team with no athletes', () => {
    expect(toCoachView([], [], {}, '2026-10-31', 14, null).athletes).toEqual([]);
  });
});

describe('coach access is not athlete access', () => {
  const root = resolve(__dirname, '../../../..');
  const sql = readFileSync(
    resolve(root, 'supabase/migrations/20261031000011_coach_access.sql'),
    'utf8'
  );

  it('uses a code of its own, never the squad’s join code', () => {
    // An athlete who has FUEL01 must not be able to read the whole team.
    expect(sql).toContain('coach_code');
    expect(sql).not.toMatch(/where join_code = upper\(trim\(p_coach_code\)\)/);
  });

  it('refuses a device that already holds an athlete', () => {
    expect(sql).toContain('this device is signed in as an athlete');
  });

  it('never claims a participant', () => {
    // A coach has no current_participant_id, which is what keeps the
    // leaderboard and the badges silent for them rather than wrong.
    expect(sql).not.toMatch(/update public\.participant_profiles/);
  });

  it('gives anon no access', () => {
    expect(sql).toMatch(/revoke all on function public\.claim_coach\(text\) from public, anon/);
    expect(sql).toMatch(/grant execute on function public\.claim_coach\(text\) to authenticated/);
  });

  it('touches no research table', () => {
    expect(sql).not.toMatch(/alter table public\.(participants|daily_logs|recalls|assessments)/);
  });
});

describe('the demo squad shows each state the screen has', () => {
  it('includes a flagged athlete, a clean one, and one with no band', () => {
    const byName = Object.fromEntries(DEMO_COACH_VIEW.athletes.map((a) => [a.name, a]));
    expect(byName.Theo.flags.map((f) => f.code)).toEqual(['under_fuelling', 'dehydrated']);
    expect(byName.Jacob.flags).toEqual([]);
    expect(byName.Jeongho.daysWithBand).toBe(0);
  });

  it('is alphabetical, like the real one', () => {
    expect(DEMO_COACH_VIEW.athletes.map((a) => a.name)).toEqual(['Jacob', 'Jeongho', 'Theo']);
  });

  it('agrees with the roster seed that Theo’s reading was 6', () => {
    expect(
      DEMO_COACH_VIEW.athletes.find((a) => a.name === 'Theo')?.flags[1].detail
    ).toMatch(/was 6/);
  });
});
