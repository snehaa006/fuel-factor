import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen } from '@testing-library/react-native';

import { LessonCard } from '@/components/lesson-card';
import { DEMO_LESSON_CARDS } from '@/lib/__fixtures__/today';
import { resetPreferencesForTests, setLanguage } from '@/lib/preferences';

import { cardIn, contentIn } from '../content';
import { CONTENT_ID } from '../content-id';

const seedDir = resolve(__dirname, '../../../../supabase/seed');
// The seeds as the database holds them: SQL's doubled quotes read as one.
const seeds = readdirSync(seedDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(seedDir, f), 'utf8'))
  .join('\n')
  .replace(/''/g, "'");

afterEach(() => resetPreferencesForTests());

describe('the Bahasa for the programme’s content', () => {
  it('is keyed by text the seeds actually hold, so an edited card shows up here', () => {
    const stale = Object.keys(CONTENT_ID).filter((english) => !seeds.includes(english));
    expect(stale).toEqual([]);
  });

  it('translates every entry, rather than copying the English', () => {
    const same = Object.entries(CONTENT_ID).filter(([en, id]) => en === id || id.trim() === '');
    expect(same).toEqual([]);
  });

  it('leaves the English alone when the athlete reads in English', () => {
    expect(contentIn('Carbohydrates', 'en')).toBe('Carbohydrates');
    expect(contentIn(null, 'id')).toBeNull();
  });

  it('shows text it has no Bahasa for as it is, rather than nothing', () => {
    expect(contentIn('A card written after this release', 'id')).toBe('A card written after this release');
    expect(contentIn('Burke LM et al. (2011). Carbohydrates for training and competition.', 'id')).toMatch(/^Burke/);
  });

  it('keeps a percentage the bars are drawn from as it is', () => {
    const stats = cardIn(DEMO_LESSON_CARDS[1], 'id');
    expect(stats.heading).toBe('Kenapa ini penting');
    expect(stats.points[0]).toMatchObject({ value: '60–70%', label: 'Energi saat olahraga tim berasal dari karbohidrat' });
  });
});

describe('a lesson card', () => {
  it('reads in Bahasa once the athlete picks it', async () => {
    await render(<LessonCard card={DEMO_LESSON_CARDS[0]} foods={[]} testID="card" />);
    expect(screen.getByTestId('card-heading')).toHaveTextContent('Carbohydrates: Your Training Fuel');

    await act(async () => setLanguage('id'));
    expect(screen.getByTestId('card-heading')).toHaveTextContent('Karbohidrat: Bahan Bakar Latihanmu');
    expect(screen.getByText(/Olahraga tim bersifat glikolitik/)).toBeTruthy();
  });
});
