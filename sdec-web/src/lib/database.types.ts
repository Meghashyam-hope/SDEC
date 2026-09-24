export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: number
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: never
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: never
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ballot_selections: {
        Row: {
          ballot_id: string
          candidate_id: string | null
          is_nota: boolean
          position_id: string
        }
        Insert: {
          ballot_id: string
          candidate_id?: string | null
          is_nota?: boolean
          position_id: string
        }
        Update: {
          ballot_id?: string
          candidate_id?: string | null
          is_nota?: boolean
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ballot_selections_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_selections_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_selections_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      ballots: {
        Row: {
          election_id: string
          id: string
          receipt_hash: string
        }
        Insert: {
          election_id: string
          id?: string
          receipt_hash: string
        }
        Update: {
          election_id?: string
          id?: string
          receipt_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "ballots_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          display_name: string
          id: string
          manifesto: string | null
          photo_path: string | null
          position_id: string
          sort_order: number
          status: Database["public"]["Enums"]["candidate_status"]
          tagline: string | null
          voter_id: string | null
        }
        Insert: {
          display_name: string
          id?: string
          manifesto?: string | null
          photo_path?: string | null
          position_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["candidate_status"]
          tagline?: string | null
          voter_id?: string | null
        }
        Update: {
          display_name?: string
          id?: string
          manifesto?: string | null
          photo_path?: string | null
          position_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["candidate_status"]
          tagline?: string | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      election_turnout: {
        Row: {
          election_id: string
          updated_at: string
          votes_cast: number
        }
        Insert: {
          election_id: string
          updated_at?: string
          votes_cast?: number
        }
        Update: {
          election_id?: string
          updated_at?: string
          votes_cast?: number
        }
        Relationships: [
          {
            foreignKeyName: "election_turnout_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: true
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          allow_nota: boolean
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          eligibility: Json
          ends_at: string
          id: string
          is_published: boolean
          nominations_close_at: string | null
          nominations_open_at: string | null
          override: Database["public"]["Enums"]["election_override"] | null
          results_published_at: string | null
          results_visibility: Database["public"]["Enums"]["results_visibility"]
          slug: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_nota?: boolean
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility?: Json
          ends_at: string
          id?: string
          is_published?: boolean
          nominations_close_at?: string | null
          nominations_open_at?: string | null
          override?: Database["public"]["Enums"]["election_override"] | null
          results_published_at?: string | null
          results_visibility?: Database["public"]["Enums"]["results_visibility"]
          slug: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_nota?: boolean
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility?: Json
          ends_at?: string
          id?: string
          is_published?: boolean
          nominations_close_at?: string | null
          nominations_open_at?: string | null
          override?: Database["public"]["Enums"]["election_override"] | null
          results_published_at?: string | null
          results_visibility?: Database["public"]["Enums"]["results_visibility"]
          slug?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_lookup_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip: unknown
          roll_number: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          ip?: unknown
          roll_number: string
        }
        Update: {
          attempted_at?: string
          id?: never
          ip?: unknown
          roll_number?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          description: string | null
          election_id: string
          eligibility: Json
          id: string
          max_choices: number
          seats: number
          sort_order: number
          title: string
        }
        Insert: {
          description?: string | null
          election_id: string
          eligibility?: Json
          id?: string
          max_choices?: number
          seats?: number
          sort_order?: number
          title: string
        }
        Update: {
          description?: string | null
          election_id?: string
          eligibility?: Json
          id?: string
          max_choices?: number
          seats?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          voter_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          voter_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: true
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      voter_participation: {
        Row: {
          election_id: string
          voted_at: string
          voter_id: string
        }
        Insert: {
          election_id: string
          voted_at?: string
          voter_id: string
        }
        Update: {
          election_id?: string
          voted_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voter_participation_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voter_participation_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      voters: {
        Row: {
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          pending_role: Database["public"]["Enums"]["app_role"] | null
          phone: string | null
          roll_number: string
          section: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          department: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          pending_role?: Database["public"]["Enums"]["app_role"] | null
          phone?: string | null
          roll_number: string
          section?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          pending_role?: Database["public"]["Enums"]["app_role"] | null
          phone?: string | null
          roll_number?: string
          section?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cast_ballot: {
        Args: { p_election: string; p_selections: Json }
        Returns: string
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      election_phase: {
        Args: { e: Database["public"]["Tables"]["elections"]["Row"] }
        Returns: string
      }
      get_results: { Args: { p_election: string }; Returns: Json }
      get_turnout: { Args: { p_election: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_admin_login_allowed: { Args: { p_email: string }; Returns: boolean }
      is_eligible: {
        Args: {
          eligibility: Json
          v: Database["public"]["Tables"]["voters"]["Row"]
        }
        Returns: boolean
      }
      is_officer_or_admin: { Args: never; Returns: boolean }
      lookup_voter_for_login: {
        Args: { p_ip?: unknown; p_roll: string }
        Returns: Json
      }
      verify_receipt: { Args: { p_code: string }; Returns: Json }
      write_audit_log: {
        Args: {
          p_action: string
          p_entity?: string
          p_entity_id?: string
          p_meta?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "officer" | "admin"
      candidate_status: "pending" | "approved" | "rejected" | "withdrawn"
      election_override: "paused" | "closed_early" | "cancelled"
      results_visibility: "after_close" | "manual" | "live"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["student", "officer", "admin"],
      candidate_status: ["pending", "approved", "rejected", "withdrawn"],
      election_override: ["paused", "closed_early", "cancelled"],
      results_visibility: ["after_close", "manual", "live"],
    },
  },
} as const
