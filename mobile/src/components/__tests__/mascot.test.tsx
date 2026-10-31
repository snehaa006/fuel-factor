import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import * as Haptics from 'expo-haptics';
import { useSharedValue } from 'react-native-reanimated';

import { Mascot, MASCOT_ASPECT, MASCOT_MOTIONS, MASCOT_POSES } from '@/components/mascot';
import { MascotBanner } from '@/components/mascot-banner';
import { SparkleBurst } from '@/components/sparkle-burst';

/**
 * A decorative mascot is deliberately hidden from the accessibility tree, and
 * the default queries skip hidden elements. Finding it in a test therefore
 * has to opt in -- which is itself the proof that it is hidden.
 */
const hidden = (testID: string) =>
  screen.getByTestId(testID, { includeHiddenElements: true });

beforeEach(() => {
  jest.restoreAllMocks();
  // expo-haptics is mocked for the whole suite in jest.setup.js, and
  // restoreAllMocks does not clear a module mock's call history -- so without
  // this, one test's celebration counts as the next one's.
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

describe('Mascot', () => {
  // One render per test. Rendering every pose in a single test leaves a
  // state update in flight past the end of it and the next test renders an
  // empty tree -- which this project has been bitten by before.
  it.each(MASCOT_POSES)('draws the %s pose', async (pose) => {
    await render(<Mascot pose={pose} testID="m" />);
    expect(hidden('m')).toBeTruthy();
  });

  it('gives each pose its own aspect, so none is squashed', () => {
    for (const pose of MASCOT_POSES) {
      expect(MASCOT_ASPECT[pose]).toBeGreaterThan(0.4);
      expect(MASCOT_ASPECT[pose]).toBeLessThan(2);
    }
    // stand is the tall one and balloons the wide one; if these ever match,
    // the aspect table has been filled in with a single value.
    expect(MASCOT_ASPECT.stand).not.toBe(MASCOT_ASPECT.balloons);
  });

  it('is hidden from a screen reader when it carries no words', async () => {
    // Announcing "astronaut" between every section is noise, not
    // information. The text beside it is the accessible content.
    await render(<Mascot pose="stand" testID="m" />);
    const view = hidden('m');
    expect(view.props.accessibilityElementsHidden).toBe(true);
    expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('is announced when it is given a label', async () => {
    await render(<Mascot pose="best" label="Badge earned" testID="m" />);
    const view = screen.getByTestId('m');
    expect(view.props.accessibilityElementsHidden).toBe(false);
    expect(view.props.accessibilityLabel).toBe('Badge earned');
  });

  it('renders at the height it is given', async () => {
    await render(<Mascot pose="stand" size={200} testID="m" />);
    expect(hidden('m')).toBeTruthy();
  });

  it('still renders with motion off', async () => {
    // The still version has to exist, because it is what somebody with
    // vestibular sensitivity gets.
    await render(<Mascot pose="run" motion="none" testID="m" />);
    expect(hidden('m')).toBeTruthy();
  });

  it('renders when the device asks for reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<Mascot pose="best" motion="celebrate" testID="m" />);
    expect(hidden('m')).toBeTruthy();
  });
});

describe('the motions', () => {
  it.each(MASCOT_MOTIONS)('renders with %s', async (how) => {
    await render(<Mascot pose="stand" motion={how} testID="m" />);
    expect(hidden('m')).toBeTruthy();
  });

  it('taps the device once when it celebrates', async () => {
    // The tap belongs to the celebration, not to the render.
    const tap = jest.spyOn(Haptics, 'notificationAsync');
    await render(<Mascot pose="best" motion="celebrate" testID="m" />);
    expect(tap).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('does not tap for an ordinary pose', async () => {
    const tap = jest.spyOn(Haptics, 'notificationAsync');
    await render(<Mascot pose="stand" motion="idle" testID="m" />);
    expect(tap).not.toHaveBeenCalled();
  });

  it('still taps when the device asks for reduced motion', async () => {
    // Reduced motion is about what moves on screen. Somebody who turned it
    // on still deserves to be told they finished the day.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const tap = jest.spyOn(Haptics, 'notificationAsync');
    await render(<Mascot pose="best" motion="celebrate" testID="m" />);
    expect(tap).toHaveBeenCalled();
  });

  it('carries a burst field for the celebration to throw', async () => {
    await render(<Mascot pose="best" motion="celebrate" testID="m" />);
    expect(hidden('m-sparkles')).toBeTruthy();
  });
});

/** The burst takes a shared value, which only a component can own. */
function BurstHarness({ at, testID }: { at: number; testID: string }) {
  const progress = useSharedValue(at);
  return <SparkleBurst progress={progress} testID={testID} />;
}

describe('SparkleBurst', () => {
  it('is decorative, so a screen reader is told nothing', async () => {
    await render(<BurstHarness at={0.5} testID="s" />);
    const field = hidden('s');
    expect(field.props.accessibilityElementsHidden).toBe(true);
    expect(field.props.pointerEvents).toBe('none');
  });

  it('renders at rest', async () => {
    await render(<BurstHarness at={0} testID="s" />);
    expect(hidden('s')).toBeTruthy();
  });

  it('renders at full spread', async () => {
    await render(<BurstHarness at={1} testID="s" />);
    expect(hidden('s')).toBeTruthy();
  });
});

describe('MascotBanner', () => {
  it('puts the message in the text, not in the picture', async () => {
    await render(<MascotBanner pose="stand" message="Nothing logged yet." testID="b" />);
    expect(screen.getByTestId('b-message')).toHaveTextContent('Nothing logged yet.');
    // The mascot itself stays decorative, so the line is read once.
    expect(hidden('b-mascot').props.accessibilityElementsHidden).toBe(true);
  });

  it('shows an eyebrow when given one', async () => {
    await render(<MascotBanner pose="fuel" eyebrow="IN PROGRESS" message="3 of 6." testID="b" />);
    expect(screen.getByText('IN PROGRESS')).toBeTruthy();
  });

  it('works without an eyebrow', async () => {
    await render(<MascotBanner pose="fuel" message="3 of 6." testID="b" />);
    expect(screen.getByTestId('b-message')).toBeTruthy();
  });
});
