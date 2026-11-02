import { cleanup, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ProgrammeGate } from '@/components/programme-gate';
import type { ProgrammeState } from '@/lib/programme';
import { useProgramme } from '@/lib/use-programme';

jest.mock('@/lib/use-programme');

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockUseProgramme = useProgramme as jest.MockedFunction<typeof useProgramme>;

afterEach(cleanup);

const programme = (state: ProgrammeState) =>
  mockUseProgramme.mockReturnValue({
    status: 'ready',
    programme: state,
    name: 'Theo',
    teamName: 'Jakarta U16',
    reload: jest.fn(),
  });

const behind = <Text testID="behind">the four weeks</Text>;

beforeEach(() => {
  jest.clearAllMocks();
  programme({ status: 'open', startsOn: '2026-11-01', day: 5, of: 28 });
});

/**
 * One rule, written once, wrapped around the screens that belong to the four
 * weeks. A new screen joins it by being wrapped.
 */
describe('the programme gate', () => {
  it('lets a running programme through', async () => {
    await render(<ProgrammeGate>{behind}</ProgrammeGate>);
    expect(screen.getByTestId('behind')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('sends an athlete waiting for day one to their baseline recall', async () => {
    programme({ status: 'before', startsOn: '2026-12-01', daysUntil: 9 });
    await render(<ProgrammeGate>{behind}</ProgrammeGate>);
    expect(mockRedirect).toHaveBeenCalledWith('/before-you-start');
    expect(screen.queryByTestId('behind')).toBeNull();
  });

  it('does the same when no first day has been set', async () => {
    // Not an open programme. A screen testing `status === 'before'` would
    // have let this through, which is why there is a function for it.
    programme({ status: 'no-date' });
    await render(<ProgrammeGate>{behind}</ProgrammeGate>);
    expect(mockRedirect).toHaveBeenCalledWith('/before-you-start');
  });

  it('renders nothing behind it while it is still asking', async () => {
    mockUseProgramme.mockReturnValue({ status: 'loading', reload: jest.fn() });
    await render(<ProgrammeGate>{behind}</ProgrammeGate>);
    expect(screen.queryByTestId('behind')).toBeNull();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('sends a session with no athlete behind it to the front door', async () => {
    // Which gate that means is `/`'s question, asked in one place.
    mockUseProgramme.mockReturnValue({ status: 'needs-onboarding', reload: jest.fn() });
    await render(<ProgrammeGate>{behind}</ProgrammeGate>);
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('shows a failure rather than guessing that the programme is open', async () => {
    mockUseProgramme.mockReturnValue({ status: 'error', message: 'network request failed', reload: jest.fn() });
    await render(<ProgrammeGate>{behind}</ProgrammeGate>);
    expect(screen.getByTestId('gate-error')).toHaveTextContent(/network request failed/);
    expect(screen.queryByTestId('behind')).toBeNull();
  });
});
