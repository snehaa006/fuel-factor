// GENERATED from the Supabase schema, then maintained by hand. Regenerate with:
//   npx supabase gen types typescript --project-id nprvrlpkdrgckzceyryc > src/lib/database.types.ts
// and merge rather than overwrite -- the comments here record decisions the
// generator cannot know, and the generator drops them.
//
// Checked against a fresh generation on 1 Nov 2026, after the step 14
// migrations were applied: every table, column, function and enum agrees. Two
// deliberate differences remain, both because the generator models a
// function's return and argument nullability poorly:
//   * `create_team.p_starts_on` is `string | null` here and `string` there.
//     Null is what the app passes when a coach has not set a date.
//   * `create_team` / `my_team` return `programme_starts_on: string | null`
//     here and `string` there. It is a nullable column.
//
// Note that the `private` schema's RLS helpers are absent on purpose: PostgREST
// does not expose that schema, which is the point of it.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      advice_rules: {
        Row: { active: boolean; code: string; created_at: string; domain: string; id: string; message_en: string; message_id: string | null; reviewed_by: string | null; severity: number; source: string; trigger: string };
        Insert: { active?: boolean; code: string; created_at?: string; domain: string; id?: string; message_en: string; message_id?: string | null; reviewed_by?: string | null; severity?: number; source: string; trigger: string };
        Update: { active?: boolean; code?: string; created_at?: string; domain?: string; id?: string; message_en?: string; message_id?: string | null; reviewed_by?: string | null; severity?: number; source?: string; trigger?: string };
        Relationships: [];
      };
      assessments: {
        Row: { created_at: string; domain: string; id: string; measure: string; participant_id: string; post_value: number | null; pre_value: number | null; unit: string | null; updated_at: string };
        Insert: { created_at?: string; domain: string; id?: string; measure: string; participant_id: string; post_value?: number | null; pre_value?: number | null; unit?: string | null; updated_at?: string };
        Update: { created_at?: string; domain?: string; id?: string; measure?: string; participant_id?: string; post_value?: number | null; pre_value?: number | null; unit?: string | null; updated_at?: string };
        Relationships: [{ foreignKeyName: 'assessments_participant_id_fkey'; columns: ['participant_id']; isOneToOne: false; referencedRelation: 'participants'; referencedColumns: ['id'] }];
      };
      badges: {
        Row: { code: string; created_at: string; criterion: Database['public']['Enums']['badge_criterion']; description: string; id: string; name: string; position: number; threshold: number };
        Insert: { code: string; created_at?: string; criterion: Database['public']['Enums']['badge_criterion']; description: string; id?: string; name: string; position: number; threshold: number };
        Update: { code?: string; created_at?: string; criterion?: Database['public']['Enums']['badge_criterion']; description?: string; id?: string; name?: string; position?: number; threshold?: number };
        Relationships: [];
      };
      challenge_completions: {
        Row: { challenge_id: string; completed_on: string; created_at: string; id: string; participant_id: string; photo_path: string | null };
        Insert: { challenge_id: string; completed_on: string; created_at?: string; id?: string; participant_id: string; photo_path?: string | null };
        Update: { challenge_id?: string; completed_on?: string; created_at?: string; id?: string; participant_id?: string; photo_path?: string | null };
        Relationships: [
          { foreignKeyName: 'challenge_completions_challenge_id_fkey'; columns: ['challenge_id']; isOneToOne: false; referencedRelation: 'weekly_challenges'; referencedColumns: ['id'] },
          { foreignKeyName: 'challenge_completions_participant_id_fkey'; columns: ['participant_id']; isOneToOne: false; referencedRelation: 'participants'; referencedColumns: ['id'] },
        ];
      };
      daily_logs: {
        Row: { breakfast: boolean; carb_portions: number | null; concentration: number | null; created_at: string; day_type: Database['public']['Enums']['day_type'] | null; dinner: boolean; dq_score: number | null; energy_am: number | null; energy_training: number | null; evening_snack: boolean; fluid_ml: number | null; fruit_servings: number | null; id: string; log_date: string; lunch: boolean; mood: number | null; notes: string | null; participant_id: string; post_training: boolean; pre_training: boolean; protein_sources: number | null; recovery: number | null; updated_at: string; urine_colour: number | null; veg_servings: number | null };
        Insert: { breakfast?: boolean; carb_portions?: number | null; concentration?: number | null; created_at?: string; day_type?: Database['public']['Enums']['day_type'] | null; dinner?: boolean; dq_score?: number | null; energy_am?: number | null; energy_training?: number | null; evening_snack?: boolean; fluid_ml?: number | null; fruit_servings?: number | null; id?: string; log_date: string; lunch?: boolean; mood?: number | null; notes?: string | null; participant_id: string; post_training?: boolean; pre_training?: boolean; protein_sources?: number | null; recovery?: number | null; updated_at?: string; urine_colour?: number | null; veg_servings?: number | null };
        Update: { breakfast?: boolean; carb_portions?: number | null; concentration?: number | null; created_at?: string; day_type?: Database['public']['Enums']['day_type'] | null; dinner?: boolean; dq_score?: number | null; energy_am?: number | null; energy_training?: number | null; evening_snack?: boolean; fluid_ml?: number | null; fruit_servings?: number | null; id?: string; log_date?: string; lunch?: boolean; mood?: number | null; notes?: string | null; participant_id?: string; post_training?: boolean; pre_training?: boolean; protein_sources?: number | null; recovery?: number | null; updated_at?: string; urine_colour?: number | null; veg_servings?: number | null };
        Relationships: [{ foreignKeyName: 'daily_logs_participant_id_fkey'; columns: ['participant_id']; isOneToOne: false; referencedRelation: 'participants'; referencedColumns: ['id'] }];
      };
      food_items: {
        Row: { category: string | null; created_at: string; guidance: string; guidance_note: string | null; id: string; is_pork: boolean; name_en: string | null; name_id: string; source: string };
        Insert: { category?: string | null; created_at?: string; guidance: string; guidance_note?: string | null; id?: string; is_pork?: boolean; name_en?: string | null; name_id: string; source: string };
        Update: { category?: string | null; created_at?: string; guidance?: string; guidance_note?: string | null; id?: string; is_pork?: boolean; name_en?: string | null; name_id?: string; source?: string };
        Relationships: [];
      };
      food_portions: {
        Row: { carbs_g: number | null; created_at: string; fat_g: number | null; food_id: string; grams: number | null; id: string; is_default: boolean; kcal: number | null; label: string; protein_g: number | null; source_note: string | null };
        Insert: { carbs_g?: number | null; created_at?: string; fat_g?: number | null; food_id: string; grams?: number | null; id?: string; is_default?: boolean; kcal?: number | null; label: string; protein_g?: number | null; source_note?: string | null };
        Update: { carbs_g?: number | null; created_at?: string; fat_g?: number | null; food_id?: string; grams?: number | null; id?: string; is_default?: boolean; kcal?: number | null; label?: string; protein_g?: number | null; source_note?: string | null };
        Relationships: [{ foreignKeyName: 'food_portions_food_id_fkey'; columns: ['food_id']; isOneToOne: false; referencedRelation: 'food_items'; referencedColumns: ['id'] }];
      };
      lesson_cards: {
        Row: { body: string | null; created_at: string; heading: string | null; id: string; kind: string; position: number; source: string; source_note: string | null; week_number: number };
        Insert: { body?: string | null; created_at?: string; heading?: string | null; id?: string; kind: string; position: number; source: string; source_note?: string | null; week_number: number };
        Update: { body?: string | null; created_at?: string; heading?: string | null; id?: string; kind?: string; position?: number; source?: string; source_note?: string | null; week_number?: number };
        Relationships: [];
      };
      lesson_points: {
        Row: { card_id: string; created_at: string; detail: string | null; id: string; label: string | null; position: number; value: string | null };
        Insert: { card_id: string; created_at?: string; detail?: string | null; id?: string; label?: string | null; position: number; value?: string | null };
        Update: { card_id?: string; created_at?: string; detail?: string | null; id?: string; label?: string | null; position?: number; value?: string | null };
        Relationships: [
          { foreignKeyName: 'lesson_points_card_id_fkey'; columns: ['card_id']; isOneToOne: false; referencedRelation: 'lesson_cards'; referencedColumns: ['id'] },
        ];
      };
      log_items: {
        Row: { daily_log_id: string; food_portion_id: string | null; free_text: string | null; id: string; logged_at: string; quantity: number; slot: Database['public']['Enums']['meal_slot'] };
        Insert: { daily_log_id: string; food_portion_id?: string | null; free_text?: string | null; id?: string; logged_at?: string; quantity?: number; slot: Database['public']['Enums']['meal_slot'] };
        Update: { daily_log_id?: string; food_portion_id?: string | null; free_text?: string | null; id?: string; logged_at?: string; quantity?: number; slot?: Database['public']['Enums']['meal_slot'] };
        Relationships: [
          { foreignKeyName: 'log_items_daily_log_id_fkey'; columns: ['daily_log_id']; isOneToOne: false; referencedRelation: 'daily_logs'; referencedColumns: ['id'] },
          { foreignKeyName: 'log_items_food_portion_id_fkey'; columns: ['food_portion_id']; isOneToOne: false; referencedRelation: 'food_portions'; referencedColumns: ['id'] },
        ];
      };
      participant_profiles: {
        Row: { consent_ack_at: string | null; created_at: string; participant_id: string; team_id: string | null; user_id: string | null };
        Insert: { consent_ack_at?: string | null; created_at?: string; participant_id: string; team_id?: string | null; user_id?: string | null };
        Update: { consent_ack_at?: string | null; created_at?: string; participant_id?: string; team_id?: string | null; user_id?: string | null };
        Relationships: [
          { foreignKeyName: 'participant_profiles_participant_id_fkey'; columns: ['participant_id']; isOneToOne: true; referencedRelation: 'participants'; referencedColumns: ['id'] },
          { foreignKeyName: 'participant_profiles_team_id_fkey'; columns: ['team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
        ];
      };
      participants: {
        Row: { age_band: string | null; calf_cm: number | null; consent_signed: boolean; created_at: string; height_cm: number | null; id: string; muac_cm: number | null; name: string; notes: string | null; parent_contact: string | null; participant_code: string; sport: string | null; updated_at: string; waist_cm: number | null; weight_kg: number | null };
        Insert: { age_band?: string | null; calf_cm?: number | null; consent_signed?: boolean; created_at?: string; height_cm?: number | null; id?: string; muac_cm?: number | null; name: string; notes?: string | null; parent_contact?: string | null; participant_code: string; sport?: string | null; updated_at?: string; waist_cm?: number | null; weight_kg?: number | null };
        Update: { age_band?: string | null; calf_cm?: number | null; consent_signed?: boolean; created_at?: string; height_cm?: number | null; id?: string; muac_cm?: number | null; name?: string; notes?: string | null; parent_contact?: string | null; participant_code?: string; sport?: string | null; updated_at?: string; waist_cm?: number | null; weight_kg?: number | null };
        Relationships: [];
      };
      recalls: {
        Row: { activities: string | null; breakfast: string | null; created_at: string; day_number: number; day_type: Database['public']['Enums']['day_type'] | null; dinner: string | null; energy: number | null; est_calories: number | null; fluid_ml: number | null; id: string; lunch: string | null; notes: string | null; participant_id: string; recall_date: string | null; recovery: number | null; sleep_hours: number | null; supplements: string | null; updated_at: string; urine_colour: number | null };
        Insert: { activities?: string | null; breakfast?: string | null; created_at?: string; day_number: number; day_type?: Database['public']['Enums']['day_type'] | null; dinner?: string | null; energy?: number | null; est_calories?: number | null; fluid_ml?: number | null; id?: string; lunch?: string | null; notes?: string | null; participant_id: string; recall_date?: string | null; recovery?: number | null; sleep_hours?: number | null; supplements?: string | null; updated_at?: string; urine_colour?: number | null };
        Update: { activities?: string | null; breakfast?: string | null; created_at?: string; day_number?: number; day_type?: Database['public']['Enums']['day_type'] | null; dinner?: string | null; energy?: number | null; est_calories?: number | null; fluid_ml?: number | null; id?: string; lunch?: string | null; notes?: string | null; participant_id?: string; recall_date?: string | null; recovery?: number | null; sleep_hours?: number | null; supplements?: string | null; updated_at?: string; urine_colour?: number | null };
        Relationships: [{ foreignKeyName: 'recalls_participant_id_fkey'; columns: ['participant_id']; isOneToOne: false; referencedRelation: 'participants'; referencedColumns: ['id'] }];
      };
      recall_nutrition: {
        // App tier. What the food database made of one recall day; never
        // exported. Null macros mean not computed, never zero.
        Row: { carbs_g: number | null; computed_at: string; fat_g: number | null; kcal: number | null; method: Database['public']['Enums']['nutrition_method']; note: string | null; protein_g: number | null; recall_id: string };
        Insert: { carbs_g?: number | null; computed_at?: string; fat_g?: number | null; kcal?: number | null; method?: Database['public']['Enums']['nutrition_method']; note?: string | null; protein_g?: number | null; recall_id: string };
        Update: { carbs_g?: number | null; computed_at?: string; fat_g?: number | null; kcal?: number | null; method?: Database['public']['Enums']['nutrition_method']; note?: string | null; protein_g?: number | null; recall_id?: string };
        Relationships: [{ foreignKeyName: 'recall_nutrition_recall_id_fkey'; columns: ['recall_id']; isOneToOne: true; referencedRelation: 'recalls'; referencedColumns: ['id'] }];
      };
      team_members: {
        Row: { created_at: string; role: Database['public']['Enums']['team_role']; team_id: string; user_id: string };
        Insert: { created_at?: string; role?: Database['public']['Enums']['team_role']; team_id: string; user_id: string };
        Update: { created_at?: string; role?: Database['public']['Enums']['team_role']; team_id?: string; user_id?: string };
        Relationships: [{ foreignKeyName: 'team_members_team_id_fkey'; columns: ['team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] }];
      };
      teams: {
        // `coach_code` is revoked from `authenticated` at the column level, so
        // a select on this table never returns it however the row is reached.
        // A coach reads their own through `my_team()`.
        Row: { created_at: string; created_by: string | null; id: string; coach_code: string | null; join_code: string; name: string; programme_starts_on: string | null };
        Insert: { created_at?: string; created_by?: string | null; id?: string; coach_code?: string | null; join_code: string; name: string; programme_starts_on?: string | null };
        Update: { created_at?: string; created_by?: string | null; id?: string; coach_code?: string | null; join_code?: string; name?: string; programme_starts_on?: string | null };
        Relationships: [];
      };
      training_sessions: {
        Row: { created_at: string; daily_log_id: string; ends_at: string | null; starts_at: string | null; updated_at: string };
        Insert: { created_at?: string; daily_log_id: string; ends_at?: string | null; starts_at?: string | null; updated_at?: string };
        Update: { created_at?: string; daily_log_id?: string; ends_at?: string | null; starts_at?: string | null; updated_at?: string };
        Relationships: [
          { foreignKeyName: 'training_sessions_daily_log_id_fkey'; columns: ['daily_log_id']; isOneToOne: true; referencedRelation: 'daily_logs'; referencedColumns: ['id'] },
        ];
      };
      weekly_challenges: {
        Row: { challenge: string; created_at: string; id: string; starts_on: string | null; theme: string; week_number: number };
        Insert: { challenge: string; created_at?: string; id?: string; starts_on?: string | null; theme: string; week_number: number };
        Update: { challenge?: string; created_at?: string; id?: string; starts_on?: string | null; theme?: string; week_number?: number };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_coach: {
        Args: { p_coach_code: string };
        Returns: string;
      };
      claim_participant: {
        Args: { p_consent_ack: boolean; p_join_code: string; p_participant_code: string };
        Returns: string;
      };
      team_roster: {
        Args: { p_join_code: string };
        Returns: { claimed: boolean; name: string; participant_code: string }[];
      };
      create_team: {
        Args: { p_name: string; p_starts_on?: string | null };
        Returns: {
          id: string;
          name: string;
          join_code: string;
          coach_code: string;
          programme_starts_on: string | null;
        }[];
      };
      my_team: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          join_code: string;
          coach_code: string;
          programme_starts_on: string | null;
          athletes: number;
        }[];
      };
      set_programme_start: {
        Args: { p_starts_on: string | null };
        Returns: string | null;
      };
      team_by_code: {
        // A name and the programme date. Deliberately not the roster: that is
        // `team_roster`, and it is a list of named minors.
        Args: { p_join_code: string };
        Returns: { name: string; programme_starts_on: string | null }[];
      };
      join_team: {
        Args: {
          p_join_code: string;
          p_name: string;
          p_consent_ack: boolean;
          p_sport?: string | null;
          p_age_band?: string | null;
          p_height_cm?: number | null;
          p_weight_kg?: number | null;
          p_waist_cm?: number | null;
          p_muac_cm?: number | null;
          p_calf_cm?: number | null;
          p_consent_signed?: boolean;
          p_parent_contact?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      compute_recall_nutrition: {
        Args: { p_recall_id: string };
        Returns: Database['public']['Tables']['recall_nutrition']['Row'];
      };
      team_leaderboard: {
        Args: { p_today?: string; p_days?: number };
        // A first name, a day count and two booleans. No body metric and no
        // nutrition figure, because the athletes are minors -- see the
        // migration's own note.
        Returns: {
          participant_code: string;
          name: string;
          days_logged: number;
          logged_today: boolean;
          is_me: boolean;
        }[];
      };
    };
    Enums: {
      badge_criterion: 'days_logged' | 'streak' | 'challenges_done';
      day_type: 'training' | 'rest';
      meal_slot: 'breakfast' | 'pre_training' | 'lunch' | 'post_training' | 'dinner' | 'evening_snack';
      nutrition_method: 'not_computed' | 'food_database';
      team_role: 'athlete' | 'coach';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database['public'];

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update'];
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T];

export const Constants = {
  public: {
    Enums: {
      badge_criterion: ['days_logged', 'streak', 'challenges_done'],
      day_type: ['training', 'rest'],
      meal_slot: ['breakfast', 'pre_training', 'lunch', 'post_training', 'dinner', 'evening_snack'],
      nutrition_method: ['not_computed', 'food_database'],
      team_role: ['athlete', 'coach'],
    },
  },
} as const;
