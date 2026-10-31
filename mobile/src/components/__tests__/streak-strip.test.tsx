import { render, screen } from '@testing-library/react-native';

import { StreakStrip } from '@/components/streak-strip';
import { recentDays } from '@/lib/streak';
import { getTheme } from '@/theme';

const light = getTheme('light');

function styleOf(testID: string): Record<string, unknown> {
  const style = screen.getByTestId(testID).props.style;
  return Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
}

function fillOf(testID: string): string | undefined {
  return styleOf(testID).backgroundColor as string | undefined;
}

function sizeOf(testID: string): number {
  return styleOf(testID).width as number;
}

describe('StreakStrip', () => {
  it('draws a cell per day', async () => {
    await render(<StreakStrip days={recentDays(['2026-10-31'], '2026-10-31')} testID="strip" />);
    // Six dated cells plus today's, which is keyed as today so the screen can
    // find it without knowing the date.
    expect(screen.getByTestId('strip-today')).toBeTruthy();
    expect(screen.getByTestId('strip-2026-10-25')).toBeTruthy();
  });

  it('fills a logged day and leaves an unlogged one sunken', async () => {
    await render(
      <StreakStrip days={recentDays(['2026-10-29'], '2026-10-31')} testID="strip" />
    );
    expect(fillOf('strip-2026-10-29')).toBe(light.colors.pisang);
    expect(fillOf('strip-2026-10-28')).toBe(light.colors['surface-sunken']);
  });

  it('leaves today sunken while the day is still open', async () => {
    await render(
      <StreakStrip days={recentDays(['2026-10-30'], '2026-10-31')} testID="strip" />
    );
    expect(fillOf('strip-today')).toBe(light.colors['surface-sunken']);
  });

  it('marks today by size rather than by an outline', async () => {
    // An outline has to contrast with a fill that changes with state and
    // theme; a bigger dot reads the same in both and without colour.
    await render(<StreakStrip days={recentDays([], '2026-10-31')} testID="strip" />);
    expect(sizeOf('strip-today')).toBeGreaterThan(sizeOf('strip-2026-10-30'));
  });

  it('counts the logged days for a screen reader', async () => {
    await render(
      <StreakStrip days={recentDays(['2026-10-31', '2026-10-30'], '2026-10-31')} testID="strip" />
    );
    expect(screen.getByLabelText('2 of the last 7 days logged')).toBeTruthy();
  });

  it('renders nothing but survives an empty window', async () => {
    await render(<StreakStrip days={[]} testID="strip" />);
    expect(screen.getByTestId('strip')).toBeTruthy();
  });
});
