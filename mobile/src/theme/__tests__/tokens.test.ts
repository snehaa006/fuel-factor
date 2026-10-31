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
    expect(palette.light['ink-muted']).toBe(palette.light.gula);
  });

  it('keeps the five brand hexes exactly as the brand board gives them', () => {
    expect(palette.light.santan).toBe('#fde2cf');
    expect(palette.light.pisang).toBe('#f8a720');
    expect(palette.light.cabai).toBe('#b8420d');
    expect(palette.light.gula).toBe('#89472e');
    expect(palette.light.kecap).toBe('#642714');
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
