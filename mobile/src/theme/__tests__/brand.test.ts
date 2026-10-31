import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { palette } from '@/theme';

const source = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../design-system/tokens.json'), 'utf8')
);

type Lockup = { name: string; file: string; description: string; usage: string };

/**
 * The logo system from the brand board. The artwork itself is not in the
 * repository yet; this holds the specification that points at it honest.
 */
describe('brand', () => {
  const brand = source.brand as { lockups: Lockup[]; rules: string[] };

  it('declares the board’s four lockups', () => {
    expect(brand.lockups.map((l) => l.name)).toEqual([
      'primary', 'secondary', 'stacked', 'submark',
    ]);
  });

  it('gives every lockup a file, a description and a use', () => {
    for (const lockup of brand.lockups) {
      expect(lockup.file).toMatch(/^brand\/fuel-factor-[a-z]+\.(png|svg)$/);
      expect(lockup.description.length).toBeGreaterThan(0);
      expect(lockup.usage.length).toBeGreaterThan(0);
    }
  });

  it('keeps the boards’ brand colours as the colour tokens, hex for hex', () => {
    // Sampled from the two boards in design-system/brand/. langit is the
    // icon lockup's sky, which the five-colour set never had a name for and
    // which is now the dark theme's ground.
    expect({
      cabai: palette.light.cabai,
      pisang: palette.light.pisang,
      kecap: palette.light.kecap,
      santan: palette.light.santan,
      gula: palette.light.gula,
      langit: palette.light.langit,
    }).toEqual({
      cabai: '#fc5b27',
      pisang: '#f6aa32',
      kecap: '#523123',
      santan: '#f6eed3',
      gula: '#8c7359',
      langit: '#0a2639',
    });
  });

  it('names the board files that are actually in the repository', () => {
    // The lockups below are still wanted from Theo as their own files. These
    // two are here, and the app icon is cut from the first.
    for (const file of ['brand/brand-board.jpg', 'brand/mascot-board.jpg']) {
      expect(existsSync(resolve(__dirname, '../../../../design-system', file))).toBe(true);
    }
  });

  it('holds the wordmark to drawn artwork rather than typeset text', () => {
    expect(brand.rules.join(' ')).toMatch(/never re-set it in a font/i);
  });
});
