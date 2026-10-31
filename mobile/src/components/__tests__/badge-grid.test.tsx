import { render, screen } from '@testing-library/react-native';

import { BadgeGrid } from '@/components/badge-grid';
import { DEMO_BADGES } from '@/lib/__fixtures__/today';
import { getTheme } from '@/theme';

const light = getTheme('light');
const dark = getTheme('dark');

function styleOf(testID: string): Record<string, unknown> {
  const style = screen.getByTestId(testID).props.style;
  return Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
}

describe('BadgeGrid', () => {
  it('draws every badge, earned and not', async () => {
    await render(<BadgeGrid badges={DEMO_BADGES} testID="b" />);
    for (const badge of DEMO_BADGES) {
      expect(screen.getByTestId(`b-${badge.code}`)).toBeTruthy();
    }
  });

  it('says Earned on one that is', async () => {
    await render(<BadgeGrid badges={DEMO_BADGES} testID="b" />);
    expect(screen.getByTestId('b-first_log-state')).toHaveTextContent('Earned');
  });

  it('shows the criterion and the distance on one that is not', async () => {
    // A locked badge is a target, so it says what to do and how far off it is.
    await render(<BadgeGrid badges={DEMO_BADGES} testID="b" />);
    expect(screen.getByTestId('b-ten_days-state')).toHaveTextContent(
      'Log on ten different days. 7 of 10'
    );
  });

  it('marks earned with a fill, never a border', async () => {
    await render(<BadgeGrid badges={DEMO_BADGES} testID="b" />);
    expect(styleOf('b-first_log').backgroundColor).toBe(light.colors['pisang-tint']);
    expect(styleOf('b-first_log').borderWidth).toBeUndefined();
    expect(styleOf('b-ten_days').backgroundColor).toBe(light.colors.locked);
  });

  it('reads earned and locked differently to a screen reader', async () => {
    await render(<BadgeGrid badges={DEMO_BADGES} testID="b" />);
    expect(screen.getByTestId('b-first_log').props.accessibilityLabel).toBe('First Touch, earned');
    expect(screen.getByTestId('b-ten_days').props.accessibilityLabel).toMatch(/not yet/);
  });

  it('draws an empty set without crashing', async () => {
    await render(<BadgeGrid badges={[]} testID="b" />);
    expect(screen.getByTestId('b')).toBeTruthy();
  });

  it('separates earned from locked in both themes', async () => {
    // The pair that carries the whole meaning of this component, checked in
    // dark too -- the week strip's outline read in light and vanished in dark.
    expect(light.colors['pisang-tint']).not.toBe(light.colors.locked);
    expect(dark.colors['pisang-tint']).not.toBe(dark.colors.locked);
  });
});
