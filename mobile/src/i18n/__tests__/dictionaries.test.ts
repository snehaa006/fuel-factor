import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { en } from '@/i18n/en';
import { id } from '@/i18n/id';
import { COMPARISON_ROWS, DOMAINS, MEASURES } from '@/lib/assessments';

/**
 * The two dictionaries, held to each other.
 *
 * The typecheck already refuses an Indonesian dictionary with a key missing.
 * What it cannot see is a key present with the English still in it, a
 * sentence with a number that has lost the number, or a lookup keyed by a
 * code the app does not have.
 */

type Node = unknown;
const SAMPLE = ['7', '8', '9', '10', '11'];

/** Every leaf, as [path, english, indonesian]. */
function leaves(a: Node, b: Node, path = ''): [string, Node, Node][] {
  if (typeof a === 'string' || typeof a === 'function') return [[path, a, b]];
  if (Array.isArray(a)) return a.flatMap((v, i) => leaves(v, (b as Node[])[i], `${path}.${i}`));
  if (a !== null && typeof a === 'object') {
    // A map that is empty in English is one the English does not need (the
    // row or the server message is already English). Its Indonesian keys are
    // checked against the app's own codes below instead.
    if (Object.keys(a).length === 0) return [];
    return Object.keys(a).flatMap((k) =>
      leaves((a as Record<string, Node>)[k], (b as Record<string, Node>)[k], `${path}.${k}`)
    );
  }
  return [[path, a, b]];
}

const all = leaves(en, id);
const say = (value: Node) =>
  typeof value === 'function' ? (value as (...a: string[]) => string)(...SAMPLE) : value;

describe('the Indonesian dictionary', () => {
  it('has every sentence the English has', () => {
    const missing = all.filter(([, , b]) => b === undefined).map(([path]) => path);
    expect(missing).toEqual([]);
  });

  it('keeps each sentence the same shape', () => {
    // A function in one and a string in the other would print "() => ..."
    // on a phone; a different arity drops a number.
    const mismatched = all
      .filter(
        ([, a, b]) =>
          typeof a !== typeof b ||
          (typeof a === 'function' && (a as () => void).length !== (b as () => void).length)
      )
      .map(([path]) => path);
    expect(mismatched).toEqual([]);
  });

  it('says something for every key', () => {
    const blank = all.filter(([path, , b]) => say(b) === '' && path !== '.scales.inWorkbookWords');
    expect(blank.map(([path]) => path)).toEqual([]);
  });

  it('never prints a broken interpolation', () => {
    const broken = all.flatMap(([path, a, b]) =>
      [say(a), say(b)]
        .filter((s): s is string => typeof s === 'string')
        .filter((s) => /undefined|NaN|\[object|null/.test(s))
        .map((s) => `${path}: ${s}`)
    );
    expect(broken).toEqual([]);
  });

  it('has no English left in it, beyond words Indonesian shares', () => {
    // The list is every key whose Indonesian is the same as its English, and
    // each one is a word the two languages share: a month, a unit, "Protein",
    // "Email". A new entry here means a sentence was copied and not
    // translated.
    const same = all.filter(([, a, b]) => say(a) === say(b) && say(a) !== '').map(([path]) => path);
    expect(same.sort()).toEqual(
      [
        '.ageBands.14-16',
        '.ageBands.17-18',
        '.assess.fieldLabel',
        '.credentials.email',
        '.credentials.emailLabel',
        '.dates.initials.5',
        '.dates.months.10',
        '.dates.months.3',
        '.dates.months.8',
        '.dates.shortMonths.0',
        '.dates.shortMonths.1',
        '.dates.shortMonths.10',
        '.dates.shortMonths.2',
        '.dates.shortMonths.3',
        '.dates.shortMonths.5',
        '.dates.shortMonths.6',
        '.dates.shortMonths.8',
        '.gaps.nutrients.protein',
        '.habits.urine.initial',
        '.learn.protein',
        '.logger.per100g',
        '.macros.protein',
        '.mascot.fuelFactor',
        '.nudge.domains.protein',
        '.recall.macros.protein_g',
        '.scales.stepperValue',
        '.session.value',
        '.streak.dayInitials.6',
      ].sort()
    );
  });

  it('keeps the numbers a sentence was given', () => {
    // The functions whose first argument is a count must still print it.
    const counted: [string, (...a: string[]) => string][] = [
      ['mascot.slotsLogged', id.mascot.slotsLogged as never],
      ['mascot.badgesEarned', id.mascot.badgesEarned as never],
      ['today.bestSoFar', id.today.bestSoFar as never],
      ['recall.daysOf', id.recall.daysOf as never],
      ['recall.remaining', id.recall.remaining as never],
      ['team.youAre', id.team.youAre as never],
      ['gaps.daysBetween', id.gaps.daysBetween as never],
      ['coach.loggedToday', id.coach.loggedToday as never],
      ['assess.week4In', id.assess.week4In as never],
    ];
    for (const [name, fn] of counted) {
      expect(`${name}: ${fn(...SAMPLE)}`).toContain(SAMPLE[0]);
    }
  });

  it('names the months and days in order', () => {
    expect(id.dates.months).toHaveLength(12);
    expect(id.dates.weekdays[0]).toBe('Minggu');
    expect(id.dates.weekdays[1]).toBe('Senin');
    expect(id.dates.months[7]).toBe('Agustus');
  });
});

describe('lookups keyed by the app’s own codes', () => {
  it('translates every assessment measure, and only those', () => {
    const keys = MEASURES.map((m) => m.key).sort();
    expect(Object.keys(id.assess.measures).sort()).toEqual(keys);
  });

  it('translates every assessment domain', () => {
    expect(Object.keys(id.assess.domains).sort()).toEqual(DOMAINS.map((d) => d.domain).sort());
  });

  it('translates every comparison row', () => {
    expect(Object.keys(id.assess.rows).sort()).toEqual(COMPARISON_ROWS.map((r) => r.key).sort());
  });

  it('translates every badge the database seeds, by its code', () => {
    // The ladder, and the mini quiz's badges added to it.
    const seed = ['0007_badges.sql', '0023_quiz_badges.sql']
      .map((f) => readFileSync(join(__dirname, '..', '..', '..', '..', 'supabase', 'seed', f), 'utf8'))
      .join('\n');
    const codes = [...seed.matchAll(/^\s*\('([a-z_]+)',/gm)].map((m) => m[1]).sort();
    expect(codes.length).toBeGreaterThan(0);
    expect(Object.keys(id.badges.names).sort()).toEqual(codes);
  });

  it('looks server messages up by their lower-cased text', () => {
    for (const key of Object.keys(id.errors)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  it('covers the database refusals an athlete can reach from the sign-in and join screens', () => {
    const migrations = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
    const raised = new Set(
      readdirSync(migrations).flatMap((f) => [
          ...readFileSync(join(migrations, f), 'utf8').matchAll(/raise exception '([^']+)'/g),
        ])
        .map((m) => m[1])
    );
    for (const message of [
      'no team with that code',
      'that athlete is already claimed on another device',
      'no team with that coach code',
    ]) {
      // Guards the guard: the database must still say it this way.
      expect(raised.has(message)).toBe(true);
      expect(id.errors[message]).toBeTruthy();
    }
  });
});
