import { render, screen } from '@testing-library/react-native';

import { CarbChallengeCard } from '@/components/carb-challenge-card';
import { challengeWeek, weekDates, type ChallengeLog } from '@/lib/carb-challenge';

const START = '2026-11-09';
const full = (date: string): ChallengeLog => ({
  date,
  items: (['breakfast', 'lunch', 'dinner'] as const).map((slot) => ({
    slot,
    carbs_g: 40,
    deckCarbSource: true,
  })),
});

describe('CarbChallengeCard', () => {
  it('names the challenge and quotes the deck', async () => {
    await render(
      <CarbChallengeCard week={challengeWeek([], START, '2026-11-09')} testID="carb" />
    );
    expect(screen.getByText('Add one carb to every meal')).toBeTruthy();
    expect(
      screen.getByText('One addition per meal, three meals a day, every day this week.')
    ).toBeTruthy();
  });

  it('draws one column per day of the week', async () => {
    await render(
      <CarbChallengeCard week={challengeWeek([], START, '2026-11-09')} testID="carb" />
    );
    for (const date of weekDates(START, 1)) {
      expect(screen.getByTestId(`carb-${date}`)).toBeTruthy();
    }
  });

  it('says how the week stands', async () => {
    const week = challengeWeek([full('2026-11-09'), full('2026-11-10')], START, '2026-11-10');
    await render(<CarbChallengeCard week={week} testID="carb" />);
    expect(screen.getByTestId('carb-status')).toHaveTextContent('2 of 7 days so far. 2-day streak.');
  });

  it('celebrates seven of seven', async () => {
    const week = challengeWeek(weekDates(START, 1).map(full), START, '2026-11-15');
    await render(<CarbChallengeCard week={week} testID="carb" />);
    expect(screen.getByTestId('carb-status')).toHaveTextContent('All 7 days. Challenge complete!');
  });
});
