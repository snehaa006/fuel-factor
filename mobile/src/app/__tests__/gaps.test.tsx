import { render, screen } from '@testing-library/react-native';

import Gaps from '@/app/gaps';
import { analyse, type GapDay } from '@/lib/gaps';
import { useGaps } from '@/lib/use-gaps';

jest.mock('@/lib/use-gaps', () => ({
  ...jest.requireActual('@/lib/use-gaps'),
  useGaps: jest.fn(),
}));
jest.mock('expo-router', () => ({
  Redirect: () => null,
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

const mockUseGaps = useGaps as jest.MockedFunction<typeof useGaps>;

const day = (over: Partial<GapDay> = {}): GapDay => ({
  date: '2026-11-01',
  dayType: 'training',
  carbs: 300,
  protein: 100,
  carbsUnknown: 0,
  proteinUnknown: 0,
  ...over,
});

const ready = (days: GapDay[], weightKg: number | null = 60) =>
  mockUseGaps.mockReturnValue({
    status: 'ready',
    analysis: analyse(days, weightKg, '2026-11-01', '2026-11-14'),
  });

beforeEach(() => {
  jest.clearAllMocks();
  ready([day()]);
});

describe('the gap analysis screen', () => {
  it('charts the two nutrients the programme set bands for', async () => {
    await render(<Gaps />);
    expect(screen.getByTestId('gap-carb')).toBeTruthy();
    expect(screen.getByTestId('gap-protein')).toBeTruthy();
  });

  it('says how many days the window actually holds', async () => {
    ready([day(), day({ date: '2026-11-02' }), day({ date: '2026-11-03' })]);
    await render(<Gaps />);
    expect(screen.getByTestId('gaps-window')).toHaveTextContent(
      '3 days logged between 2026-11-01 and 2026-11-14.'
    );
  });

  it('says nothing is logged rather than drawing empty charts', async () => {
    ready([]);
    await render(<Gaps />);
    expect(screen.getByTestId('gaps-window')).toHaveTextContent(
      'No days logged between 2026-11-01 and 2026-11-14.'
    );
    expect(screen.getByTestId('gap-carb-empty')).toBeTruthy();
    expect(screen.getByTestId('gap-protein-empty')).toBeTruthy();
  });

  it('explains a missing body weight once, not under every chart', async () => {
    // Both of the programme's bands are per kilogram, so without a weight
    // there is nothing to compare against on either chart.
    ready([day()], null);
    await render(<Gaps />);
    expect(screen.getByTestId('gaps-no-weight')).toHaveTextContent(/set per kilogram/);
  });

  it('leaves the weight note off once there is a weight', async () => {
    await render(<Gaps />);
    expect(screen.queryByTestId('gaps-no-weight')).toBeNull();
  });

  it('keeps the mascot off nutrition', async () => {
    // The mascot speaks about the app. The bands and what they mean are plain
    // text, so nothing a cartoon says can be read as a dietitian's advice.
    await render(<Gaps />);
    expect(screen.getByTestId('gaps-mascot')).toHaveTextContent(
      /Every bar is one day you logged\./
    );
  });

  it('reports a load failure instead of an empty screen', async () => {
    mockUseGaps.mockReturnValue({ status: 'error', message: 'Network request failed' });
    await render(<Gaps />);
    expect(screen.getByTestId('gaps-error')).toHaveTextContent('Network request failed');
  });
});
