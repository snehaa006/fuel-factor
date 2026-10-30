import { render, screen } from '@testing-library/react-native';

import { NudgeCard } from '@/components/nudge-card';

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
});
