import { act, render, screen } from '@testing-library/react-native';

import { materialLabel, NudgeCard } from '@/components/nudge-card';
import { setLanguage } from '@/lib/preferences';
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
    expect(screen.getByTestId('nudge-unreviewed')).toHaveTextContent(/Awaiting dietitian review/);
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

describe('which week a card is from', () => {
  it('names the week the sentence came from', async () => {
    await render(
      <NudgeCard nudge={{ ...seed, domain: 'protein', source: 'week-2-deck' }} testID="nudge" />
    );
    expect(screen.getByTestId('nudge-unreviewed')).toHaveTextContent('Awaiting dietitian review');
    expect(screen.getByText('PROTEIN')).toBeTruthy();
  });

  it('does not guess a week it was not told', () => {
    expect(materialLabel(undefined)).toBe('Programme material');
    expect(materialLabel('tkpi')).toBe('Programme material');
    expect(materialLabel('week-1-deck')).toBe('Week 1 material');
  });
});

describe('in Bahasa Indonesia', () => {
  /**
   * The app does not translate the programme's sentences itself. The rule row
   * has had a `message_id` column for the programme's own Bahasa wording
   * since the schema was written; the card shows it when there is one.
   */
  beforeEach(async () => {
    await act(async () => setLanguage('id'));
  });

  it('shows the programme’s own Bahasa wording when the row has it', async () => {
    await render(
      <NudgeCard nudge={{ ...seed, messageId: 'Sarapan setiap hari latihan.' }} testID="nudge" />
    );
    expect(screen.getByTestId('nudge-message')).toHaveTextContent('Sarapan setiap hari latihan.');
  });

  it('keeps the English sentence rather than inventing a translation', async () => {
    await render(<NudgeCard nudge={{ ...seed, messageId: null }} testID="nudge" />);
    expect(screen.getByTestId('nudge-message')).toHaveTextContent(seed.message, { exact: false });
  });

  it('translates the card’s own words around the sentence', async () => {
    await render(<NudgeCard nudge={seed} testID="nudge" />);
    expect(screen.getByText('KARBOHIDRAT')).toBeTruthy();
    expect(screen.getByTestId('nudge-unreviewed')).toHaveTextContent('Menunggu tinjauan ahli gizi');
  });

  it('never shows the Bahasa wording to an English reader', async () => {
    await act(async () => setLanguage('en'));
    await render(
      <NudgeCard nudge={{ ...seed, messageId: 'Sarapan setiap hari latihan.' }} testID="nudge" />
    );
    expect(screen.getByTestId('nudge-message')).toHaveTextContent(seed.message, { exact: false });
  });
});
