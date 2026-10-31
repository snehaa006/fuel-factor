import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Mascot, MASCOT_ASPECT, MASCOT_POSES } from '@/components/mascot';
import { MascotBanner } from '@/components/mascot-banner';

/**
 * A decorative mascot is deliberately hidden from the accessibility tree, and
 * the default queries skip hidden elements. Finding it in a test therefore
 * has to opt in -- which is itself the proof that it is hidden.
 */
const hidden = (testID: string) =>
  screen.getByTestId(testID, { includeHiddenElements: true });

beforeEach(() => {
  jest.restoreAllMocks();
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
