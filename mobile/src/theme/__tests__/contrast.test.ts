import { getTheme, type ThemeName } from '@/theme';

/** WCAG relative luminance for an #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The design system promises 4.5:1 for text in BOTH themes. A palette change
 * that quietly breaks a pairing should fail here, not in a screenshot.
 */
const PAIRS: { fg: string; bg: string; label: string }[] = [
  { fg: 'ink', bg: 'surface', label: 'body text on the app background' },
  { fg: 'ink', bg: 'surface-raised', label: 'body text on a card' },
  { fg: 'ink-muted', bg: 'surface', label: 'secondary text on the background' },
  { fg: 'ink-muted', bg: 'surface-raised', label: 'secondary text on a card' },
  { fg: 'on-bright', bg: 'pisang', label: 'primary button label' },
  { fg: 'on-bright', bg: 'daun', label: 'success button label' },
  { fg: 'on-fill', bg: 'fill-alert', label: 'alert button label' },
  { fg: 'on-fill', bg: 'kecap', label: 'label on the dark brand brown' },
  { fg: 'pisang-deep', bg: 'surface-raised', label: 'carb figures on a card' },
  { fg: 'cabai-deep', bg: 'cabai-tint', label: 'alert text on its tint' },
  { fg: 'daun-deep', bg: 'daun-tint', label: 'success text on its tint' },
  { fg: 'air-deep', bg: 'air-tint', label: 'hydration text on its tint' },
  { fg: 'kecap-deep', bg: 'kecap-tint', label: 'learn text on its tint' },
];

describe.each(['light', 'dark'] as ThemeName[])('%s theme contrast', (name) => {
  const { colors } = getTheme(name);

  it.each(PAIRS)('$label reaches 4.5:1', ({ fg, bg }) => {
    const ratio = contrast(colors[fg as keyof typeof colors], colors[bg as keyof typeof colors]);
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(4.5);
  });

  it('ink-faint is deliberately below 4.5:1, so it stays off real content', () => {
    expect(contrast(colors['ink-faint'], colors.surface)).toBeLessThan(4.5);
  });

  it('never puts ink on a bright fill — that is what on-bright is for', () => {
    // ink flips to cream in dark while pisang and daun do not, so this pairing
    // is readable in light and unreadable in dark. The regression this guards.
    const onBright = contrast(colors['on-bright'], colors.pisang);
    expect(Number(onBright.toFixed(2))).toBeGreaterThanOrEqual(4.5);
  });
});
