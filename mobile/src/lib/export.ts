import { Platform, Share } from 'react-native';

import { asError } from './errors';
import { supabase } from './supabase';

/**
 * The research export: the squad's rows out as CSV, one file per tracker tab.
 *
 * The brief's research journey ends here -- "every log row exports to CSV
 * ... for Sofia's analysis" -- and the two-tier schema exists so that this
 * reads only the research tables. Each file's columns are its table's, in the
 * table's order, which is the tab's order (see `20261031000001_research_tables.sql`
 * and `20261127000001_weekly_logs.sql`). The one change: the internal
 * `participant_id` becomes the tracker's own participant code and name, which
 * is how the tabs say who a row belongs to.
 *
 * The reflections and the mini quiz scores are the app-tier tables here. Sofia asked for them for
 * her analysis and the tracker has no tab for them yet, so they come out as a
 * file of their own, named as app data.
 *
 * Row level security decides whose rows come back: a coach gets their squad
 * and nobody else's, exactly as on the dashboard.
 *
 * No native module: a file download on web, where the coach works, and the
 * share sheet with the CSV as text on a phone.
 */

export type SheetKey =
  | 'participants'
  | 'daily_logs'
  | 'weekly_logs'
  | 'recalls'
  | 'assessments'
  | 'programme_reflections'
  | 'quiz_results';

type SheetDef = {
  key: SheetKey;
  /** The table's columns after the athlete, in the table's order. */
  columns: readonly string[];
  /** How rows are ordered after the athlete. */
  orderBy: readonly string[];
  /** Whether the table is the athlete list itself, rather than keyed by one. */
  isParticipants?: boolean;
};

export const SHEETS: readonly SheetDef[] = [
  {
    key: 'participants',
    isParticipants: true,
    columns: [
      'participant_code', 'name', 'sport', 'age_band', 'height_cm', 'weight_kg', 'waist_cm',
      'muac_cm', 'calf_cm', 'consent_signed', 'parent_contact', 'notes',
    ],
    orderBy: ['participant_code'],
  },
  {
    key: 'daily_logs',
    columns: [
      'log_date', 'day_type', 'breakfast', 'pre_training', 'lunch', 'post_training', 'dinner',
      'evening_snack', 'fruit_servings', 'veg_servings', 'protein_sources', 'carb_portions',
      'fluid_ml', 'urine_colour', 'energy_am', 'energy_training', 'recovery', 'mood',
      'concentration', 'dq_score', 'notes',
    ],
    orderBy: ['log_date'],
  },
  {
    key: 'weekly_logs',
    columns: [
      'week', 'theme', 'avg_training_energy', 'avg_urine_colour', 'avg_fluid_ml',
      'breakfast_compliance', 'week_behaviour_check', 'answer', 'notes',
    ],
    orderBy: ['week'],
  },
  {
    key: 'recalls',
    columns: [
      'day_number', 'recall_date', 'day_type', 'sleep_hours', 'breakfast', 'lunch', 'dinner',
      'activities', 'supplements', 'notes', 'fluid_ml', 'est_calories', 'energy', 'recovery',
      'urine_colour',
    ],
    orderBy: ['day_number'],
  },
  {
    key: 'assessments',
    columns: ['domain', 'measure', 'unit', 'pre_value', 'post_value'],
    orderBy: ['domain', 'measure'],
  },
  {
    key: 'programme_reflections',
    columns: ['rating', 'liked', 'best_takeaway', 'feedback', 'updated_at'],
    orderBy: [],
  },
  {
    key: 'quiz_results',
    columns: ['week', 'score', 'total', 'answers', 'updated_at'],
    orderBy: ['week'],
  },
];

/** The two columns that say whose row it is, as the tabs say it. */
export const ATHLETE_COLUMNS = ['participant_code', 'name'] as const;

type Row = Record<string, unknown>;
export type Athlete = { id: string; participant_code: string; name: string };

// ---------------------------------------------------------------------------
// Pure

/**
 * One CSV cell. Null is an empty cell, never "null" or 0; a cell holding a
 * comma, quote or line break is quoted with its quotes doubled (RFC 4180).
 * A cell that a spreadsheet would read as a formula is prefixed with an
 * apostrophe, so a note typed as "=..." stays text.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'string' ? value : String(value);
  if (/^[=+\-@]/.test(text) && !/^-?\d/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A whole file. A byte-order mark leads, so Excel reads the em dashes and
 * the Bahasa as UTF-8; Google Sheets ignores it. Lines end CRLF, as RFC 4180
 * has them.
 */
export function toCsv(columns: readonly string[], rows: readonly Row[]): string {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * Rows keyed by `participant_id`, with the athlete's code and name in its
 * place, sorted by code and then the sheet's own order. A row whose athlete
 * this coach cannot see is dropped: it should not have come back at all.
 */
export function withAthletes(
  rows: readonly Row[],
  athletes: readonly Athlete[],
  orderBy: readonly string[]
): Row[] {
  const byId = new Map(athletes.map((a) => [a.id, a]));
  const out: Row[] = [];
  for (const row of rows) {
    const athlete = byId.get(String(row.participant_id));
    if (!athlete) continue;
    out.push({ ...row, participant_code: athlete.participant_code, name: athlete.name });
  }
  const keys = ['participant_code', ...orderBy];
  return out.sort((a, b) => {
    for (const k of keys) {
      const x = a[k];
      const y = b[k];
      if (x === y) continue;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x).localeCompare(String(y));
    }
    return 0;
  });
}

/** "fuel-factor-daily_logs-2026-11-27.csv" */
export function fileName(sheet: SheetKey, today: string): string {
  return `fuel-factor-${sheet}-${today}.csv`;
}

export function sheetCsv(sheet: SheetKey, rows: readonly Row[], athletes: readonly Athlete[]): string {
  const def = SHEETS.find((s) => s.key === sheet);
  if (!def) throw new Error(`Unknown sheet ${sheet}`);
  if (def.isParticipants) {
    const sorted = [...rows].sort((a, b) =>
      String(a.participant_code).localeCompare(String(b.participant_code))
    );
    return toCsv(def.columns, sorted);
  }
  return toCsv([...ATHLETE_COLUMNS, ...def.columns], withAthletes(rows, athletes, def.orderBy));
}

// ---------------------------------------------------------------------------
// Database and delivery

/** One sheet's CSV, from whatever this account can read. */
export async function fetchSheetCsv(sheet: SheetKey): Promise<{ csv: string; rows: number }> {
  const def = SHEETS.find((s) => s.key === sheet);
  if (!def) throw new Error(`Unknown sheet ${sheet}`);

  const people = await supabase.from('participants').select(
    def.isParticipants ? ['id', ...def.columns].join(', ') : 'id, participant_code, name'
  );
  if (people.error) throw asError(people.error);
  const athletes = (people.data ?? []) as unknown as (Athlete & Row)[];
  if (def.isParticipants) return { csv: sheetCsv(sheet, athletes, athletes), rows: athletes.length };

  const ids = athletes.map((a) => a.id);
  if (ids.length === 0) return { csv: sheetCsv(sheet, [], []), rows: 0 };

  // The table is named by a variable, which the typed client cannot follow;
  // the columns are the fixed lists above.
  const table = supabase.from(def.key as 'weekly_logs');
  const { data, error } = await table
    .select(['participant_id', ...def.columns].join(', '))
    .in('participant_id', ids);
  if (error) throw asError(error);
  const rows = (data ?? []) as unknown as Row[];
  return { csv: sheetCsv(sheet, rows, athletes), rows: rows.length };
}

/** Hand the file over: a download on web, the share sheet on a phone. */
export async function deliverCsv(name: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    const doc = (globalThis as { document?: Document }).document;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    try {
      const a = doc!.createElement('a');
      a.href = url;
      a.download = name;
      doc!.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return;
  }
  await Share.share({ title: name, message: csv.replace(/^﻿/, '') });
}
