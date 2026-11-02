import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEMO_ASSESSMENTS,
  DEMO_COACH_VIEW,
  DEMO_PROFILE,
  demoProgrammeStart,
} from './__fixtures__/today';
import {
  fetchAssessments,
  mergePhase,
  saveAssessment,
  type PairValues,
  type Phase,
} from './assessments';
import { myTeam } from './coach-auth';
import { asError, messageOf } from './errors';
import { fetchProfile } from './profile';
import { programmeState, type ProgrammeState } from './programme';
import { supabase } from './supabase';
import { todayIso } from './today';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type SaveFn = (
  participantId: string,
  phase: Phase,
  values: Record<string, number | null>
) => Promise<void>;

// ---------------------------------------------------------------------------
// The athlete's own

export type MyAssessmentsState =
  | { status: 'loading' }
  | { status: 'needs-onboarding' }
  | {
      status: 'ready';
      participantId: string;
      name: string;
      programme: ProgrammeState;
      pairs: PairValues;
    }
  | { status: 'error'; message: string };

export function useMyAssessments(): MyAssessmentsState & { save: SaveFn } {
  const [state, setState] = useState<MyAssessmentsState>(() => {
    if (!USE_FIXTURE) return { status: 'loading' };
    const today = todayIso();
    return {
      status: 'ready',
      participantId: DEMO_PROFILE.participantId,
      name: DEMO_PROFILE.name,
      programme: programmeState(demoProgrammeStart(today), today),
      pairs: DEMO_ASSESSMENTS[DEMO_PROFILE.participantId] ?? {},
    };
  });

  // The latest state, read by save without re-creating it.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    (async () => {
      try {
        const profile = await fetchProfile();
        if (!active) return;
        if (profile === null || profile.kind !== 'athlete') {
          setState({ status: 'needs-onboarding' });
          return;
        }
        const all = await fetchAssessments([profile.participantId]);
        if (!active) return;
        setState({
          status: 'ready',
          participantId: profile.participantId,
          name: profile.name,
          programme: programmeState(profile.programmeStartsOn, todayIso()),
          pairs: all[profile.participantId] ?? {},
        });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const save = useCallback<SaveFn>(async (participantId, phase, values) => {
    const s0 = latest.current;
    const current: PairValues = s0.status === 'ready' ? s0.pairs : {};
    const pairs = USE_FIXTURE
      ? mergePhase(current, phase, values)
      : await saveAssessment(participantId, phase, values, current);
    setState((s) => (s.status === 'ready' ? { ...s, pairs } : s));
  }, []);

  return { ...state, save };
}

// ---------------------------------------------------------------------------
// The coach's squad

export type SquadAthlete = { participantId: string; name: string };

export type SquadAssessmentsState =
  | { status: 'loading' }
  | {
      status: 'ready';
      athletes: SquadAthlete[];
      pairs: Record<string, PairValues>;
      /** The team's four weeks, which decide when Week 4 opens. */
      programme: ProgrammeState | null;
    }
  | { status: 'error'; message: string };

export function useSquadAssessments(): SquadAssessmentsState & { save: SaveFn } {
  const [state, setState] = useState<SquadAssessmentsState>(() =>
    USE_FIXTURE
      ? {
          status: 'ready',
          athletes: DEMO_COACH_VIEW.athletes.map((a) => ({
            participantId: a.participantId,
            name: a.name,
          })),
          pairs: DEMO_ASSESSMENTS,
          programme: programmeState(demoProgrammeStart(todayIso()), todayIso()),
        }
      : { status: 'loading' }
  );

  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    (async () => {
      try {
        // RLS answers "whose": a coach reads their own team's participants.
        const participants = await supabase.from('participants').select('id, name').order('name');
        if (participants.error) throw asError(participants.error);
        const athletes = (participants.data ?? []).map((p) => ({
          participantId: p.id,
          name: p.name,
        }));
        const [pairs, team] = await Promise.all([
          fetchAssessments(athletes.map((a) => a.participantId)),
          // The start date only gates Week 4; a coach without one still gets the form.
          myTeam().catch(() => null),
        ]);
        const programme = team ? programmeState(team.programmeStartsOn, todayIso()) : null;
        if (active) setState({ status: 'ready', athletes, pairs, programme });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const save = useCallback<SaveFn>(async (participantId, phase, values) => {
    const s0 = latest.current;
    const current: PairValues = s0.status === 'ready' ? (s0.pairs[participantId] ?? {}) : {};
    const next = USE_FIXTURE
      ? mergePhase(current, phase, values)
      : await saveAssessment(participantId, phase, values, current);
    setState((s) =>
      s.status === 'ready' ? { ...s, pairs: { ...s.pairs, [participantId]: next } } : s
    );
  }, []);

  return { ...state, save };
}
