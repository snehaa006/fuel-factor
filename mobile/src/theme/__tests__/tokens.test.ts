import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fontAssets } from '@/theme/fonts';
import { getTheme, palette, radius, spacing, typography } from '@/theme';

const source = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../design-system/tokens.json'), 'utf8')
);

/**
 * src/theme/tokens.ts is generated from the design system. These tests fail if
 * someone hand-edits it, or if the design system gains something the generator
 * cannot express.
 */
describe('generated theme', () => {
  it('carries every colour the design system defines, in both themes', () => {
    const expected = source.color.tokens.map((t: { name: string }) => t.name).sort();
    expect(Object.keys(palette.light).sort()).toEqual(expected);
    expect(Object.keys(palette.dark).sort()).toEqual(expected);
  });

  it('resolves every alias to a real colour', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const [name, value] of Object.entries(palette[theme])) {
        expect(`${theme}.${name} = ${value}`).toMatch(/= (#[0-9a-f]{3,8}|rgba?\(|hsl)/i);
      }
    }
  });

  it('resolves aliases to the same value as their target', () => {
    // ink aliases kecap in light and santan in dark.
    expect(palette.light.ink).toBe(palette.light.kecap);
    expect(palette.dark.ink).toBe(palette.dark.santan);
    expect(palette.light.surface).toBe(palette.light.santan);
    expect(palette.dark.surface).toBe(palette.dark.langit);
  });

  it('does not make ink-muted an alias of gula', () => {
    // It was one, when gula was #89472e. The brand board's own mid-brown is
    // lighter and reaches 3.8:1 on the board's cream, under the 4.5:1 the
    // design system promises for text, so gula stays a graphic colour.
    expect(palette.light['ink-muted']).not.toBe(palette.light.gula);
  });

  it('keeps the brand hexes exactly as the brand boards give them', () => {
    // Sampled from design-system/brand/brand-board.jpg and mascot-board.jpg.
    // langit is the icon lockup's sky and the dark theme's ground.
    expect(palette.light.santan).toBe('#f6eed3');
    expect(palette.light.pisang).toBe('#f6aa32');
    expect(palette.light.cabai).toBe('#fc5b27');
    expect(palette.light.gula).toBe('#8c7359');
    expect(palette.light.kecap).toBe('#523123');
    expect(palette.light.langit).toBe('#0a2639');
  });

  it('takes daun and air from the boards rather than inventing them', () => {
    // Both were marked FUNCTIONAL, not from the brand board. The mascot
    // sheet's nutrient planets supply a green and a teal, so they are
    // board colours now.
    expect(palette.light.daun).toBe('#a6b385');
    expect(palette.light.air).toBe('#406c79');
  });

  it('converts spacing and radius to numbers React Native can use', () => {
    for (const value of Object.values(spacing)) {
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value)).toBe(true);
    }
    for (const value of Object.values(radius)) {
      expect(typeof value).toBe('number');
    }
    expect(spacing['space-4']).toBe(16);
    expect(radius['radius-lg']).toBe(16);
    expect(radius['radius-pill']).toBe(999);
  });

  it('only names fonts the app actually loads', () => {
    const loaded = Object.keys(fontAssets);
    for (const [name, style] of Object.entries(typography)) {
      expect(`${name}:${style.fontFamily}`).toBe(
        `${name}:${loaded.find((f) => f === style.fontFamily)}`
      );
    }
  });

  it('gives every type style a size and a line height', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });
});

describe('getTheme', () => {
  it('returns the matching palette', () => {
    expect(getTheme('light').colors.surface).toBe(palette.light.surface);
    expect(getTheme('dark').colors.surface).toBe(palette.dark.surface);
  });

  it('keeps light and dark genuinely different', () => {
    expect(getTheme('light').colors.surface).not.toBe(getTheme('dark').colors.surface);
    expect(getTheme('light').colors.ink).not.toBe(getTheme('dark').colors.ink);
  });
});
