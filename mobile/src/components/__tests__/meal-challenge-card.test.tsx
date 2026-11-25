import { render, screen } from '@testing-library/react-native';

import { MealChallengeCard } from '@/components/meal-challenge-card';
import { challengeWeek, CHALLENGES, weekDates, type ChallengeLog } from '@/lib/meal-challenge';

const START = '2026-11-09';
const full = (date: string): ChallengeLog => ({
  date,
  items: (['breakfast', 'lunch', 'dinner'] as const).map((slot) => ({
    slot,
    carbs_g: 40,
    carbSource: true,
  })),
});

describe('MealChallengeCard', () => {
  it('names the challenge', async () => {
    await render(
      <MealChallengeCard week={challengeWeek([], START, '2026-11-09', CHALLENGES[1])} testID="c" />
    );
    expect(screen.getByText('WEEK 1 CHALLENGE')).toBeTruthy();
    expect(screen.getByText('Add one carb to every meal')).toBeTruthy();
  });

  it('draws one column per day of the week', async () => {
    await render(
      <MealChallengeCard week={challengeWeek([], START, '2026-11-09', CHALLENGES[1])} testID="c" />
    );
    for (const date of weekDates(START, 1)) {
      expect(screen.getByTestId(`c-${date}`)).toBeTruthy();
    }
  });

  it('says how the week stands', async () => {
    const week = challengeWeek([full('2026-11-09'), full('2026-11-10')], START, '2026-11-10', CHALLENGES[1]);
    await render(<MealChallengeCard week={week} testID="c" />);
    expect(screen.getByTestId('c-status')).toHaveTextContent('2 of 7 days · 2-day streak');
  });

  it('celebrates seven of seven', async () => {
    const week = challengeWeek(weekDates(START, 1).map(full), START, '2026-11-15', CHALLENGES[1]);
    await render(<MealChallengeCard week={week} testID="c" />);
    expect(screen.getByTestId('c-status')).toHaveTextContent('7 of 7 days. Challenge complete!');
  });

  it('lists week 2’s four meals, post-training among them', async () => {
    await render(
      <MealChallengeCard week={challengeWeek([], START, '2026-11-16', CHALLENGES[2])} testID="c" />
    );
    expect(screen.getByText('WEEK 2 CHALLENGE')).toBeTruthy();
    expect(screen.getByText('B Breakfast · L Lunch · P Post-training · D Dinner')).toBeTruthy();
  });

  it('draws week 3’s two habits, and a dash for the snack on a rest night', async () => {
    const logs: ChallengeLog[] = [
      { date: '2026-11-23', urineColour: 3, dayType: 'training',
        items: [{ slot: 'evening_snack', carbs_g: 4, name: 'Susu Sapi' }] },
      { date: '2026-11-24', urineColour: 2, dayType: 'rest', items: [] },
    ];
    await render(
      <MealChallengeCard week={challengeWeek(logs, START, '2026-11-25', CHALLENGES[3])} testID="c" />
    );
    expect(screen.getByText('WEEK 3 CHALLENGE')).toBeTruthy();
    expect(screen.getByText('U Urine colour · S Milk or banana before sleep (training nights)')).toBeTruthy();
    expect(screen.getByTestId('c-2026-11-23-presleep')).toHaveTextContent('S');
    expect(screen.getByTestId('c-2026-11-24-presleep')).toHaveTextContent('–');
    expect(screen.getByTestId('c-status')).toHaveTextContent(/^2 of 7 days/);
  });

  it('says week 4’s water on waking is not something the app records', async () => {
    await render(
      <MealChallengeCard week={challengeWeek([], START, '2026-11-30', CHALLENGES[4])} testID="c" />
    );
    expect(screen.getByText('WEEK 4 CHALLENGE')).toBeTruthy();
    expect(screen.getByTestId('c-unrecorded')).toHaveTextContent(/water on waking/);
    expect(screen.getByText('B Breakfast · U Urine colour')).toBeTruthy();
  });
});
