import { en } from '@/i18n/en';

/**
 * The consent gate's words, in one place.
 *
 * One screen takes consent: `/welcome`, the "Before you start" screen every
 * athlete passes before the app will take a team code. The invite
 * questionnaire at `/join/[code]` used to show this text and its tick a second
 * time, and then a second consent question about the paper form; the people
 * running the programme called it a duplicate, and it is gone. An invite link
 * opened cold is sent through `/welcome` instead, so every route in still
 * passes the same gate exactly once.
 *
 * `claim_participant` and `join_team` both take consent as an argument and
 * refuse without it, so the gate is enforced in the database either way. This
 * module is what it says, not whether it is asked.
 *
 * The words themselves now live in the dictionaries (`i18n/en.ts` and
 * `i18n/id.ts`, under `consent`) so the gate speaks the language the athlete
 * chose on the sign-in screen. These constants are the English, for the
 * tests. The Indonesian is what a 14 year old agrees to, so it is the first
 * thing a native speaker should read.
 */

export const CONSENT_HEADING = en.consent.heading;

/**
 * What the app is, in the athlete's words.
 *
 * It used to say a dietitian would be reading along: "so your coach and the
 * programme's dietitian can see how the squad is fuelling". That was true of
 * the four-week study and is the opposite of what the app is for. A dietitian
 * watching each athlete's log is the thing that does not scale past one squad
 * -- "we cannot customize nutrition plan, it would be a generalized advice,
 * because there has to be a one-on-one communication" -- and the app exists so
 * that a squad gets the gap pointed out without one.
 *
 * So it names what the app does -- records, and shows the gaps -- and who sees
 * it: the athlete and their coach. Nothing is promised that the app does not
 * do, and the sentence after this one still rules out the things it will never
 * do.
 */
export const CONSENT_WHAT_IT_IS = en.consent.whatItIs;

export const CONSENT_WHAT_IT_IS_NOT = en.consent.whatItIsNot;

/**
 * The box an athlete ticks, once, on `/welcome`. It lands in `consent_ack_at`
 * (app tier), never in `participants.consent_signed`, which means the paper
 * form and is the research team's to record.
 */
export const CONSENT_CHECKBOX = en.consent.checkbox;
