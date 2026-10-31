import { render, screen } from '@testing-library/react-native';

import { LessonCard, percentOf } from '@/components/lesson-card';
import type { LessonCard as Card } from '@/lib/learn';
import { DEMO_FOODS } from '@/lib/__fixtures__/today';

function card(over: Partial<Card>): Card {
  return {
    id: 'c1',
    kind: 'intro',
    heading: null,
    body: null,
    sourceNote: null,
    points: [],
    ...over,
  };
}

const p = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  label: null,
  value: null,
  detail: null,
  ...over,
});

describe('LessonCard', () => {
  it('draws the deck’s heading and body for an intro', async () => {
    await render(
      <LessonCard
        card={card({ heading: 'Carbohydrates: Your Training Fuel', body: 'Team sports are glycolytic.' })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByTestId('c-heading')).toHaveTextContent(/Carbohydrates: Your Training Fuel/);
    expect(screen.getByText(/Team sports are glycolytic/)).toBeTruthy();
  });

  it('shows the citation where the deck prints one', async () => {
    await render(
      <LessonCard
        card={card({ kind: 'timeline', sourceNote: 'Bangsbo et al. (1994)' })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByTestId('c-source')).toHaveTextContent(/Bangsbo et al\. \(1994\)/);
  });

  it('shows no citation line when the deck prints none', async () => {
    await render(<LessonCard card={card({ heading: 'Plain' })} foods={[]} testID="c" />);
    expect(screen.queryByTestId('c-source')).toBeNull();
  });

  it('draws each statistic with its figure', async () => {
    await render(
      <LessonCard
        card={card({
          kind: 'stats',
          points: [
            p('1', { value: '60–70%', label: 'Of energy during team sports comes from carbohydrates' }),
            p('2', { value: '90 min', label: 'Full game depletes glycogen by 80–90% without fuelling' }),
          ],
        })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByText('60–70%')).toBeTruthy();
    expect(screen.getByText('90 min')).toBeTruthy();
  });

  it('marks the myth and the fact apart', async () => {
    await render(
      <LessonCard
        card={card({
          kind: 'myth_fact',
          points: [
            p('1', { label: 'THE MYTH', detail: 'Carbs make you fat.' }),
            p('2', { label: 'THE FACT', detail: 'Carbohydrates are stored as glycogen.' }),
          ],
        })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByText('✗ THE MYTH')).toBeTruthy();
    expect(screen.getByText('✓ THE FACT')).toBeTruthy();
  });

  it('numbers the glycogen chain in the deck’s order', async () => {
    await render(
      <LessonCard
        card={card({
          kind: 'process',
          points: [
            p('1', { label: 'You Eat Carbs', detail: 'Nasi, pisang' }),
            p('2', { label: 'Digested to Glucose', detail: 'Small intestine' }),
          ],
        })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('You Eat Carbs')).toBeTruthy();
  });

  it('draws the food table from the food database, not from a second copy', async () => {
    // One set of carbohydrate figures in the app, shared with the logger.
    await render(<LessonCard card={card({ kind: 'foods' })} foods={DEMO_FOODS} testID="c" />);
    expect(screen.getByText(/Nasi putih/)).toBeTruthy();
    expect(screen.getByText('57g carbs')).toBeTruthy();
  });

  it('says a food has no figure rather than showing a zero', async () => {
    await render(<LessonCard card={card({ kind: 'foods' })} foods={DEMO_FOODS} testID="c" />);
    // Mie instan is seeded with no carbohydrate figure.
    expect(screen.getAllByText('No figure yet').length).toBeGreaterThan(0);
  });

  it('lists the references the deck cites', async () => {
    await render(
      <LessonCard
        card={card({
          kind: 'references',
          heading: 'References',
          points: [p('1', { detail: 'Burke LM et al. (2011).' })],
        })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByText(/Burke LM et al\. \(2011\)/)).toBeTruthy();
  });

  it('draws nothing extra for a kind that is only heading and body', async () => {
    await render(
      <LessonCard
        card={card({ kind: 'challenge', heading: 'Add One Carb to Every Meal', body: "Don't change what you're eating." })}
        foods={[]}
        testID="c"
      />
    );
    expect(screen.getByTestId('c-heading')).toHaveTextContent(/Add One Carb to Every Meal/);
  });
});

describe('the timeline bar', () => {
  it('reads the percentage the deck printed', () => {
    expect(percentOf('100%')).toBe(100);
    expect(percentOf('~60%')).toBe(60);
  });

  it('draws no bar for a value written some other way', () => {
    // The bar's length is the deck's figure or nothing. It is never a length
    // the app picked.
    expect(percentOf('most of it')).toBeNull();
    expect(percentOf('350–490g')).toBeNull();
    expect(percentOf(null)).toBeNull();
  });

  it('refuses a percentage outside the scale', () => {
    expect(percentOf('180%')).toBeNull();
  });
});
