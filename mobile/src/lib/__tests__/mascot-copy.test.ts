import { MASCOT_MOTIONS, MASCOT_POSES } from '@/components/mascot';
import {
  ALL_CUES,
  badgeCue,
  dayCue,
  LEARN_CUE,
  PROGRESS_CUE,
  WELCOME_CUE,
} from '@/lib/mascot-copy';

describe('dayCue', () => {
  it('invites an athlete who has logged nothing', () => {
    const cue = dayCue(0, 6);
    expect(cue.pose).toBe('stand');
    expect(cue.message).toMatch(/Nothing logged yet/);
  });

  it('counts the slots part way through', () => {
    expect(dayCue(3, 6).message).toBe('3 of 6 slots logged today.');
  });

  it('celebrates a full day', () => {
    const cue = dayCue(6, 6);
    expect(cue.pose).toBe('best');
    expect(cue.motion).toBe('celebrate');
  });

  it('celebrates only once the day is actually full', () => {
    expect(dayCue(5, 6).motion).not.toBe('celebrate');
  });

  it('counts slots, never what went in them', () => {
    // A day of nasi goreng and a day of ubi jalar get the same line. The
    // mascot counts the logging; grading the food is not the app's job and
    // would not be the mascot's job even if it were.
    expect(dayCue(3, 6).message).not.toMatch(/food|meal type|better|worse/i);
  });

  it('survives counts outside the range', () => {
    expect(dayCue(-1, 6).pose).toBe('stand');
    expect(dayCue(9, 6).pose).toBe('best');
  });
});

describe('badgeCue', () => {
  it('points a new athlete at the first rung', () => {
    expect(badgeCue(0, 7).message).toMatch(/only asks you to log once/);
  });

  it('counts the ones earned', () => {
    expect(badgeCue(3, 7).message).toMatch(/3 of 7 badges/);
  });

  it('marks a full ladder', () => {
    expect(badgeCue(7, 7).motion).toBe('celebrate');
  });
});

describe('the mascot stays in its lane', () => {
  /**
   * The rule this whole file exists for. A cartoon astronaut is the most
   * persuasive voice on the screen and the least qualified one, so it talks
   * about logging, streaks, badges and challenges and nothing else. The
   * programme's own sentences go through NudgeCard, which carries a rule
   * code and a source and can be reviewed by the dietitian.
   */
  const FORBIDDEN = [
    'eat more', 'eat less', 'should eat', 'healthy', 'unhealthy',
    'good for you', 'bad for you', 'carb', 'protein', 'calorie',
    'vitamin', 'nutrient', 'hydrat', 'target', 'gram',
  ];

  it.each(ALL_CUES)('“$message” gives no dietary advice', ({ message }) => {
    const lower = message.toLowerCase();
    const hits = FORBIDDEN.filter((word) => lower.includes(word));
    expect(hits).toEqual([]);
  });

  it('never grades a day', () => {
    for (const { message } of ALL_CUES) {
      expect(message).not.toMatch(/\b(well done on|good day|bad day|poorly)\b/i);
    }
  });

  it('covers every cue the app can show', () => {
    // ALL_CUES is what the rule above is checked against, so a cue missing
    // from it is a line nobody is holding to anything.
    expect(ALL_CUES).toContain(LEARN_CUE);
    expect(ALL_CUES).toContain(WELCOME_CUE);
    expect(ALL_CUES).toContain(PROGRESS_CUE);
    expect(ALL_CUES.length).toBeGreaterThanOrEqual(9);
  });

  it('only ever asks for a motion the mascot has', () => {
    for (const cue of ALL_CUES) {
      expect(MASCOT_MOTIONS).toContain(cue.motion);
    }
  });

  it('nudges at what is undone and celebrates only what is finished', () => {
    // The hop is for an empty day and an empty badge ladder; the jump and
    // the burst are for a day actually finished. Celebrating a half-done
    // day would make the celebration mean nothing.
    expect(dayCue(0, 6).motion).toBe('nudge');
    expect(badgeCue(0, 7).motion).toBe('nudge');
    expect(dayCue(6, 6).motion).toBe('celebrate');
    expect(dayCue(3, 6).motion).toBe('idle');
  });

  it('only ever asks for a pose the board actually drew', () => {
    // Where a screen needs a feeling the board has not drawn, it gets no
    // mascot rather than a pose bent to fit.
    for (const cue of ALL_CUES) {
      expect(MASCOT_POSES).toContain(cue.pose);
    }
  });

  it('keeps every line to one sentence', () => {
    for (const { message } of ALL_CUES) {
      expect(message.split('. ').length).toBeLessThanOrEqual(2);
      expect(message.length).toBeLessThanOrEqual(90);
    }
  });
});
