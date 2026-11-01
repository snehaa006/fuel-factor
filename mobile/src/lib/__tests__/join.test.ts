import { CONSENT_CHECKBOX, CONSENT_FORM_QUESTION } from '@/lib/consent';
import {
  AGE_BANDS,
  EMPTY_QUESTIONNAIRE,
  MEASUREMENTS,
  joinTeam,
  parseMeasurement,
  problemsWith,
  teamByCode,
  type Questionnaire,
} from '@/lib/join';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const mockRpc = supabase.rpc as unknown as jest.Mock;

const form = (over: Partial<Questionnaire> = {}): Questionnaire => ({
  ...EMPTY_QUESTIONNAIRE,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the questionnaire mirrors the PARTICIPANTS sheet', () => {
  it('asks for the sheet’s five measurements, in its order', () => {
    expect(MEASUREMENTS.map((m) => m.field)).toEqual([
      'height_cm',
      'weight_kg',
      'waist_cm',
      'muac_cm',
      'calf_cm',
    ]);
  });

  it('never asks anybody to type their own participant code', () => {
    // A joiner who typed 'T-01' would be typing Theo's real row. The code is
    // generated in the database.
    expect(Object.keys(form())).not.toContain('participantCode');
    expect(Object.keys(form())).not.toContain('id');
  });

  it('defaults the sport to football, which is the only arm there is', () => {
    // Locked decision 6: basketball's 40-45 minutes is not football's 90.
    expect(EMPTY_QUESTIONNAIRE.sport).toBe('Football');
  });

  it('offers the band the tracker actually holds', () => {
    expect(AGE_BANDS).toContain('14-16');
  });

  it('starts with no age band chosen rather than the study arm’s', () => {
    // Pre-selecting '14-16' would record the study's own band as an answer
    // somebody gave.
    expect(EMPTY_QUESTIONNAIRE.ageBand).toBeNull();
  });

  it('starts with the paper consent form unreported', () => {
    expect(EMPTY_QUESTIONNAIRE.consentSigned).toBe(false);
  });
});

describe('the two consent questions stay apart', () => {
  it('asks the app’s gate and the paper form as different questions', () => {
    // `consent_signed` means a form was signed on paper. The tick in the gate
    // is an app event and lands in `consent_ack_at`. Recording one as the
    // other would put an app event into the study's record as a collected fact.
    expect(CONSENT_CHECKBOX).not.toEqual(CONSENT_FORM_QUESTION);
    expect(CONSENT_FORM_QUESTION).toMatch(/on paper/);
  });
});

describe('parseMeasurement', () => {
  it('leaves a blank null, so the research team can measure it', () => {
    // A 14 year old guessing at their calf circumference is worse data than a
    // blank.
    expect(parseMeasurement('')).toBeNull();
    expect(parseMeasurement('  ')).toBeNull();
  });

  it('keeps one decimal, which is what the columns hold', () => {
    expect(parseMeasurement('174')).toBe(174);
    expect(parseMeasurement('174.26')).toBe(174.3);
  });

  it('ignores a non-number and a nonsense zero', () => {
    expect(parseMeasurement('tall')).toBeNull();
    expect(parseMeasurement('0')).toBeNull();
    expect(parseMeasurement('-10')).toBeNull();
  });
});

describe('problemsWith', () => {
  it('needs only a name', () => {
    expect(problemsWith(form({ name: 'Theo' }))).toEqual([]);
  });

  it('says so when the name is missing', () => {
    expect(problemsWith(form())).toEqual(['Your name is needed.']);
  });

  it('reports a units mistake rather than clamping it', () => {
    // Quietly storing 250 for a typed 1760 would put a wrong figure in a
    // research table instead of asking about it.
    const problems = problemsWith(form({ name: 'Theo', measurements: { height_cm: 1760 } }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/Height should be in cm, between 100 and 250/);
  });

  it('accepts a figure inside the range without comment', () => {
    expect(
      problemsWith(form({ name: 'Theo', measurements: { height_cm: 174, weight_kg: 68 } }))
    ).toEqual([]);
  });

  it('passes no judgement on a figure inside the range', () => {
    // There is no target, no band and no category for any of these. The
    // programme has set none, and a weight beside a verdict is the one thing
    // this app must never be.
    const problems = problemsWith(form({ name: 'Theo', measurements: { weight_kg: 45 } }));
    expect(problems).toEqual([]);
  });
});

describe('joinTeam', () => {
  it('sends the sheet’s columns and the consent together', () => {
    // Consent travels with the call rather than being written afterwards, so
    // there is no ordering in which a participant row exists before the screen
    // was accepted.
    mockRpc.mockResolvedValue({ data: 'participant-uuid', error: null });

    return joinTeam(
      ' fuel01 ',
      form({ name: ' Theo ', ageBand: '14-16', measurements: { weight_kg: 68 }, consentSigned: true }),
      true
    ).then((id) => {
      expect(id).toBe('participant-uuid');
      expect(mockRpc).toHaveBeenCalledWith(
        'join_team',
        expect.objectContaining({
          p_join_code: 'FUEL01',
          p_name: 'Theo',
          p_consent_ack: true,
          p_age_band: '14-16',
          p_weight_kg: 68,
          p_consent_signed: true,
          p_height_cm: null,
        })
      );
    });
  });

  it('shows a refusal in the sentence the database used', () => {
    // The function raises sentences meant to be read, so they are not replaced
    // with something vaguer.
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'this device has already joined as an athlete' },
    });

    return expect(joinTeam('FUEL01', form({ name: 'Theo' }), true)).rejects.toThrow(
      'this device has already joined as an athlete'
    );
  });
});

describe('teamByCode', () => {
  it('returns a name and the programme date, and nothing else', () => {
    // Deliberately not the roster: that is `team_roster`, and it is a list of
    // named minors.
    mockRpc.mockResolvedValue({
      data: [{ name: 'Jakarta U16', programme_starts_on: '2026-11-10' }],
      error: null,
    });

    return teamByCode('fuel01').then((team) => {
      expect(team).toEqual({ name: 'Jakarta U16', programmeStartsOn: '2026-11-10' });
      expect(mockRpc).toHaveBeenCalledWith('team_by_code', { p_join_code: 'FUEL01' });
    });
  });

  it('is null for a code with no team behind it', () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    return expect(teamByCode('NOPE')).resolves.toBeNull();
  });
});
