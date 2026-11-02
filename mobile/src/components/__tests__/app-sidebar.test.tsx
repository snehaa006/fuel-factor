import { cleanup, render, screen } from '@testing-library/react-native';

import { AppSidebar } from '@/components/app-sidebar';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/account', () => ({ signOut: jest.fn() }));

afterEach(cleanup);

/**
 * The athlete's menu, and what it leaves off.
 *
 * "Coach" came off it because an item that walks somebody to a door and reads
 * them the rule is the app asking them to try it. The same argument applies
 * to Today, Learn, Team and Progress before the programme has started.
 */
describe('the athlete menu', () => {
  it('lists the whole app once the programme is running', async () => {
    await render(<AppSidebar open onClose={jest.fn()} title="Theo" />);
    for (const key of ['profile', 'today', 'recall', 'learn', 'team', 'progress', 'sign-out']) {
      expect(screen.getByTestId(`sidebar-${key}`)).toBeTruthy();
    }
  });

  it('never offers an athlete the coach’s half', async () => {
    await render(<AppSidebar open onClose={jest.fn()} title="Theo" />);
    expect(screen.queryByTestId('sidebar-coach')).toBeNull();
  });

  it('lists only the recall and the way out before day one', async () => {
    await render(<AppSidebar open onClose={jest.fn()} title="Theo" beforeStart />);
    for (const key of ['profile', 'before', 'recall', 'sign-out']) {
      expect(screen.getByTestId(`sidebar-${key}`)).toBeTruthy();
    }
    for (const key of ['today', 'learn', 'team', 'progress']) {
      expect(screen.queryByTestId(`sidebar-${key}`)).toBeNull();
    }
  });

  it('keeps the way out, so a device is never stuck as whoever it became', async () => {
    await render(<AppSidebar open onClose={jest.fn()} title="Theo" beforeStart />);
    expect(screen.getByTestId('sidebar-sign-out')).toBeTruthy();
  });
});
