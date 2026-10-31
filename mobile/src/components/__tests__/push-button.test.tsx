import * as Haptics from 'expo-haptics';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { PushButton } from '@/components/push-button';
import { getTheme } from '@/theme';

const light = getTheme('light');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

describe('PushButton', () => {
  it('renders its label and announces itself as a button', async () => {
    await render(<PushButton label="Log breakfast" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Log breakfast' })).toBeTruthy();
    expect(screen.getByText('Log breakfast')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<PushButton label="Mark done" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<PushButton label="Log breakfast" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('marks itself disabled for assistive technology', async () => {
    await render(<PushButton label="Log breakfast" disabled testID="btn" />);
    expect(screen.getByTestId('btn')).toBeDisabled();
  });

  it('fires a light haptic on press in', async () => {
    await render(<PushButton label="Mark done" onPress={jest.fn()} testID="live" />);
    fireEvent(screen.getByTestId('live'), 'pressIn');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('stays silent on press in when disabled', async () => {
    await render(<PushButton label="Mark done" disabled testID="dead" />);
    fireEvent(screen.getByTestId('dead'), 'pressIn');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('draws the solid under-edge, and drops it when disabled', async () => {
    const view = await render(<PushButton label="Log" onPress={jest.fn()} testID="btn" />);
    expect(screen.getByTestId('btn-edge')).toBeTruthy();

    await view.rerender(<PushButton label="Log" onPress={jest.fn()} disabled testID="btn" />);
    expect(screen.queryByTestId('btn-edge')).toBeNull();
  });

  describe('variants take their colours from the design system', () => {
    const cases = [
      {
        variant: 'primary',
        fill: light.colors.pisang,
        label: light.colors['on-bright'],
        edge: light.colors['pisang-edge'],
      },
      {
        variant: 'success',
        fill: light.colors.daun,
        label: light.colors['on-bright'],
        edge: light.colors['daun-edge'],
      },
      {
        variant: 'alert',
        fill: light.colors['fill-alert'],
        label: light.colors['on-fill'],
        edge: light.colors['cabai-edge'],
      },
    ] as const;

    it.each(cases)('$variant', async ({ variant, fill, label, edge }) => {
      await render(<PushButton variant={variant} label="Go" onPress={jest.fn()} testID="btn" />);
      expect(screen.getByText('Go')).toHaveStyle({ color: label });
      expect(screen.getByTestId('btn-edge')).toHaveStyle({ backgroundColor: edge });
      // The slab is the Text's parent view.
      expect(screen.getByText('Go').parent).toHaveStyle({ backgroundColor: fill });
    });

    it('ghost takes a border, and is filled with the page colour', async () => {
      await render(<PushButton variant="ghost" label="Skip" onPress={jest.fn()} testID="btn" />);
      expect(screen.getByText('Skip').parent).toHaveStyle({
        backgroundColor: light.colors.surface,
        borderColor: light.colors.hairline,
        borderWidth: 2,
      });
    });

    it('ghost is opaque, so the under-edge never shows through it', async () => {
      // A transparent fill let the hairline edge read as a solid block.
      await render(<PushButton variant="ghost" label="Skip" onPress={jest.fn()} testID="btn" />);
      expect(screen.getByText('Skip').parent).not.toHaveStyle({ backgroundColor: 'transparent' });
    });

    it('disabled uses the locked fill and the faint label', async () => {
      await render(<PushButton label="Nope" disabled testID="btn" />);
      expect(screen.getByText('Nope')).toHaveStyle({ color: light.colors['ink-faint'] });
      expect(screen.getByText('Nope').parent).toHaveStyle({ backgroundColor: light.colors.locked });
    });
  });

  it('labels use the button type style, so the font is never a silent fallback', async () => {
    await render(<PushButton label="Go" onPress={jest.fn()} />);
    expect(screen.getByText('Go')).toHaveStyle({
      fontFamily: light.typography.button.fontFamily,
      fontSize: light.typography.button.fontSize,
    });
  });

  it('never labels a bright fill with ink, which would flip to cream in dark mode', async () => {
    await render(<PushButton label="Go" onPress={jest.fn()} />);
    expect(screen.getByText('Go')).not.toHaveStyle({ color: getTheme('dark').colors.ink });
  });
});
