import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SHEETS, csvCell, fileName, sheetCsv, toCsv, withAthletes } from '../export';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

/** Column names of one `create table`, in declared order. */
function columnsOf(sql: string, table: string): string[] {
  const start = sql.indexOf(`create table public.${table} (`);
  const body = sql.slice(start, sql.indexOf('\n);', start));
  return body
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+\s/.test(line))
    .map((line) => line.split(/\s/)[0])
    .filter((name) => !['unique', 'check', 'primary', 'foreign', 'constraint'].includes(name));
}

const INTERNAL = ['id', 'participant_id', 'created_at', 'updated_at'];

describe('each file has its tab’s columns, in the tab’s order', () => {
  const research = read('supabase/migrations/20261031000001_research_tables.sql');
  const weekly = read('supabase/migrations/20261127000001_weekly_logs.sql');
  const sources: Record<string, string> = {
    participants: research,
    daily_logs: research,
    recalls: research,
    assessments: research,
    weekly_logs: weekly,
  };

  it.each(Object.keys(sources))('%s', (key) => {
    const sheet = SHEETS.find((s) => s.key === key)!;
    expect(sheet.columns).toEqual(columnsOf(sources[key], key).filter((c) => !INTERNAL.includes(c)));
  });

  it('reads nothing of the app tier but the reflections Sofia asked for', () => {
    expect(SHEETS.map((s) => s.key).sort()).toEqual(
      ['assessments', 'daily_logs', 'participants', 'programme_reflections', 'recalls', 'weekly_logs']
    );
  });
});

describe('a CSV cell', () => {
  it('leaves an unanswered value empty, never "null" or 0', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(0)).toBe('0');
    expect(csvCell(false)).toBe('false');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('rice, egg')).toBe('"rice, egg"');
    expect(csvCell('he said "more"')).toBe('"he said ""more"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
  });

  it('keeps a typed formula as text, and a negative number as a number', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+62 812')).toBe("'+62 812");
    expect(csvCell(-2.5)).toBe('-2.5');
  });
});

describe('a file', () => {
  it('starts with a byte-order mark and ends lines CRLF', () => {
    expect(toCsv(['a', 'b'], [{ a: 1, b: 'x' }])).toBe('﻿a,b\r\n1,x\r\n');
  });

  it('says whose row it is with the tracker’s code and name, sorted by athlete', () => {
    const athletes = [
      { id: 'u-t', participant_code: 'TEST-DEMO-T01', name: 'Theo' },
      { id: 'u-j', participant_code: 'TEST-DEMO-J01', name: 'Jeongho' },
    ];
    const rows = [
      { participant_id: 'u-t', week: 2 },
      { participant_id: 'u-j', week: 1 },
      { participant_id: 'u-t', week: 1 },
      { participant_id: 'someone-else', week: 1 },
    ];
    expect(withAthletes(rows, athletes, ['week']).map((r) => [r.participant_code, r.week])).toEqual([
      ['TEST-DEMO-J01', 1],
      ['TEST-DEMO-T01', 1],
      ['TEST-DEMO-T01', 2],
    ]);
  });

  it('writes the weekly log the way the tab reads', () => {
    const csv = sheetCsv(
      'weekly_logs',
      [
        {
          participant_id: 'u-t', week: 1, theme: 'Carbohydrates', avg_training_energy: 7,
          avg_urine_colour: 8, avg_fluid_ml: 1200, breakfast_compliance: 'Everyday',
          week_behaviour_check: 'More energy and better sleep after rice at night', answer: null, notes: null,
        },
      ],
      [{ id: 'u-t', participant_code: 'TEST-DEMO-T01', name: 'Theo' }]
    );
    expect(csv.split('\r\n')).toEqual([
      '﻿participant_code,name,week,theme,avg_training_energy,avg_urine_colour,avg_fluid_ml,breakfast_compliance,week_behaviour_check,answer,notes',
      'TEST-DEMO-T01,Theo,1,Carbohydrates,7,8,1200,Everyday,More energy and better sleep after rice at night,,',
      '',
    ]);
  });

  it('is named for its tab and the day', () => {
    expect(fileName('daily_logs', '2026-11-27')).toBe('fuel-factor-daily_logs-2026-11-27.csv');
  });
});
