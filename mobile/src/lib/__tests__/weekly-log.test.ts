import {
  BREAKFAST_OPTIONS,
  EMPTY_ANSWERS,
  fromLogs,
  missing,
  parseMl,
  startingAnswers,
  toRow,
  type WeeklyLog,
} from '@/lib/weekly-log';

const day = (energy: number | null, urine: number | null, fluid: number | null, breakfast: boolean) => ({
  energy_training: energy,
  urine_colour: urine,
  fluid_ml: fluid,
  breakfast,
});

describe('what the week’s daily logs already say', () => {
  it('averages each answer over the days that answered it', () => {
    const logs = fromLogs([day(8, 4, 2000, true), day(7, null, 2400, true), day(null, 5, null, false)]);
    expect(logs).toEqual({ energy: 8, urine: 5, fluidMl: 2200, breakfastDays: 2, daysLogged: 3 });
  });

  it('says nothing where nothing was logged, rather than zero', () => {
    expect(fromLogs([])).toEqual({ energy: null, urine: null, fluidMl: null, breakfastDays: 0, daysLogged: 0 });
  });
});

describe('where the form starts', () => {
  const logs = fromLogs([day(8, 4, 2000, true)]);

  it('starts from the logs, and never picks breakfast for the athlete', () => {
    expect(startingAnswers(null, logs)).toEqual({ ...EMPTY_ANSWERS, energy: 8, urine: 4, fluidMl: 2000 });
  });

  it('starts from an earlier answer when the week is already in', () => {
    const existing = {
      avg_training_energy: 7, avg_urine_colour: 3, avg_fluid_ml: 1800,
      breakfast_compliance: 'Most days', week_behaviour_check: 'Every meal', notes: 'Sick on Tuesday',
    } as WeeklyLog;
    expect(startingAnswers(existing, logs)).toEqual({
      energy: 7, urine: 3, fluidMl: 1800, breakfast: 'Most days', behaviour: 'Every meal', notes: 'Sick on Tuesday',
    });
  });

  it('starts blank with neither', () => {
    expect(startingAnswers(null, null)).toEqual(EMPTY_ANSWERS);
  });
});

describe('the answers', () => {
  it('read a water figure the way it is typed', () => {
    expect(parseMl('2000')).toBe(2000);
    expect(parseMl('2,000')).toBe(2000);
    expect(parseMl('')).toBeNull();
    expect(parseMl('lots')).toBeNull();
  });

  it('need all five; the notes are optional', () => {
    expect(missing(EMPTY_ANSWERS)).toEqual(['energy', 'urine', 'fluidMl', 'breakfast', 'behaviour']);
    const full = { energy: 8, urine: 4, fluidMl: 2000, breakfast: 'Every day', behaviour: 'Every meal', notes: null };
    expect(missing(full)).toEqual([]);
    expect(missing({ ...full, behaviour: '   ' })).toEqual(['behaviour']);
    expect(missing({ ...full, fluidMl: 99999 })).toEqual(['fluidMl']);
  });

  it('offer breakfast as the message did: every day, most days, some days, skipped', () => {
    expect(BREAKFAST_OPTIONS).toEqual(['Every day', 'Most days', 'Some days', 'Skipped']);
  });
});

describe('the WEEKLY LOG row', () => {
  const answers = {
    energy: 8, urine: 4, fluidMl: 2000, breakfast: 'Every day', behaviour: ' Every meal ', notes: '  ',
  };

  it('puts each answer in the tab’s own column', () => {
    expect(toRow('p-theo', 2, 'Protein + Micronutrients', answers)).toEqual({
      week: 2,
      theme: 'Protein + Micronutrients',
      participant_id: 'p-theo',
      avg_training_energy: 8,
      avg_urine_colour: 4,
      avg_fluid_ml: 2000,
      breakfast_compliance: 'Every day',
      week_behaviour_check: 'Every meal',
      notes: null,
    });
  });

  it('leaves the Answer column empty, as every row of the tab has it', () => {
    expect(toRow('p-theo', 2, null, answers)).not.toHaveProperty('answer');
  });
});
