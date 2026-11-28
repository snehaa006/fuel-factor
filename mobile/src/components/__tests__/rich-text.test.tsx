import { render, screen } from '@testing-library/react-native';

import { RichText, spansOf } from '@/components/rich-text';

describe('highlighted text', () => {
  it('splits the marked words out to be highlighted', () => {
    expect(spansOf('In team sports, **60–70%** of your energy comes from **carbs**.')).toEqual([
      { text: 'In team sports, ', strong: false },
      { text: '60–70%', strong: true },
      { text: ' of your energy comes from ', strong: false },
      { text: 'carbs', strong: true },
      { text: '.', strong: false },
    ]);
  });

  it('handles a sentence that starts with a highlight', () => {
    expect(spansOf('**Pisang** first.')).toEqual([
      { text: 'Pisang', strong: true },
      { text: ' first.', strong: false },
    ]);
  });

  it('shows an unclosed mark as written rather than swallowing the sentence', () => {
    expect(spansOf('About **400 g in your muscles.')).toEqual([
      { text: 'About **400 g in your muscles.', strong: false },
    ]);
  });

  it('draws the words without the marks', async () => {
    await render(<RichText testID="t" text="Refill within **30 minutes**." />);
    expect(screen.getByTestId('t')).toHaveTextContent('Refill within 30 minutes.');
    expect(screen.getByText('30 minutes')).toBeTruthy();
  });
});
