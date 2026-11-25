import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * One spelling of "programme", everywhere a user can read it.
 *
 * Feedback from the people running the programme: "Programme" and "program"
 * were mixed. The app settles on the British "programme", which is what the
 * programme's own decks, the research tracker and Ascend Now's material use,
 * and this test keeps it that way: any "program" in the app's source or in the
 * seeded content (lessons, advice, challenges, badges) fails it.
 *
 * The seeds are scanned because most of what an athlete reads -- the Learn
 * cards, the nudges -- is rows, not code.
 */

const mobileRoot = join(__dirname, '..', '..', '..');
const repoRoot = join(mobileRoot, '..');

const SCANNED = [
  { dir: join(mobileRoot, 'src'), ext: /\.(ts|tsx)$/ },
  { dir: join(repoRoot, 'supabase', 'seed'), ext: /\.sql$/ },
  { dir: join(repoRoot, 'supabase', 'migrations'), ext: /\.sql$/ },
];

/** "program", "programs", "Program's" -- but not "programme" or "programmatic". */
const AMERICAN = /\bprogram(?!m)(s|'s|’s)?\b/i;

function filesUnder(dir: string, ext: RegExp): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path, ext));
    else if (ext.test(name)) found.push(path);
  }
  return found;
}

describe('the spelling of programme', () => {
  const files = SCANNED.flatMap(({ dir, ext }) => filesUnder(dir, ext));

  it('scans the app and its seeded content', () => {
    // Guards the guard: a path typo would otherwise scan nothing and pass.
    expect(files.some((f) => f.endsWith('consent.ts'))).toBe(true);
    expect(files.some((f) => /week1_lessons\.sql$/.test(f))).toBe(true);
  });

  it('is "programme" everywhere, never "program"', () => {
    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          // This file names the word it forbids.
          if (file === __filename) return;
          if (AMERICAN.test(line)) offenders.push(`${relative(repoRoot, file)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('catches the spellings it is meant to catch', () => {
    for (const bad of ['program', 'Program', 'programs', 'the program’s', 'PROGRAM']) {
      expect(AMERICAN.test(bad)).toBe(true);
    }
    for (const good of ['programme', 'Programme', 'programmes', 'PROGRAMME_WEEKS', 'programme_starts_on']) {
      expect(AMERICAN.test(good)).toBe(false);
    }
  });
});
