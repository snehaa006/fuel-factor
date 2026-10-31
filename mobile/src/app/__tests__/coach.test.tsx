import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Coach from '@/app/coach';
import { DEMO_COACH_VIEW, DEMO_NAMES } from '@/lib/__fixtures__/today';
import { useCoach } from '@/lib/use-coach';
import type { CoachView } from '@/lib/coach';

jest.mock('@/lib/use-coach');
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

const mockUseCoach = useCoach as jest.MockedFunction<typeof useCoach>;
const mockJoin = jest.fn();

const ready = (over: Partial<CoachView> = {}) =>
  ({
    status: 'ready' as const,
    view: { ...DEMO_COACH_VIEW, ...over },
    join: mockJoin,
    joining: false,
    joinError: null,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCoach.mockReturnValue(ready());
});

describe('the coach code gate', () => {
  beforeEach(() => {
    mockUseCoach.mockReturnValue({
      status: 'needs-code',
      join: mockJoin,
      joining: false,
      joinError: null,
    });
  });

  it('asks for a code before showing anything', async () => {
    await render(<Coach />);
    expect(screen.getByTestId('coach-code')).toBeTruthy();
    expect(screen.queryByTestId('coach-today')).toBeNull();
  });

  it('says the squad’s code will not work', async () => {
    // An athlete who has the join code must not think it opens this.
    await render(<Coach />);
    expect(screen.getByText(/not the same code the squad uses/)).toBeTruthy();
  });

  it('will not submit an empty code', async () => {
    await render(<Coach />);
    expect(screen.getByTestId('coach-join').props.accessibilityState.disabled).toBe(true);
  });

  it('joins with the code typed', async () => {
    await render(<Coach />);
    fireEvent.changeText(screen.getByTestId('coach-code'), 'COACH01');
    await waitFor(() =>
      expect(screen.getByTestId('coach-join').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('coach-join'));
    expect(mockJoin).toHaveBeenCalledWith('COACH01');
  });

  it('shows a refused code in the words the database used', async () => {
    mockUseCoach.mockReturnValue({
      status: 'needs-code',
      join: mockJoin,
      joining: false,
      joinError: 'no team with that coach code',
    });
    await render(<Coach />);
    expect(screen.getByTestId('coach-join-error')).toHaveTextContent('no team with that coach code');
  });
});

describe('the coach dashboard', () => {
  it('leads with who logged today', async () => {
    await render(<Coach />);
    expect(screen.getByTestId('coach-today')).toHaveTextContent(/2 of 3 logged today/);
  });

  it('draws the roster alphabetically', async () => {
    await render(<Coach />);
    for (const athlete of DEMO_COACH_VIEW.athletes) {
      expect(screen.getByTestId(`athlete-${athlete.participantId}`)).toBeTruthy();
    }
    const names = DEMO_COACH_VIEW.athletes.map((a) => a.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names).toContain(DEMO_NAMES.me);
  });

  it('shows the counts a coach opens this for', async () => {
    await render(<Coach />);
    expect(screen.getByTestId('athlete-p-theo-counts')).toHaveTextContent(
      'Logged 11 days · breakfast 6 · 2 of 8 days inside the band'
    );
  });

  it('says when no day could be measured, rather than showing a zero', async () => {
    // Jeongho's weight disagrees between the tracker's tabs, so there is no
    // band to judge him against. "0 of 0 inside" would read as a failure.
    await render(<Coach />);
    expect(screen.getByTestId('athlete-p-jeongho-counts')).toHaveTextContent(
      /no day could be measured against the band/
    );
  });

  it('shows both flags with the threshold they fired on', async () => {
    await render(<Coach />);
    expect(screen.getByTestId('athlete-p-theo-flag-under_fuelling')).toHaveTextContent(
      /3 recorded days running below/
    );
    expect(screen.getByTestId('athlete-p-theo-flag-dehydrated')).toHaveTextContent(/5 or worse/);
  });

  it('gives a clean athlete no flags', async () => {
    await render(<Coach />);
    expect(screen.queryByTestId('athlete-p-jacob-flag-under_fuelling')).toBeNull();
    expect(screen.queryByTestId('athlete-p-jacob-flag-dehydrated')).toBeNull();
  });

  it('says the photos are not here', async () => {
    // A coach can read a completion tick. The picture of a 14-year-old is
    // not what this screen is for, and saying so is part of the product.
    await render(<Coach />);
    expect(screen.getByTestId('coach-basis')).toHaveTextContent(/photos are not shown here/);
  });

  it('attributes the flags to the programme', async () => {
    await render(<Coach />);
    expect(screen.getByTestId('coach-basis')).toHaveTextContent(
      /programme's own thresholds, not the app's/
    );
  });

  it('explains an empty squad', async () => {
    mockUseCoach.mockReturnValue(ready({ athletes: [], loggedToday: 0 }));
    await render(<Coach />);
    expect(screen.getByTestId('coach-empty')).toBeTruthy();
  });

  it('shows a refusal in words', async () => {
    mockUseCoach.mockReturnValue({
      status: 'error',
      message: 'permission denied',
      join: mockJoin,
      joining: false,
      joinError: null,
    });
    await render(<Coach />);
    expect(screen.getByText('permission denied')).toBeTruthy();
  });
});
