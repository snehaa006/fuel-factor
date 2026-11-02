import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { ScaleGuide, ScaleGuideLink } from '@/components/scale-guide';
import { UrineScale } from '@/components/urine-scale';
import { RATING_BANDS, URINE_SCALE } from '@/lib/check-in';

// Each render gets a fresh root; without this the trees accumulate and a
// later lookup searches one that was never populated.
afterEach(cleanup);

/**
 * The workbook's scales, on a link beside the control.
 *
 * What is being tested is mostly that nothing here invents anything: every
 * row is `RATING_BANDS` or `URINE_SCALE`, which are transcriptions of the
 * sheet's own two blocks.
 */
describe('the link that opens it', () => {
  it('reads as a question an athlete would actually ask', async () => {
    await render(<ScaleGuideLink scale="rating" onPress={jest.fn()} />);
    expect(screen.getByText('What do the numbers mean?')).toBeTruthy();
  });

  it('opens the guide from the hydration control', async () => {
    const onShowGuide = jest.fn();
    await render(<UrineScale value={null} onChange={jest.fn()} onShowGuide={onShowGuide} testID="u" />);
    fireEvent.press(screen.getByTestId('u-guide'));
    expect(onShowGuide).toHaveBeenCalled();
  });

  it('is absent where no screen offered one', async () => {
    await render(<UrineScale value={null} onChange={jest.fn()} testID="u" />);
    expect(screen.queryByTestId('u-guide')).toBeNull();
  });
});

describe('the scale guide', () => {
  it('shows nothing until a scale is asked for', async () => {
    await render(<ScaleGuide scale={null} onClose={jest.fn()} />);
    expect(screen.queryByTestId('scale-guide')).toBeNull();
  });

  it('prints the workbook’s four rating bands, word for word', async () => {
    await render(<ScaleGuide scale="rating" onClose={jest.fn()} />);
    for (const band of RATING_BANDS) {
      expect(screen.getByText(band.meaning)).toBeTruthy();
      expect(screen.getByText(`${band.from}–${band.to}`)).toBeTruthy();
    }
  });

  it('prints all eight hydration levels with their colour and their meaning', async () => {
    await render(<ScaleGuide scale="urine" onClose={jest.fn()} />);
    for (const level of URINE_SCALE) {
      expect(screen.getByText(level.colour)).toBeTruthy();
      expect(screen.getByText(level.meaning)).toBeTruthy();
    }
  });

  it('shows one scale at a time, because it opens from one control', async () => {
    await render(<ScaleGuide scale="rating" onClose={jest.fn()} />);
    expect(screen.queryByText('Very pale yellow')).toBeNull();
  });

  it('says whose words these are', async () => {
    // Not the app's advice. The athlete is reading their own workbook.
    await render(<ScaleGuide scale="urine" onClose={jest.fn()} />);
    expect(screen.getByText('FROM YOUR WORKBOOK')).toBeTruthy();
  });

  it('closes on the button and on the scrim behind it', async () => {
    const onClose = jest.fn();
    await render(<ScaleGuide scale="urine" onClose={onClose} />);
    fireEvent.press(screen.getByTestId('scale-guide-close'));
    fireEvent.press(screen.getByTestId('scale-guide-scrim'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('adds no guidance of its own to either table', async () => {
    // The sheet gives a sentence per level and that sentence is all that
    // shows. Anything else here would be the app writing the instrument.
    await render(<ScaleGuide scale="urine" onClose={jest.fn()} />);
    for (const forbidden of [/you should/i, /we recommend/i, /target/i]) {
      expect(screen.queryByText(forbidden)).toBeNull();
    }
  });
});
