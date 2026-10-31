import { render, screen } from '@testing-library/react-native';

import { NudgeCard } from '@/components/nudge-card';
import { getTheme } from '@/theme';

const light = getTheme('light');

const seed = {
  code: 'no_breakfast_training_day',
  domain: 'carbohydrate',
  message: 'Eat breakfast every training day, even a pisang or roti with telur.',
  severity: 2,
  reviewed: false,
};

describe('NudgeCard', () => {
  it('shows the rule’s sentence exactly as written', async () => {
    await render(<NudgeCard nudge={seed} testID="nudge" />);
    expect(screen.getByTestId('nudge-message')).toHaveTextContent(seed.message, { exact: false });
  });

  it('says when a rule has not been reviewed yet', async () => {
    // An unreviewed seed sentence must not pass as clinical guidance in a demo.
    await render(<NudgeCard nudge={seed} testID="nudge" />);
    expect(screen.getByTestId('nudge-unreviewed')).toHaveTextContent(/awaiting dietitian review/);
  });

  it('drops the caveat once the dietitian has signed the rule off', async () => {
    await render(<NudgeCard nudge={{ ...seed, reviewed: true }} testID="nudge" />);
    expect(screen.queryByTestId('nudge-unreviewed')).toBeNull();
  });

  it('labels the domain the rule belongs to', async () => {
    await render(<NudgeCard nudge={{ ...seed, domain: 'hydration' }} testID="nudge" />);
    expect(screen.getByText('HYDRATION')).toBeTruthy();
  });

  // A stack of two cards has to read as two things, so the tint follows the
  // domain. One render per test: unmounting and re-rendering inside a single
  // test leaves a state update in flight and breaks the test after it.
  it('tints a hydration card with the water colour', async () => {
    await render(<NudgeCard nudge={{ ...seed, domain: 'hydration' }} testID="nudge" />);
    expect(fillOf('nudge')).toBe(light.colors['air-tint']);
  });

  it('tints a carbohydrate card with the pisang colour', async () => {
    await render(<NudgeCard nudge={seed} testID="nudge" />);
    expect(fillOf('nudge')).toBe(light.colors['pisang-tint']);
  });

  it('falls back to a tint rather than no background for an unknown domain', async () => {
    // A domain the app has never seen is a row the programme added. It still
    // has to draw.
    await render(<NudgeCard nudge={{ ...seed, domain: 'micronutrient' }} testID="nudge" />);
    expect(fillOf('nudge')).toBe(light.colors['pisang-tint']);
    expect(screen.getByText('MICRONUTRIENT')).toBeTruthy();
  });
});

function fillOf(testID: string): string | undefined {
  const style = screen.getByTestId(testID).props.style;
  return (Array.isArray(style) ? Object.assign({}, ...style.flat()) : style)?.backgroundColor;
}
