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
          allowed_domains: string[]
          courier_cc: string[]
          courier_to: string[]
          default_ceco: string
          default_company: string
          id: boolean
          initial_admin_email: string
          label_offsets: Json
          office_province: string
          search_daily_limit: number
          sender_address: string
          sender_city: string
          sender_name: string
          sender_phone: string
          sender_postal_code: string
          sender_province: string
          subject_template: string
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[]
          courier_cc?: string[]
          courier_to?: string[]
          default_ceco?: string
          default_company?: string
          id?: boolean
          initial_admin_email?: string
          label_offsets?: Json
          office_province?: string
          search_daily_limit?: number
          sender_address?: string
          sender_city?: string
          sender_name?: string
          sender_phone?: string
          sender_postal_code?: string
          sender_province?: string
          subject_template?: string
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[]
          courier_cc?: string[]
          courier_to?: string[]
          default_ceco?: string
          default_company?: string
          id?: boolean
          initial_admin_email?: string
          label_offsets?: Json
          office_province?: string
          search_daily_limit?: number
          sender_address?: string
          sender_city?: string
          sender_name?: string
          sender_phone?: string
          sender_postal_code?: string
          sender_province?: string
          subject_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_search_cache: {
        Row: {
          created_at: string
          id: string
          provider: string
          query_normalized: string
          result: Json
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          query_normalized: string
          result: Json
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          query_normalized?: string
          result?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          company: string
          created_at: string
          default_ceco: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company?: string
          created_at?: string
          default_ceco?: string
          email: string
          full_name?: string
          id: string
          must_change_password?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company?: string
          created_at?: string
          default_ceco?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipients: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_person: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_favorite: boolean
          last_used_at: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          source_url: string | null
          updated_at: string
          updated_by: string | null
          usage_count: number
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_count?: number
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_count?: number
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          payload: Json
          shared: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          payload?: Json
          shared?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          payload?: Json
          shared?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_usage: {
        Row: {
          cached: boolean
          created_at: string
          id: string
          provider: string
          query: string
          user_id: string
        }
        Insert: {
          cached?: boolean
          created_at?: string
          id?: string
          provider: string
          query: string
          user_id?: string
        }
        Update: {
          cached?: boolean
          created_at?: string
          id?: string
          provider?: string
          query?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_ref_counters: {
        Row: {
          last: number
          year: number
        }
        Insert: {
          last?: number
          year: number
        }
        Update: {
          last?: number
          year?: number
        }
        Relationships: []
      }
      shipment_requests: {
        Row: {
          box_count: number | null
          ceco: string
          company: string
          concept: string | null
          created_at: string
          description: string | null
          dest_address: string | null
          dest_city: string | null
          dest_company: string | null
          dest_contact: string | null
          dest_country: string
          dest_phone: string | null
          dest_postal_code: string | null
          dest_province: string | null
          email_body: string | null
          email_cc: string[]
          email_subject: string | null
          id: string
          recipient_id: string | null
          ref: string
          request_date: string
          requester_email: string | null
          requester_id: string
          requester_name: string
          requester_phone: string | null
          scope: string | null
          sent_at: string | null
          shipment_type: string | null
          status: string
          transport: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          box_count?: number | null
          ceco?: string
          company?: string
          concept?: string | null
          created_at?: string
          description?: string | null
          dest_address?: string | null
          dest_city?: string | null
          dest_company?: string | null
          dest_contact?: string | null
          dest_country?: string
          dest_phone?: string | null
          dest_postal_code?: string | null
          dest_province?: string | null
          email_body?: string | null
          email_cc?: string[]
          email_subject?: string | null
          id?: string
          recipient_id?: string | null
          ref?: string
          request_date?: string
          requester_email?: string | null
          requester_id?: string
          requester_name?: string
          requester_phone?: string | null
          scope?: string | null
          sent_at?: string | null
          shipment_type?: string | null
          status?: string
          transport?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          box_count?: number | null
          ceco?: string
          company?: string
          concept?: string | null
          created_at?: string
          description?: string | null
          dest_address?: string | null
          dest_city?: string | null
          dest_company?: string | null
          dest_contact?: string | null
          dest_country?: string
          dest_phone?: string | null
          dest_postal_code?: string | null
          dest_province?: string | null
          email_body?: string | null
          email_cc?: string[]
          email_subject?: string | null
          id?: string
          recipient_id?: string | null
          ref?: string
          request_date?: string
          requester_email?: string | null
          requester_id?: string
          requester_name?: string
          requester_phone?: string | null
          scope?: string | null
          sent_at?: string | null
          shipment_type?: string | null
          status?: string
          transport?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_requests_requester_id_fkey"
            columns: ["requester_id"]
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
      f_unaccent: { Args: { value: string }; Returns: string }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      recipient_search_text: {
        Args: { city: string; company: string; contact: string }
        Returns: string
      }
      search_recipients: {
        Args: { max_results?: number; q?: string }
        Returns: {
          address: string | null
          city: string | null
          company_name: string
          contact_person: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_favorite: boolean
          last_used_at: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          source_url: string | null
          updated_at: string
          updated_by: string | null
          usage_count: number
          verified_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recipients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_usage_stats: {
        Args: never
        Returns: {
          daily_limit: number
          team_month: number
          user_today: number
        }[]
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
    Enums: {},
  },
} as const
