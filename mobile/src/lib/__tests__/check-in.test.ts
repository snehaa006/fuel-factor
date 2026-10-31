import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  COUNTERS,
  LIMITS,
  RATINGS,
  URINE_LEVELS,
  URINE_WORDING,
  clampCounter,
  hasAnyAnswer,
  parseFluid,
} from '@/lib/check-in';

const migration = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20261031000001_research_tables.sql'),
  'utf8'
);

describe('the check-in carries the sheet’s columns', () => {
  it('has the four serving counters, in sheet order', () => {
    expect(COUNTERS.map((c) => c.field)).toEqual([
      'fruit_servings', 'veg_servings', 'protein_sources', 'carb_portions',
    ]);
  });

  it('has the five self-ratings, in sheet order', () => {
    expect(RATINGS.map((r) => r.field)).toEqual([
      'energy_am', 'energy_training', 'recovery', 'mood', 'concentration',
    ]);
  });

  it('covers every daily_logs column the athlete is meant to fill', () => {
    // Guards against a field quietly going missing from the form: these are
    // the research instrument, not a selection from it.
    const covered = [
      ...COUNTERS.map((c) => c.field),
      ...RATINGS.map((r) => r.field),
      'fluid_ml',
      'urine_colour',
      'notes',
    ];
    for (const column of covered) {
      expect(`${column} in migration: ${migration.includes(column)}`).toBe(`${column} in migration: true`);
    }
    expect(covered).toHaveLength(12);
  });

  it('leaves sleep and supplements out, because they are RECALL columns', () => {
    // The brief lists them with this screen, but recalls are filled by the
    // research team. Putting them here would add columns to a research table.
    const fields = [...COUNTERS.map((c) => c.field), ...RATINGS.map((r) => r.field)];
    expect(fields).not.toContain('sleep_hours');
    expect(fields).not.toContain('supplements');
  });

  it('matches the column constraints the migration declares', () => {
    expect(migration).toContain('between 0 and 20');
    expect(migration).toContain('between 1 and 10');
    expect(migration).toContain('urine_colour      smallint check (urine_colour between 1 and 8)');
    expect(LIMITS).toEqual({
      counter: { min: 0, max: 20 },
      rating: { min: 1, max: 10 },
      urine: { min: 1, max: 8 },
      fluid_ml: { min: 0, max: 15000 },
    });
  });
});

describe('the urine scale', () => {
  it('offers all eight levels', () => {
    expect(URINE_LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('carries the tracker’s own wording where the programme has given it', () => {
    expect(URINE_WORDING[6]).toBe('Dehydrated — drink immediately');
    expect(URINE_WORDING[5]).toBe('Drink more today');
  });

  it('invents no wording for the levels the programme has not worded', () => {
    // This is a measuring instrument. A description for level 7 would be the
    // app writing the instrument.
    for (const level of [1, 2, 7, 8]) {
      expect(`level ${level}: ${URINE_WORDING[level] ?? 'none'}`).toBe(`level ${level}: none`);
    }
  });
});

describe('parseFluid', () => {
  it('reads a plain number', () => {
    expect(parseFluid('2000')).toBe(2000);
  });

  it('leaves blank as null, never as zero', () => {
    // Not answered is not a measurement of no fluid, and fluid has never been
    // collected for any athlete — a false zero would look like real data.
    expect(parseFluid('')).toBeNull();
    expect(parseFluid('   ')).toBeNull();
  });

  it('rejects nonsense rather than storing it', () => {
    expect(parseFluid('lots')).toBeNull();
  });

  it('clamps to the column’s own bounds', () => {
    expect(parseFluid('999999')).toBe(15000);
    expect(parseFluid('-500')).toBe(0);
  });

  it('rounds a decimal, because the column is an integer', () => {
    expect(parseFluid('1500.6')).toBe(1501);
  });
});

describe('clampCounter', () => {
  it('stays inside 0 to 20', () => {
    expect(clampCounter(-3)).toBe(0);
    expect(clampCounter(99)).toBe(20);
    expect(clampCounter(5)).toBe(5);
  });
});

describe('hasAnyAnswer', () => {
  it('is false for an untouched form', () => {
    expect(hasAnyAnswer({})).toBe(false);
  });

  it('is false when every field was explicitly left blank', () => {
    expect(hasAnyAnswer({ fluid_ml: null, urine_colour: null, notes: '' })).toBe(false);
  });

  it('is true for a zero, which is a real answer', () => {
    // Zero servings of vegetables is a finding, not a blank.
    expect(hasAnyAnswer({ veg_servings: 0 })).toBe(true);
  });

  it('is true for any single answer', () => {
    expect(hasAnyAnswer({ urine_colour: 6 })).toBe(true);
    expect(hasAnyAnswer({ notes: 'sore knee' })).toBe(true);
  });
});
