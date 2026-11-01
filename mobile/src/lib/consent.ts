/**
 * The consent gate's words, in one place.
 *
 * Two screens now take consent -- the roster claim at `/welcome` and the
 * invite questionnaire at `/join/[code]` -- and the whole point of decision 8
 * being blocking is that every route into the app shows the same thing. Two
 * copies of this text would drift, and the half that drifted would be the one
 * a parent read.
 *
 * `claim_participant` and `join_team` both take consent as an argument and
 * refuse without it, so the gate is enforced in the database either way. This
 * module is what it says, not whether it is asked.
 */

export const CONSENT_HEADING = 'Before you start';

export const CONSENT_WHAT_IT_IS =
  'Fuel Factor records what you eat and drink so your coach and the programme’s dietitian can see how the squad is fuelling. It is part of a school nutrition programme.';

export const CONSENT_WHAT_IT_IS_NOT =
  'It never sets a weight goal, never tells you to eat less, and never calls a food bad. Nothing it shows you is a substitute for advice from a dietitian or a doctor.';

/** The box an athlete ticks. Not the parental form -- see below. */
export const CONSENT_CHECKBOX =
  'I am under 18 and my parent or guardian has agreed to this.';

/**
 * The questionnaire's separate question about the programme's paper form.
 *
 * Deliberately phrased as reporting rather than signing. `consent_signed` on
 * the PARTICIPANTS sheet means a parental consent form was signed on paper;
 * the athlete is answering a question about that form's existence. The tick
 * above is the app's own gate and lands in `consent_ack_at`, which is app
 * tier. Recording one as the other would put an app event into the study's
 * record dressed as a collected fact.
 */
export const CONSENT_FORM_QUESTION =
  'Has your parent or guardian signed the programme’s consent form on paper?';

export const CONSENT_FORM_NOTE =
  'This is the programme’s paper form, not this screen. If you are not sure, leave it unticked and ask your coach — it changes nothing about using the app.';
