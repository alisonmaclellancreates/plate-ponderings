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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          ai_check_block_category: string | null
          ai_check_blocked_at: string | null
          ai_check_run_id: string | null
          demo_mode: boolean
          demo_today: string | null
          id: boolean
        }
        Insert: {
          ai_check_block_category?: string | null
          ai_check_blocked_at?: string | null
          ai_check_run_id?: string | null
          demo_mode?: boolean
          demo_today?: string | null
          id?: boolean
        }
        Update: {
          ai_check_block_category?: string | null
          ai_check_blocked_at?: string | null
          ai_check_run_id?: string | null
          demo_mode?: boolean
          demo_today?: string | null
          id?: boolean
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      demo_reset_lease: {
        Row: {
          expires_at: string
          id: boolean
          token: string
        }
        Insert: {
          expires_at: string
          id?: boolean
          token: string
        }
        Update: {
          expires_at?: string
          id?: boolean
          token?: string
        }
        Relationships: []
      }
      featured_days: {
        Row: {
          day: string
          stories_at_pick: number
          subject_id: string
        }
        Insert: {
          day: string
          stories_at_pick: number
          subject_id: string
        }
        Update: {
          day?: string
          stories_at_pick?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_days_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "featured_days_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      handle_save_attempts: {
        Row: {
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      hearts: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hearts_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearts_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "subject_owner"
            referencedColumns: ["story_id"]
          },
        ]
      }
      jurisdictions: {
        Row: {
          code: string
          country: string
          name: string
        }
        Insert: {
          code: string
          country: string
          name: string
        }
        Update: {
          code?: string
          country?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          read_at: string | null
          story_id: string | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          story_id?: string | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          story_id?: string | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "subject_owner"
            referencedColumns: ["story_id"]
          },
          {
            foreignKeyName: "notifications_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "notifications_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_detect_attempts: {
        Row: {
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          handle: string
          id: string
          last_recheck_at: string | null
        }
        Insert: {
          created_at?: string
          handle: string
          id: string
          last_recheck_at?: string | null
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          last_recheck_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string | null
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          reporter_id?: string | null
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string | null
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "subject_owner"
            referencedColumns: ["story_id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          meaning: string
          photo_box: number[] | null
          photo_path: string | null
          published_at: string | null
          removed_at: string | null
          source: string
          status: string
          subject_id: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          meaning: string
          photo_box?: number[] | null
          photo_path?: string | null
          published_at?: string | null
          removed_at?: string | null
          source: string
          status?: string
          subject_id: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          meaning?: string
          photo_box?: number[] | null
          photo_path?: string | null
          published_at?: string | null
          removed_at?: string | null
          source?: string
          status?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "stories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      story_save_attempts: {
        Row: {
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_guesses: {
        Row: {
          created_at: string
          meaning: string
          story: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          meaning: string
          story: string
          subject_id: string
        }
        Update: {
          created_at?: string
          meaning?: string
          story?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_guesses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "subject_guesses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_save_attempts: {
        Row: {
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          identity_a: string
          identity_b: string
          image_path: string | null
          normalized_key: string
          published_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          identity_a: string
          identity_b: string
          image_path?: string | null
          normalized_key: string
          published_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          identity_a?: string
          identity_b?: string
          image_path?: string | null
          normalized_key?: string
          published_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_identity_a_fkey"
            columns: ["identity_a"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["code"]
          },
        ]
      }
      summaries: {
        Row: {
          disagreement_score: number
          generated_at: string
          id: string
          started_at: string
          story_count: number
          subject_id: string
          text: string
          version: number
        }
        Insert: {
          disagreement_score: number
          generated_at: string
          id?: string
          started_at: string
          story_count: number
          subject_id: string
          text: string
          version: number
        }
        Update: {
          disagreement_score?: number
          generated_at?: string
          id?: string
          started_at?: string
          story_count?: number
          subject_id?: string
          text?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "summaries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "summaries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      summary_runs: {
        Row: {
          last_started_at: string
          subject_id: string
        }
        Insert: {
          last_started_at: string
          subject_id: string
        }
        Update: {
          last_started_at?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summary_runs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "summary_runs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      subject_owner: {
        Row: {
          author_id: string | null
          published_at: string | null
          story_id: string | null
          subject_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "stories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_status: {
        Row: {
          status: string | null
          subject_id: string | null
        }
        Relationships: []
      }
      subject_story_counts: {
        Row: {
          story_count: number | null
          subject_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_status"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "stories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_demo_reset: { Args: { _token: string }; Returns: boolean }
      claim_summary_run: { Args: { _subject_id: string }; Returns: boolean }
      consume_handle_save_attempt: {
        Args: { _user_id: string }
        Returns: boolean
      }
      consume_photo_detect_attempt: {
        Args: { _user_id: string }
        Returns: boolean
      }
      consume_story_save_attempt: {
        Args: { _user_id: string }
        Returns: boolean
      }
      consume_subject_save_attempt: {
        Args: { _user_id: string }
        Returns: boolean
      }
      create_generated_profile: {
        Args: { _user_id: string }
        Returns: undefined
      }
      effective_today: { Args: never; Returns: string }
      get_featured_subject_days: {
        Args: { _before?: string; _limit?: number }
        Returns: {
          day: string
          has_owner_story: boolean
          jurisdiction: string
          plate_text: string
          stories_at_pick: number
          story_count: number
          subject_id: string
        }[]
      }
      get_reported_stories: {
        Args: never
        Returns: {
          handle: string
          jurisdiction: string
          last_reported_at: string
          meaning: string
          plate_text: string
          reasons: string[]
          report_count: number
          status: string
          story_id: string
          subject_id: string
        }[]
      }
      get_visible_summary_versions: {
        Args: { _subject_id: string }
        Returns: {
          disagreement_score: number
          generated_at: string
          started_at: string
          story_count: number
          text: string
          version: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_story_published: { Args: { _story_id: string }; Returns: boolean }
      is_summary_public: { Args: { _summary_id: string }; Returns: boolean }
      pick_featured_subject_for_today: {
        Args: never
        Returns: {
          day: string
          stories_at_pick: number
          subject_id: string
        }[]
      }
      release_demo_reset: { Args: { _token: string }; Returns: undefined }
      renew_demo_reset: {
        Args: { _day: string; _token: string }
        Returns: boolean
      }
      replace_demo_seed_content: {
        Args: { _day: string; _seed: Json; _token: string }
        Returns: undefined
      }
      story_heart_counts: {
        Args: { _subject_id: string }
        Returns: {
          hearts: number
          story_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "demo"
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
  public: {
    Enums: {
      app_role: ["admin", "demo"],
    },
  },
} as const
