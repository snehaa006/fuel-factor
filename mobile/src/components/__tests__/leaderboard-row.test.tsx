import { render, screen } from '@testing-library/react-native';

import { LeaderboardRow } from '@/components/leaderboard-row';
import { rank, type RankedRow } from '@/lib/team';
import { getTheme } from '@/theme';

const light = getTheme('light');
const dark = getTheme('dark');

function row(over: Partial<RankedRow> = {}): RankedRow {
  return rank([
    {
      participantCode: 'T-01',
      name: 'Theo',
      daysLogged: 6,
      loggedToday: true,
      isMe: false,
      ...over,
    },
  ])[0];
}

function styleOf(testID: string): Record<string, unknown> {
  const style = screen.getByTestId(testID).props.style;
  return Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
}

describe('LeaderboardRow', () => {
  it('shows the position, the name and the days', async () => {
    await render(<LeaderboardRow row={row()} windowDays={7} testID="r" />);
    expect(screen.getByTestId('r-position')).toHaveTextContent('1');
    expect(screen.getByText('Theo')).toBeTruthy();
    expect(screen.getByText(/6 of 7 days/)).toBeTruthy();
  });

  it('lights the dot for an athlete who logged today', async () => {
    await render(<LeaderboardRow row={row({ loggedToday: true })} windowDays={7} testID="r" />);
    expect(styleOf('r-today').backgroundColor).toBe(light.colors.pisang);
  });

  it('leaves the dot sunken for one who has not', async () => {
    await render(<LeaderboardRow row={row({ loggedToday: false })} windowDays={7} testID="r" />);
    expect(styleOf('r-today').backgroundColor).toBe(light.colors['surface-sunken']);
  });

  it('tags the athlete’s own row', async () => {
    await render(<LeaderboardRow row={row({ isMe: true })} windowDays={7} testID="r" />);
    expect(screen.getByTestId('r-you')).toHaveTextContent('YOU');
  });

  it('does not tag a teammate’s row', async () => {
    await render(<LeaderboardRow row={row({ isMe: false })} windowDays={7} testID="r" />);
    expect(screen.queryByTestId('r-you')).toBeNull();
  });

  it('marks the athlete’s own row with a fill, never a border', async () => {
    // The week strip learnt this one: a border has to contrast with whatever
    // is inside it and the fill changes with the theme, so an outline that
    // reads in light can vanish in dark.
    await render(<LeaderboardRow row={row({ isMe: true })} windowDays={7} testID="r" />);
    const style = styleOf('r');
    expect(style.backgroundColor).toBe(light.colors['pisang-tint']);
    expect(style.borderWidth).toBeUndefined();
  });

  it('reads the whole standing out in one label', async () => {
    await render(
      <LeaderboardRow row={row({ isMe: true, loggedToday: false })} windowDays={7} testID="r" />
    );
    expect(screen.getByTestId('r').props.accessibilityLabel).toBe(
      '1. Theo, you 6 of 7 days not logged today'
    );
  });

  it('draws nothing that could carry a body metric', async () => {
    // The row renders the fields of RankedRow and no others. If a weight or a
    // waist ever reached this component it would have to be added here first,
    // and this test is where that gets noticed.
    await render(<LeaderboardRow row={row()} windowDays={7} testID="r" />);
    const text = screen.getByTestId('r').props.accessibilityLabel as string;
    expect(text).not.toMatch(/kg|cm|weight|waist|calf|bmi/i);
  });
});

describe('in dark mode', () => {
  const original = light;

  it('still separates a lit dot from a sunken one', async () => {
    // Both themes, because the contrast of the one marker on this row is the
    // thing a test can check and the simulator caught last time.
    expect(dark.colors.pisang).not.toBe(dark.colors['surface-sunken']);
    expect(original.colors.pisang).not.toBe(original.colors['surface-sunken']);
  });

  it('still separates the athlete’s own fill from a teammate’s', async () => {
    expect(dark.colors['pisang-tint']).not.toBe(dark.colors['surface-raised']);
    expect(original.colors['pisang-tint']).not.toBe(original.colors['surface-raised']);
  });
});
