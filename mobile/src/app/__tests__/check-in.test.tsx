import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CheckInScreen from '@/app/check-in';
import { saveCheckIn } from '@/lib/check-in';
import { ensureDailyLog } from '@/lib/logger';
import { useParticipantId } from '@/lib/use-foods';

jest.mock('@/lib/use-foods');
jest.mock('@/lib/check-in', () => ({
  ...jest.requireActual('@/lib/check-in'),
  saveCheckIn: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  ...jest.requireActual('@/lib/logger'),
  ensureDailyLog: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }));

const mockParticipant = useParticipantId as jest.MockedFunction<typeof useParticipantId>;
const mockEnsure = ensureDailyLog as jest.MockedFunction<typeof ensureDailyLog>;
const mockSave = saveCheckIn as jest.MockedFunction<typeof saveCheckIn>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParticipant.mockReturnValue('p1');
  mockEnsure.mockResolvedValue('log-1');
  mockSave.mockResolvedValue(undefined);
});

/**
 * Answer one or more fields and submit, waiting until the form is idle again.
 *
 * Waiting for saveCheckIn to have been called is not enough: setSaving(false)
 * runs in a finally block after it, so the test ends with a state update still
 * in flight and the next test renders an empty tree. Waiting for the button to
 * come out of its saving state proves that last update has landed.
 */
async function submitWith(answer: () => void) {
  answer();
  await waitFor(() =>
    expect(screen.getByTestId('submit').props.accessibilityState.disabled).toBe(false)
  );
  fireEvent.press(screen.getByTestId('submit'));
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByTestId('submit')).not.toHaveTextContent(/Saving/));
}

describe('the form', () => {
  it('shows every field the sheet asks for', async () => {
    await render(<CheckInScreen />);
    for (const field of ['fruit_servings', 'veg_servings', 'protein_sources', 'carb_portions']) {
      expect(screen.getByTestId(`counter-${field}`)).toBeTruthy();
    }
    for (const field of ['energy_am', 'energy_training', 'recovery', 'mood', 'concentration']) {
      expect(screen.getByTestId(`rating-${field}`)).toBeTruthy();
    }
    expect(screen.getByTestId('fluid')).toBeTruthy();
    expect(screen.getByTestId('urine')).toBeTruthy();
    expect(screen.getByTestId('notes')).toBeTruthy();
  });

  it('starts with everything unanswered rather than at zero', async () => {
    await render(<CheckInScreen />);
    expect(screen.getByTestId('counter-fruit_servings-value')).toHaveTextContent('–');
    expect(screen.getByTestId('rating-mood-value')).toHaveTextContent(/not answered/);
  });

  it('puts no target beside a counter', async () => {
    // The programme has set no serving targets, so nothing here may read as
    // "enough" or "short".
    await render(<CheckInScreen />);
    const counters = screen.getByTestId('counter-veg_servings');
    expect(counters).not.toHaveTextContent(/target|goal|of \d|\/ ?\d/i);
  });

  it('says the diet quality score is not this form’s to set', async () => {
    await render(<CheckInScreen />);
    expect(screen.getByText(/set by the programme, not by this form/i)).toBeTruthy();
  });
});

describe('the counters', () => {
  it('counts up from unanswered', async () => {
    await render(<CheckInScreen />);
    fireEvent.press(screen.getByTestId('counter-fruit_servings-plus'));
    await waitFor(() =>
      expect(screen.getByTestId('counter-fruit_servings-value')).toHaveTextContent('1')
    );
  });

  it('will not go below zero', async () => {
    await render(<CheckInScreen />);
    expect(screen.getByTestId('counter-fruit_servings-minus').props.accessibilityState.disabled).toBe(true);
  });
});

describe('the urine scale', () => {
  it('shows the tracker’s wording for a reading it has worded', async () => {
    await render(<CheckInScreen />);
    fireEvent.press(screen.getByTestId('urine-6'));
    await waitFor(() =>
      expect(screen.getByTestId('urine-wording')).toHaveTextContent(/Dehydrated/)
    );
  });

  it('shows no wording for a level the programme has not worded', async () => {
    await render(<CheckInScreen />);
    fireEvent.press(screen.getByTestId('urine-7'));
    await waitFor(() =>
      expect(screen.getByTestId('urine-wording')).toHaveTextContent(/Match against the chart/)
    );
  });

  it('points at the workbook rather than showing an approximated swatch', async () => {
    await render(<CheckInScreen />);
    expect(screen.getByTestId('urine-wording')).toHaveTextContent(/chart in your workbook/i);
  });
});

describe('submitting', () => {
  it('cannot be submitted with nothing answered', async () => {
    await render(<CheckInScreen />);
    expect(screen.getByTestId('submit').props.accessibilityState.disabled).toBe(true);
  });

  it('can be submitted once a single field is answered', async () => {
    await render(<CheckInScreen />);
    fireEvent.press(screen.getByTestId('urine-4'));
    await waitFor(() =>
      expect(screen.getByTestId('submit').props.accessibilityState.disabled).toBe(false)
    );
  });

  it('writes the answers onto today’s row', async () => {
    await render(<CheckInScreen />);
    // One field at a time, each allowed to land. Firing all three in one
    // synchronous block leaves an update in flight past the end of the test
    // and the next test then renders an empty tree.
    fireEvent.press(screen.getByTestId('urine-6'));
    await waitFor(() => expect(screen.getByTestId('urine-wording')).toHaveTextContent(/Dehydrated/));
    fireEvent.changeText(screen.getByTestId('fluid'), '2000');
    await waitFor(() => expect(screen.getByTestId('fluid').props.value).toBe('2000'));
    await submitWith(() => fireEvent.press(screen.getByTestId('rating-mood-8')));
    expect(mockSave).toHaveBeenCalledWith('log-1', expect.objectContaining({
      urine_colour: 6,
      fluid_ml: 2000,
      mood: 8,
    }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('sends null for fields left blank, never zero', async () => {
    await render(<CheckInScreen />);
    await submitWith(() => fireEvent.press(screen.getByTestId('urine-3')));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());

    const [, payload] = mockSave.mock.calls[0];
    expect(payload.fluid_ml).toBeNull();
    expect(payload.veg_servings).toBeUndefined();
  });

  it('never writes a diet quality score', async () => {
    await render(<CheckInScreen />);
    await submitWith(() => fireEvent.press(screen.getByTestId('urine-3')));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][1]).not.toHaveProperty('dq_score');
  });

  it('goes back once saved', async () => {
    await render(<CheckInScreen />);
    await submitWith(() => fireEvent.press(screen.getByTestId('urine-3')));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('stays put and says why when the write is refused', async () => {
    mockSave.mockRejectedValue({ message: 'new row violates row-level security policy' });
    await render(<CheckInScreen />);
    await submitWith(() => fireEvent.press(screen.getByTestId('urine-3')));
    await waitFor(() =>
      expect(screen.getByTestId('save-error')).toHaveTextContent(/row-level security/)
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('explains a disabled button when no athlete is claimed', async () => {
    mockParticipant.mockReturnValue(null);
    await render(<CheckInScreen />);
    expect(screen.getByTestId('cannot-save')).toHaveTextContent(/has not claimed an athlete/);
  });
});

describe('getting out', () => {
  it('has a visible way back', async () => {
    await render(<CheckInScreen />);
    fireEvent.press(screen.getByTestId('cancel'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('writes nothing on the way out', async () => {
    await render(<CheckInScreen />);
    fireEvent.press(screen.getByTestId('urine-5'));
    fireEvent.press(screen.getByTestId('cancel'));
    expect(mockSave).not.toHaveBeenCalled();
  });
});
