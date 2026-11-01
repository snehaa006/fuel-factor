import { fireEvent, render, screen } from '@testing-library/react-native';

import { Sidebar, SidebarButton, type SidebarItem } from '@/components/sidebar';
import { useReduceMotion } from '@/lib/use-reduce-motion';

jest.mock('@/lib/use-reduce-motion');

const mockReduceMotion = useReduceMotion as jest.MockedFunction<typeof useReduceMotion>;
const onClose = jest.fn();
const onProfile = jest.fn();

const items: SidebarItem[] = [
  { key: 'profile', label: 'Profile', onPress: onProfile },
  { key: 'today', label: 'Today', onPress: jest.fn(), current: true },
  { key: 'coach', label: 'Coach', detail: 'Coaches only.', onPress: jest.fn() },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion.mockReturnValue(false);
});

const open = (isOpen = true) =>
  render(
    <Sidebar open={isOpen} onClose={onClose} title="Theo" items={items} testID="sidebar" />
  );

describe('the panel', () => {
  it('is not in the tree at all when closed', async () => {
    // Unmounted rather than parked offscreen, so nothing behind it can be
    // reached by a swipe or by the accessibility cursor.
    await open(false);
    expect(screen.queryByTestId('sidebar')).toBeNull();
  });

  it('shows every item when open', async () => {
    await open();
    for (const item of items) {
      expect(screen.getByTestId(`sidebar-${item.key}`)).toBeTruthy();
    }
  });

  it('leads with the profile button it was added for', async () => {
    await open();
    expect(screen.getByTestId('sidebar-profile')).toBeTruthy();
  });

  it('names who is signed in', async () => {
    await open();
    expect(screen.getByText('Theo')).toBeTruthy();
  });

  it('marks the page you are already on', async () => {
    await open();
    expect(screen.getByTestId('sidebar-today').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('sidebar-profile').props.accessibilityState.selected).toBe(false);
  });

  it('carries a second line where an item has one', async () => {
    // Said in the menu rather than discovered on the next screen: an athlete
    // who taps Coach gets a sign-in and nothing of anybody's data.
    await open();
    expect(screen.getByText('Coaches only.')).toBeTruthy();
  });
});

describe('tapping an item', () => {
  it('closes the panel and then navigates', async () => {
    await open();
    fireEvent.press(screen.getByTestId('sidebar-profile'));
    expect(onClose).toHaveBeenCalled();
    expect(onProfile).toHaveBeenCalled();
  });

  it('closes on the scrim, which is how a drawer is dismissed', async () => {
    await open();
    fireEvent.press(screen.getByTestId('sidebar-scrim'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('reduced motion', () => {
  it('still shows the whole panel', async () => {
    // A panel sliding across the screen is exactly the movement that setting
    // exists to stop, so it appears instead of sliding -- and it appears.
    mockReduceMotion.mockReturnValue(true);
    await open();
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('sidebar-profile')).toBeTruthy();
  });
});

describe('the button that opens it', () => {
  it('is labelled for a screen reader, not just drawn', async () => {
    const onPress = jest.fn();
    await render(<SidebarButton onPress={onPress} testID="menu" />);
    expect(screen.getByLabelText('Open the menu')).toBeTruthy();
    fireEvent.press(screen.getByTestId('menu'));
    expect(onPress).toHaveBeenCalled();
  });
});
