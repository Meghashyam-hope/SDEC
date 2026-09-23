/**
 * Hand-written placeholder matching the schema sketch in SDEC_PLAN §6.
 * Replace with the generated file once the Supabase project + migrations
 * exist:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type AppRole = "student" | "officer" | "admin";
export type ResultsVisibility = "after_close" | "manual" | "live";
export type ElectionOverride = "paused" | "closed_early" | "cancelled";
export type CandidateStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface Database {
  public: {
    Tables: {
      voters: {
        Row: {
          id: string;
          roll_number: string;
          full_name: string;
          email: string;
          phone: string | null;
          department: string;
          year: number;
          section: string | null;
          is_active: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["voters"]["Row"]> & {
          roll_number: string;
          full_name: string;
          email: string;
          department: string;
          year: number;
        };
        Update: Partial<Database["public"]["Tables"]["voters"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          voter_id: string | null;
          display_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      elections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          cover_path: string | null;
          nominations_open_at: string | null;
          nominations_close_at: string | null;
          starts_at: string;
          ends_at: string;
          is_published: boolean;
          override: ElectionOverride | null;
          results_visibility: ResultsVisibility;
          results_published_at: string | null;
          allow_nota: boolean;
          eligibility: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["elections"]["Row"]> & {
          slug: string;
          title: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["elections"]["Row"]>;
        Relationships: [];
      };
      positions: {
        Row: {
          id: string;
          election_id: string;
          title: string;
          description: string | null;
          seats: number;
          max_choices: number;
          eligibility: Record<string, unknown>;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["positions"]["Row"]> & {
          election_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["positions"]["Row"]>;
        Relationships: [];
      };
      candidates: {
        Row: {
          id: string;
          position_id: string;
          voter_id: string | null;
          display_name: string;
          tagline: string | null;
          manifesto: string | null;
          photo_path: string | null;
          status: CandidateStatus;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["candidates"]["Row"]> & {
          position_id: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["candidates"]["Row"]>;
        Relationships: [];
      };
      voter_participation: {
        Row: {
          election_id: string;
          voter_id: string;
          voted_at: string;
        };
        Insert: {
          election_id: string;
          voter_id: string;
          voted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["voter_participation"]["Row"]>;
        Relationships: [];
      };
      ballots: {
        Row: {
          id: string;
          election_id: string;
          receipt_hash: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          receipt_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["ballots"]["Row"]>;
        Relationships: [];
      };
      ballot_selections: {
        Row: {
          ballot_id: string;
          position_id: string;
          candidate_id: string | null;
          is_nota: boolean;
        };
        Insert: {
          ballot_id: string;
          position_id: string;
          candidate_id?: string | null;
          is_nota?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["ballot_selections"]["Row"]>;
        Relationships: [];
      };
      election_turnout: {
        Row: {
          election_id: string;
          votes_cast: number;
          updated_at: string;
        };
        Insert: {
          election_id: string;
          votes_cast?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["election_turnout"]["Row"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          meta: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          meta?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cast_ballot: {
        Args: { p_election: string; p_selections: unknown };
        Returns: string;
      };
      get_results: {
        Args: { p_election: string };
        Returns: unknown;
      };
      get_turnout: {
        Args: { p_election: string };
        Returns: unknown;
      };
      verify_receipt: {
        Args: { p_code: string };
        Returns: unknown;
      };
      lookup_voter_for_login: {
        Args: { p_roll: string };
        Returns: unknown;
      };
    };
    Enums: {
      app_role: AppRole;
      results_visibility: ResultsVisibility;
      election_override: ElectionOverride;
      candidate_status: CandidateStatus;
    };
  };
}
