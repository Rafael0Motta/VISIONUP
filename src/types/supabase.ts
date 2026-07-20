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
          actor_role: Database["public"]["Enums"]["app_role"] | null
          campaign_id: string | null
          created_at: string
          id: string
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reports: {
        Row: {
          campaign_id: string
          created_at: string
          custo: number | null
          entregues: number
          enviados: number
          expirados: number
          falhados: number
          id: string
          importado_em: string
          importado_por: string | null
          lidos: number
          origem: Database["public"]["Enums"]["report_origin"]
          raw_file_path: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          custo?: number | null
          entregues?: number
          enviados?: number
          expirados?: number
          falhados?: number
          id?: string
          importado_em?: string
          importado_por?: string | null
          lidos?: number
          origem: Database["public"]["Enums"]["report_origin"]
          raw_file_path?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          custo?: number | null
          entregues?: number
          enviados?: number
          expirados?: number
          falhados?: number
          id?: string
          importado_em?: string
          importado_por?: string | null
          lidos?: number
          origem?: Database["public"]["Enums"]["report_origin"]
          raw_file_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_importado_por_fkey"
            columns: ["importado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contact_list_id: string | null
          contact_list_signed_url: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          profile_customization: Json
          profile_photo_signed_url: string | null
          rejection_reason: string | null
          released_at: string | null
          released_by: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          template_id: string | null
          template_media_signed_url: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contact_list_id?: string | null
          contact_list_signed_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          profile_customization?: Json
          profile_photo_signed_url?: string | null
          rejection_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          template_media_signed_url?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contact_list_id?: string | null
          contact_list_signed_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          profile_customization?: Json
          profile_photo_signed_url?: string | null
          rejection_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          template_media_signed_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          invalid_contacts: number
          organization_id: string
          status: Database["public"]["Enums"]["contact_list_status"]
          storage_path: string | null
          total_contacts: number
          updated_at: string
          valid_contacts: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          invalid_contacts?: number
          organization_id: string
          status?: Database["public"]["Enums"]["contact_list_status"]
          storage_path?: string | null
          total_contacts?: number
          updated_at?: string
          valid_contacts?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          invalid_contacts?: number
          organization_id?: string
          status?: Database["public"]["Enums"]["contact_list_status"]
          storage_path?: string | null
          total_contacts?: number
          updated_at?: string
          valid_contacts?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_variations: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_variations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body_text: string
          buttons: Json
          created_at: string
          created_by: string | null
          footer_text: string | null
          id: string
          is_default: boolean
          language: string
          media_path: string | null
          media_type: Database["public"]["Enums"]["template_media_type"]
          name: string
          organization_id: string
          updated_at: string
          use_variations: boolean
          variables: Json
        }
        Insert: {
          body_text: string
          buttons?: Json
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          id?: string
          is_default?: boolean
          language?: string
          media_path?: string | null
          media_type?: Database["public"]["Enums"]["template_media_type"]
          name: string
          organization_id: string
          updated_at?: string
          use_variations?: boolean
          variables?: Json
        }
        Update: {
          body_text?: string
          buttons?: Json
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          id?: string
          is_default?: boolean
          language?: string
          media_path?: string | null
          media_type?: Database["public"]["Enums"]["template_media_type"]
          name?: string
          organization_id?: string
          updated_at?: string
          use_variations?: boolean
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          created_at: string
          created_by: string | null
          event: string
          hmac_secret: string
          id: string
          is_active: boolean
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event: string
          hmac_secret: string
          id?: string
          is_active?: boolean
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event?: string
          hmac_secret?: string
          id?: string
          is_active?: boolean
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          campaign_id: string | null
          created_at: string
          event: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: Database["public"]["Enums"]["webhook_delivery_status"]
          target_url: string
          updated_at: string
          webhook_config_id: string | null
        }
        Insert: {
          attempts?: number
          campaign_id?: string | null
          created_at?: string
          event: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          target_url: string
          updated_at?: string
          webhook_config_id?: string | null
        }
        Update: {
          attempts?: number
          campaign_id?: string | null
          created_at?: string
          event?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          target_url?: string
          updated_at?: string
          webhook_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_config_id_fkey"
            columns: ["webhook_config_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_profile_org: { Args: never; Returns: string }
      current_profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "cliente"
      campaign_status:
        | "rascunho"
        | "aguardando_aprovacao"
        | "aprovado"
        | "rejeitado"
        | "liberado"
        | "enviando"
        | "concluido"
        | "falha"
      contact_list_status: "pending" | "validating" | "validated" | "failed"
      report_origin: "manual" | "automatico"
      template_media_type: "none" | "image" | "video" | "text"
      webhook_delivery_status: "pendente" | "entregue" | "falhou" | "retentando"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["superadmin", "admin", "cliente"],
      campaign_status: [
        "rascunho",
        "aguardando_aprovacao",
        "aprovado",
        "rejeitado",
        "liberado",
        "enviando",
        "concluido",
        "falha",
      ],
      contact_list_status: ["pending", "validating", "validated", "failed"],
      report_origin: ["manual", "automatico"],
      template_media_type: ["none", "image", "video", "text"],
      webhook_delivery_status: ["pendente", "entregue", "falhou", "retentando"],
    },
  },
} as const
