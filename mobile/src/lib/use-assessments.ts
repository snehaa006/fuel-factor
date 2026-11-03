import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchAssessments,
  fetchRecallFigures,
  recallFill,
  saveAssessment,
  type PairValues,
  type Phase,
  type RecallFill,
} from './assessments';
import { myTeam } from './coach-auth';
import { asError, messageOf } from './errors';
import { fetchProfile } from './profile';
import { programmeState, type ProgrammeState } from './programme';
import { supabase } from './supabase';
import { todayIso } from './today';

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
      /** What has been saved. */
      pairs: PairValues;
      /** The recall's averages, for the fields nobody has filled. */
      fill: RecallFill;
    }
  | { status: 'error'; message: string };

export function useMyAssessments(): MyAssessmentsState & { save: SaveFn } {
  const [state, setState] = useState<MyAssessmentsState>({ status: 'loading' });

  // The latest state, read by save without re-creating it.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const profile = await fetchProfile();
        if (!active) return;
        if (profile === null || profile.kind !== 'athlete') {
          setState({ status: 'needs-onboarding' });
          return;
        }
        const [all, figures] = await Promise.all([
          fetchAssessments([profile.participantId]),
          fetchRecallFigures([profile.participantId]),
        ]);
        if (!active) return;
        setState({
          status: 'ready',
          participantId: profile.participantId,
          name: profile.name,
          programme: programmeState(profile.programmeStartsOn, todayIso()),
          pairs: all[profile.participantId] ?? {},
          fill: recallFill(figures[profile.participantId] ?? []),
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
    const pairs = await saveAssessment(participantId, phase, values, current);
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
      /** Each athlete's recall averages, keyed by participant. */
      fills: Record<string, RecallFill>;
      /** The team's four weeks, which decide when Week 4 opens. */
      programme: ProgrammeState | null;
    }
  | { status: 'error'; message: string };

export function useSquadAssessments(): SquadAssessmentsState & { save: SaveFn } {
  const [state, setState] = useState<SquadAssessmentsState>({ status: 'loading' });

  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
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
        const ids = athletes.map((a) => a.participantId);
        const [pairs, figures, team] = await Promise.all([
          fetchAssessments(ids),
          fetchRecallFigures(ids),
          // The start date only gates Week 4; a coach without one still gets the form.
          myTeam().catch(() => null),
        ]);
        const programme = team ? programmeState(team.programmeStartsOn, todayIso()) : null;
        const fills = Object.fromEntries(ids.map((id) => [id, recallFill(figures[id] ?? [])]));
        if (active) setState({ status: 'ready', athletes, pairs, fills, programme });
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
    const next = await saveAssessment(participantId, phase, values, current);
    setState((s) =>
      s.status === 'ready' ? { ...s, pairs: { ...s.pairs, [participantId]: next } } : s
    );
  }, []);

  return { ...state, save };
}
