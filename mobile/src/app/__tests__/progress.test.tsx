import { render, screen } from '@testing-library/react-native';

import ProgressScreen from '@/app/progress';
import { DEMO_PROGRESS } from '@/lib/__fixtures__/today';
import { useProgress } from '@/lib/use-progress';
import type { Progress } from '@/lib/progress';

jest.mock('@/lib/use-progress', () => ({
  ...jest.requireActual('@/lib/use-progress'),
  useProgress: jest.fn(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

const mockUseProgress = useProgress as jest.MockedFunction<typeof useProgress>;

const progress = (over: Partial<Progress> = {}): Progress => ({ ...DEMO_PROGRESS, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProgress.mockReturnValue({ status: 'ready', progress: progress() });
});

describe('the Progress screen', () => {
  it('draws every measure', async () => {
    await render(<ProgressScreen />);
    for (const key of ['urine', 'fluid', 'breakfast', 'energy']) {
      expect(screen.getByTestId(`metric-${key}`)).toBeTruthy();
    }
  });

  it('shows the baseline and the current figure side by side', async () => {
    await render(<ProgressScreen />);
    expect(screen.getByTestId('metric-urine-baseline')).toHaveTextContent('6');
    expect(screen.getByTestId('metric-urine-current')).toHaveTextContent('5.2');
  });

  it('prints the change as plain arithmetic', async () => {
    await render(<ProgressScreen />);
    expect(screen.getByTestId('metric-urine-change')).toHaveTextContent('Change: -0.8');
  });

  it('says why a measure has no baseline', async () => {
    // The gap is the programme's own finding, not a failure of the screen.
    await render(<ProgressScreen />);
    expect(screen.getByTestId('metric-fluid-missing')).toHaveTextContent(/never been collected/);
  });

  it('gives no change line where there is no baseline', async () => {
    await render(<ProgressScreen />);
    expect(screen.queryByTestId('metric-fluid-change')).toBeNull();
  });

  it('attributes the hydration wording to the tracker', async () => {
    await render(<ProgressScreen />);
    expect(screen.getByTestId('metric-urine-note')).toHaveTextContent(
      'The tracker calls this: Drink more today'
    );
  });

  it('prints no wording for a measure the programme has not worded', async () => {
    await render(<ProgressScreen />);
    expect(screen.queryByTestId('metric-energy-note')).toBeNull();
  });

  it('shows a fitness test that has not been re-run as not re-measured', async () => {
    await render(<ProgressScreen />);
    expect(screen.getByTestId('assessment-Cooper 12-min run')).toHaveTextContent(
      /2680 m at baseline · not re-measured yet/
    );
  });

  it('hides the fitness section when there are no assessments', async () => {
    // Jeongho's Cooper run was never completed, so he has no row at all.
    mockUseProgress.mockReturnValue({
      status: 'ready',
      progress: progress({ assessments: [] }),
    });
    await render(<ProgressScreen />);
    expect(screen.queryByText('Fitness tests')).toBeNull();
  });

  it('says out loud that it passes no judgement', async () => {
    // The direction of better is a nutrition call nobody has made.
    await render(<ProgressScreen />);
    expect(screen.getByTestId('progress-basis')).toHaveTextContent(
      /Whether a change is good is for the programme to say, not the app/
    );
  });

  it('draws an athlete with nothing recorded without crashing', async () => {
    mockUseProgress.mockReturnValue({
      status: 'ready',
      progress: {
        metrics: DEMO_PROGRESS.metrics.map((m) => ({
          ...m,
          baseline: { value: null, days: 0 },
          current: { value: null, days: 0 },
          note: null,
        })),
        assessments: [],
      },
    });
    await render(<ProgressScreen />);
    expect(screen.getByTestId('metric-urine-baseline')).toHaveTextContent('—');
  });

  it('shows a refusal in words', async () => {
    mockUseProgress.mockReturnValue({ status: 'error', message: 'permission denied' });
    await render(<ProgressScreen />);
    expect(screen.getByText('permission denied')).toBeTruthy();
  });
});
