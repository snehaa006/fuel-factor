import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AssessmentPanel } from '@/components/assessment-panel';

const open = { open: true } as const;

const setup = async (over: Partial<React.ComponentProps<typeof AssessmentPanel>> = {}) => {
  const onSave = jest.fn().mockResolvedValue(undefined);
  const pairs = { weight: { pre: 68, post: 70.5 }, sprintAvg: { pre: 4.6, post: 4.42 } };
  await render(
      <AssessmentPanel
        participantId="p1"
        pairs={pairs}
        access={{ pre: open, post: open }}
        onSave={onSave}
        comparison={[{ participantId: 'p1', name: 'Candra', pairs }]}
      {...over}
    />
  );
  return { onSave };
};

describe('AssessmentPanel', () => {
  it('opens on Week 0 with the saved value filled in', async () => {
    await setup();
    expect(screen.getByTestId('assessments-pre-weight').props.value).toBe('68');
  });

  it('works out the sprint average as attempts are typed', async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId('assessments-pre-sprint1'), '4.5');
    await fireEvent.changeText(screen.getByTestId('assessments-pre-sprint2'), '4,3');
    expect(screen.getByTestId('assessments-pre-sprintAvg')).toHaveTextContent('4.4');
  });

  it('saves the phase’s values', async () => {
    const { onSave } = await setup();
    await fireEvent.changeText(screen.getByTestId('assessments-pre-height'), '174');
    await fireEvent.press(screen.getByTestId('assessments-pre-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toBe('pre');
    expect(onSave.mock.calls[0][1]).toMatchObject({ height: 174, weight: 68 });
    expect(await screen.findByTestId('assessments-pre-status')).toHaveTextContent('Week 0 saved.');
  });

  it('will not save a value outside its scale', async () => {
    const { onSave } = await setup();
    await fireEvent.changeText(screen.getByTestId('assessments-pre-energyAm'), '12');
    expect(screen.getByTestId('assessments-pre-energyAm-error')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('assessments-pre-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows Week 4 with its own values', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('assessments-tab-post'));
    expect(screen.getByTestId('assessments-post-weight').props.value).toBe('70.5');
  });

  it('says when Week 4 is not open yet', async () => {
    await setup({ access: { pre: open, post: { open: false, reason: 'Week 4 opens in 3 days.' } } });
    await fireEvent.press(screen.getByTestId('assessments-tab-post'));
    expect(screen.getByTestId('assessments-post-closed')).toHaveTextContent('Week 4 opens in 3 days.');
  });

  it('compares Week 0 against Week 4 with Δ', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('assessments-tab-compare'));
    expect(screen.getByTestId('assessments-comparison-p1-weight-pre')).toHaveTextContent('68');
    expect(screen.getByTestId('assessments-comparison-p1-weight-post')).toHaveTextContent('70.5');
    expect(screen.getByTestId('assessments-comparison-p1-weight-delta')).toHaveTextContent('+2.5');
    expect(screen.getByTestId('assessments-comparison-p1-sprintAvg-delta')).toHaveTextContent('-0.18');
    expect(screen.getByTestId('assessments-comparison-p1-waist-delta')).toHaveTextContent('—');
  });
});
