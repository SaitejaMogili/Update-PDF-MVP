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
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: number
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          team_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_agents: {
        Row: {
          created_at: string | null
          id: string
          is_system: boolean | null
          name: string
          system_prompt: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          system_prompt: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          system_prompt?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_workspaces: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string | null
          file_ids: string[] | null
          id: string
          name: string
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          file_ids?: string[] | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          file_ids?: string[] | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_workspaces_agent_fk"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "brain_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          font_family: string | null
          id: string
          is_default: boolean | null
          logo_file_id: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          tax_id: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          font_family?: string | null
          id?: string
          is_default?: boolean | null
          logo_file_id?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          tax_id?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          font_family?: string | null
          id?: string
          is_default?: boolean | null
          logo_file_id?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          tax_id?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_logo_file_id_fkey"
            columns: ["logo_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          file_id: string | null
          id: string
          page_number: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          file_id?: string | null
          id?: string
          page_number?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          file_id?: string | null
          id?: string
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_embeddings_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          citations: Json | null
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
          tokens: number | null
        }
        Insert: {
          citations?: Json | null
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
          tokens?: number | null
        }
        Update: {
          citations?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_ids: string[]
          id: string
          last_message_at: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_ids: string[]
          id?: string
          last_message_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_ids?: string[]
          id?: string
          last_message_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          amount_cents: number
          bank_template: string | null
          cheque_number: string | null
          created_at: string | null
          currency: string
          id: string
          memo: string | null
          output_file_id: string | null
          payee: string
          printed_at: string | null
          signature_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          bank_template?: string | null
          cheque_number?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          memo?: string | null
          output_file_id?: string | null
          payee: string
          printed_at?: string | null
          signature_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          bank_template?: string | null
          cheque_number?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          memo?: string | null
          output_file_id?: string | null
          payee?: string
          printed_at?: string | null
          signature_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheques_output_file_id_fkey"
            columns: ["output_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          balance_after: number
          created_at: string | null
          delta: number
          id: number
          reason: string
          reference_id: string | null
          user_id: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          delta: number
          id?: number
          reason: string
          reference_id?: string | null
          user_id?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          delta?: number
          id?: number
          reason?: string
          reference_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          anon_fingerprint: string | null
          created_at: string | null
          expires_at: string | null
          filename: string
          id: string
          mime_type: string | null
          page_count: number | null
          size_bytes: number | null
          storage_path: string
          user_id: string | null
        }
        Insert: {
          anon_fingerprint?: string | null
          created_at?: string | null
          expires_at?: string | null
          filename: string
          id?: string
          mime_type?: string | null
          page_count?: number | null
          size_bytes?: number | null
          storage_path: string
          user_id?: string | null
        }
        Update: {
          anon_fingerprint?: string | null
          created_at?: string | null
          expires_at?: string | null
          filename?: string
          id?: string
          mime_type?: string | null
          page_count?: number | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          credits_balance: number
          credits_refresh_at: string
          email: string
          fingerprint: string | null
          full_name: string | null
          id: string
          plan: string
          referrer: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          credits_balance?: number
          credits_refresh_at?: string
          email: string
          fingerprint?: string | null
          full_name?: string | null
          id: string
          plan?: string
          referrer?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          credits_balance?: number
          credits_refresh_at?: string
          email?: string
          fingerprint?: string | null
          full_name?: string | null
          id?: string
          plan?: string
          referrer?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          storage_path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          storage_path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          storage_path?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string
          seats: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan: string
          seats?: number
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          seats?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          slug: string
          template_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          template_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          template_count?: number | null
        }
        Relationships: []
      }
      template_instances: {
        Row: {
          ai_prompt: string | null
          brand_kit_id: string | null
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          name: string | null
          output_file_id: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string | null
          values_json: Json
        }
        Insert: {
          ai_prompt?: string | null
          brand_kit_id?: string | null
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          name?: string | null
          output_file_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          values_json: Json
        }
        Update: {
          ai_prompt?: string | null
          brand_kit_id?: string | null
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          name?: string | null
          output_file_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          values_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "template_instances_brand_kit_fk"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_instances_output_file_id_fkey"
            columns: ["output_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category_id: string | null
          created_at: string | null
          default_credits: number | null
          description: string | null
          fields_json: Json
          id: string
          is_ai_assisted: boolean | null
          is_published: boolean | null
          layout_json: Json
          name: string
          popularity_score: number | null
          preview_url: string | null
          slug: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          default_credits?: number | null
          description?: string | null
          fields_json: Json
          id?: string
          is_ai_assisted?: boolean | null
          is_published?: boolean | null
          layout_json: Json
          name: string
          popularity_score?: number | null
          preview_url?: string | null
          slug: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          default_credits?: number | null
          description?: string | null
          fields_json?: Json
          id?: string
          is_ai_assisted?: boolean | null
          is_published?: boolean | null
          layout_json?: Json
          name?: string
          popularity_score?: number | null
          preview_url?: string | null
          slug?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_jobs: {
        Row: {
          anon_fingerprint: string | null
          completed_at: string | null
          created_at: string | null
          credits_charged: number | null
          error_message: string | null
          id: string
          input_file_ids: string[] | null
          output_file_id: string | null
          params: Json | null
          started_at: string | null
          status: string
          tool_slug: string
          user_id: string | null
        }
        Insert: {
          anon_fingerprint?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: number | null
          error_message?: string | null
          id?: string
          input_file_ids?: string[] | null
          output_file_id?: string | null
          params?: Json | null
          started_at?: string | null
          status?: string
          tool_slug: string
          user_id?: string | null
        }
        Update: {
          anon_fingerprint?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_charged?: number | null
          error_message?: string | null
          id?: string
          input_file_ids?: string[] | null
          output_file_id?: string | null
          params?: Json | null
          started_at?: string | null
          status?: string
          tool_slug?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_jobs_output_file_id_fkey"
            columns: ["output_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debit_credits: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      refund_credits: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
