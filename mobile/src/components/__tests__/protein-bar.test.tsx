import { render, screen } from '@testing-library/react-native';

import { ProteinBar } from '@/components/protein-bar';

describe('ProteinBar', () => {
  it('shows the day’s protein and the deck’s band', async () => {
    await render(<ProteinBar eaten={54.6} band={{ min: 109, max: 150 }} itemsWithoutFigures={0} testID="p" />);
    expect(screen.getByTestId('p-eaten')).toHaveTextContent('55 g');
    expect(screen.getByTestId('p-band-text')).toHaveTextContent(/109–150 g a day \(1\.6–2\.2 g per kg\)/);
    expect(screen.getByTestId('p-band')).toBeTruthy();
  });

  it('draws no band without a weight', async () => {
    await render(<ProteinBar eaten={20} band={null} itemsWithoutFigures={0} testID="p" />);
    expect(screen.queryByTestId('p-band')).toBeNull();
    expect(screen.getByTestId('p-band-text')).toHaveTextContent(/No band without a weight/);
  });

  it('says the total is a floor when some items have no figure', async () => {
    await render(<ProteinBar eaten={18} band={{ min: 109, max: 150 }} itemsWithoutFigures={2} testID="p" />);
    expect(screen.getByText(/2 items have no protein figure yet, so the real total may be higher/)).toBeTruthy();
  });

  it('passes no verdict', async () => {
    await render(<ProteinBar eaten={18} band={{ min: 109, max: 150 }} itemsWithoutFigures={0} testID="p" />);
    expect(screen.queryByText(/low|short|behind|not enough|bad/i)).toBeNull();
  });
});
