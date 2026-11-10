import { render, screen } from '@testing-library/react-native';

import { GapBars } from '@/components/gap-bars';
import { gapFor, type GapDay } from '@/lib/gaps';

/**
 * The chart's job is to be readable and honest in that order of difficulty.
 * What is asserted here is mostly the second: that a day which could not be
 * judged is still drawn, still counted in the window, and never folded into
 * the figure a coach reads.
 */

const day = (over: Partial<GapDay> = {}): GapDay => ({
  date: '2026-11-01',
  dayType: 'training',
  carbs: 300,
  protein: 100,
  carbsUnknown: 0,
  proteinUnknown: 0,
  ...over,
});

describe('the gap chart', () => {
  it('prints the programme’s band when every day shares one', async () => {
    const gap = gapFor('carb', [day({ dayType: 'match' })], 60);
    await render(<GapBars gap={gap} testID="gap" />);
    expect(screen.getByTestId('gap-band')).toHaveTextContent(
      'The programme asks for 360–480 g a day'
    );
  });

  it('names whose number the band is', async () => {
    const gap = gapFor('protein', [day()], 60);
    await render(<GapBars gap={gap} testID="gap" />);
    expect(screen.getByText(/Week 2 deck/)).toBeTruthy();
  });

  it('counts the short days without telling anybody what to eat', async () => {
    const gap = gapFor('carb', [day({ carbs: 150 }), day({ date: '2026-11-02', carbs: 350 })], 60);
    await render(<GapBars gap={gap} testID="gap" />);
    expect(screen.getByTestId('gap-headline')).toHaveTextContent(
      '1 of 2 recorded days fell below the programme’s carbohydrate band, by 75 g on average.'
    );
  });

  it('draws a day it could not judge, and says why', async () => {
    // Drawn, not dropped: a chart that silently omits the awkward days reads
    // as a complete fortnight when it is not.
    const gap = gapFor('carb', [day({ carbs: 200, carbsUnknown: 1 })], 60);
    await render(<GapBars gap={gap} testID="gap" />);

    expect(screen.getByTestId('gap-2026-11-01')).toBeTruthy();
    expect(screen.getByTestId('gap-unjudged')).toHaveTextContent(
      /None of these days can be measured/
    );
    expect(screen.getByTestId('gap-reason-missing-figures')).toHaveTextContent(
      /no figure in the database/
    );
    // And no average, because there is nothing to average.
    expect(screen.queryByTestId('gap-mean')).toBeNull();
    expect(screen.queryByTestId('gap-headline')).toBeNull();
  });

  it('says the window is empty rather than drawing an empty chart', async () => {
    const gap = gapFor('carb', [], 60);
    await render(<GapBars gap={gap} testID="gap" />);
    expect(screen.getByTestId('gap-empty')).toHaveTextContent('Nothing logged in this window yet.');
  });

  it('leaves the shared band off when the day types gave different ones', async () => {
    const gap = gapFor(
      'carb',
      [day({ dayType: 'training' }), day({ date: '2026-11-02', dayType: 'rest' })],
      60
    );
    await render(<GapBars gap={gap} testID="gap" />);
    // Each bar gets its own band in the grid instead of one wrong line.
    expect(screen.queryByTestId('gap-band')).toBeNull();
    expect(screen.getByTestId('gap-2026-11-01')).toBeTruthy();
    expect(screen.getByTestId('gap-2026-11-02')).toBeTruthy();
  });

  it('reports the average only across the days it could judge', async () => {
    const gap = gapFor(
      'carb',
      [
        day({ carbs: 300 }),
        day({ date: '2026-11-02', carbs: 400 }),
        // Ignored by the average: no figure for one of its foods.
        day({ date: '2026-11-03', carbs: 10, carbsUnknown: 1 }),
      ],
      60
    );
    await render(<GapBars gap={gap} testID="gap" />);
    expect(screen.getByTestId('gap-mean')).toHaveTextContent('350 g average');
  });
});

/**
 * The geometry, which is the half of a chart a reader trusts without
 * checking. A bar that is drawn taller for a smaller number is worse than no
 * chart, and nothing above catches it -- every assertion so far is about text.
 */
describe('the bars themselves', () => {
  const heightOf = (testID: string) => {
    const column = screen.getByTestId(testID);
    // The bar is the last child of its column; the band zone, when per-day,
    // is drawn behind it.
    const styles = column.props.children
      .flat()
      .filter(Boolean)
      .map((child: { props?: { style?: unknown } }) => child?.props?.style)
      .flat()
      .filter(Boolean);
    const withHeight = styles.find(
      (style: Record<string, unknown>) =>
        typeof style?.height === 'number' && style?.backgroundColor !== undefined
    );
    return withHeight.height as number;
  };

  it('draws more eaten as a taller bar', async () => {
    const gap = gapFor(
      'carb',
      [day({ carbs: 100 }), day({ date: '2026-11-02', carbs: 400 })],
      60
    );
    await render(<GapBars gap={gap} testID="gap" />);
    expect(heightOf('gap-2026-11-01')).toBeLessThan(heightOf('gap-2026-11-02'));
  });

  it('keeps the bars proportional to the grams', async () => {
    const gap = gapFor(
      'carb',
      [day({ carbs: 100 }), day({ date: '2026-11-02', carbs: 200 })],
      60
    );
    await render(<GapBars gap={gap} testID="gap" />);
    const small = heightOf('gap-2026-11-01');
    const large = heightOf('gap-2026-11-02');
    expect(large / small).toBeCloseTo(2, 1);
  });

  it('gives a zero-gram day a visible stub rather than nothing at all', async () => {
    // A day logged with no food still has to appear, or the window silently
    // loses a column and reads as a shorter fortnight than it was.
    const gap = gapFor('carb', [day({ carbs: 0, carbsUnknown: 1 })], 60);
    await render(<GapBars gap={gap} testID="gap" />);
    expect(heightOf('gap-2026-11-01')).toBeGreaterThan(0);
  });
});
