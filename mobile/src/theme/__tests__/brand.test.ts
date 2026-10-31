import { readFileSync } from 'node:fs';
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

  it('keeps the board’s five brand colours as the colour tokens, hex for hex', () => {
    expect({
      cabai: palette.light.cabai,
      pisang: palette.light.pisang,
      kecap: palette.light.kecap,
      santan: palette.light.santan,
      gula: palette.light.gula,
    }).toEqual({
      cabai: '#b8420d',
      pisang: '#f8a720',
      kecap: '#642714',
      santan: '#fde2cf',
      gula: '#89472e',
    });
  });

  it('holds the wordmark to drawn artwork rather than typeset text', () => {
    expect(brand.rules.join(' ')).toMatch(/never re-set it in a font/i);
  });
});
