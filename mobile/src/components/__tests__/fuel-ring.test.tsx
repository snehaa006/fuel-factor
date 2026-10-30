import { render, screen } from '@testing-library/react-native';

import { FuelRing, ringGeometry } from '@/components/fuel-ring';

const BAND = { min: 340, max: 476 };

describe('ring geometry', () => {
  it('fills to the share of the band’s top that was eaten', () => {
    expect(ringGeometry(238, BAND).eatenFraction).toBeCloseTo(0.5);
  });

  it('starts the shaded band at the bottom of the band, not at zero', () => {
    expect(ringGeometry(0, BAND).bandStart).toBeCloseTo(340 / 476);
  });

  it('clamps the fill to a full ring when the band is exceeded', () => {
    expect(ringGeometry(900, BAND).eatenFraction).toBe(1);
  });

  it('draws nothing at all without a band', () => {
    // No band means no scale to draw against, and the ring must not invent one.
    expect(ringGeometry(111, null)).toMatchObject({ bandStart: 0, eatenFraction: 0 });
  });

  it('never goes negative', () => {
    expect(ringGeometry(-50, BAND).eatenFraction).toBe(0);
  });
});

describe('FuelRing', () => {
  it('shows what was eaten, rounded to whole grams', async () => {
    await render(<FuelRing eaten={111.4} band={BAND} testID="ring" />);
    expect(screen.getByTestId('ring-value')).toHaveTextContent('111');
  });

  it('shows the band as a range, never a midpoint', async () => {
    await render(<FuelRing eaten={111} band={BAND} testID="ring" />);
    expect(screen.getByTestId('ring-band-label')).toHaveTextContent('of 340–476 g');
    expect(screen.queryByText(/408/)).toBeNull();
  });

  it('says plainly when there is no target', async () => {
    await render(<FuelRing eaten={0} band={null} testID="ring" />);
    expect(screen.getByTestId('ring-band-label')).toHaveTextContent('no target set');
  });

  it('surfaces items whose portions carry no figure', async () => {
    await render(<FuelRing eaten={54} band={BAND} itemsWithoutFigures={2} testID="ring" />);
    expect(screen.getByTestId('ring-unknown')).toHaveTextContent('plus 2 items with no figure yet');
  });

  it('says item, not items, for one of them', async () => {
    await render(<FuelRing eaten={54} band={BAND} itemsWithoutFigures={1} testID="ring" />);
    expect(screen.getByTestId('ring-unknown')).toHaveTextContent('plus 1 item with no figure yet');
  });

  it('says nothing about unknowns when every portion has a figure', async () => {
    await render(<FuelRing eaten={111} band={BAND} testID="ring" />);
    expect(screen.queryByTestId('ring-unknown')).toBeNull();
  });
});
