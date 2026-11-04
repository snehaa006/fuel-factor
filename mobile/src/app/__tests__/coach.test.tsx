import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Coach from '@/app/coach';
import { DEMO_COACH_VIEW, DEMO_NAMES } from '@/lib/__fixtures__/today';
import { useAccount } from '@/lib/use-account';
import { useCoach } from '@/lib/use-coach';
import type { Account } from '@/lib/account';
import type { CoachView } from '@/lib/coach';

jest.mock('@/lib/use-coach');
jest.mock('@/lib/use-account');

// A mock factory can only reach variables named mock*, so these are.
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
  // Records where the guard sent the caller and renders nothing, which is
  // what the real one does to this tree.
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockUseCoach = useCoach as jest.MockedFunction<typeof useCoach>;
const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockJoin = jest.fn();

const signedInAs = (account: Account) =>
  mockUseAccount.mockReturnValue({ status: 'ready', account, reload: jest.fn() });

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
  signedInAs({ role: 'coach', email: 'coach@example.com' });
});

describe('who the coach half lets in', () => {
  it('sends a visitor with no account to the coach sign-in', async () => {
    signedInAs({ role: 'signed-out' });
    await render(<Coach />);
    expect(mockRedirect).toHaveBeenCalledWith('/coach/account');
    expect(screen.queryByTestId('coach-code')).toBeNull();
  });

  it('tells an athlete plainly, rather than offering a code box', async () => {
    // The old screen asked a 15-year-old for a coach code it was never going
    // to accept. Saying so is the whole fix.
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.com' });
    await render(<Coach />);
    expect(screen.getByTestId('coach-is-athlete')).toHaveTextContent(/signed in as an athlete/);
    expect(screen.queryByTestId('coach-code')).toBeNull();
    expect(screen.queryByTestId('coach-today')).toBeNull();
  });

  it('never runs a squad query for an athlete', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.com' });
    await render(<Coach />);
    expect(mockUseCoach).not.toHaveBeenCalled();
  });

  it('sends an athlete back to their own day', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.com' });
    await render(<Coach />);
    fireEvent.press(screen.getByTestId('coach-back-to-today'));
    expect(mockReplace).toHaveBeenCalledWith('/today');
  });

  it('gives an account that is neither the code gate', async () => {
    signedInAs({ role: 'unlinked', email: 'new@example.com' });
    mockUseCoach.mockReturnValue({
      status: 'needs-code',
      join: mockJoin,
      joining: false,
      joinError: null,
    });
    await render(<Coach />);
    expect(screen.getByTestId('coach-code')).toBeTruthy();
  });
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
