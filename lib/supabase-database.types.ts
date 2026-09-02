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
      studio_action_requests: {
        Row: {
          action: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          environment: string
          id: string
          idempotency_key: string
          request_payload: Json
          requested_by: string
          result_code: string | null
          result_summary: string | null
          started_at: string | null
          status: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Insert: {
          action: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          environment: string
          id?: string
          idempotency_key: string
          request_payload?: Json
          requested_by?: string
          result_code?: string | null
          result_summary?: string | null
          started_at?: string | null
          status?: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Update: {
          action?: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          environment?: string
          id?: string
          idempotency_key?: string
          request_payload?: Json
          requested_by?: string
          result_code?: string | null
          result_summary?: string | null
          started_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_action_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_ai_models: {
        Row: {
          artifact_reference: string | null
          confidentiality_class: string
          context_window: number | null
          created_at: string
          created_by: string
          desired_state: string
          display_name: string
          health_status: string
          hosting_mode: string
          id: string
          last_checked_at: string | null
          modalities: string[]
          model_identifier: string
          model_version: string
          observed_state: string
          provider_id: string
          resource_requirements: Json
          resource_version: number
          runtime: string | null
          supports_tools: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          artifact_reference?: string | null
          confidentiality_class?: string
          context_window?: number | null
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name: string
          health_status?: string
          hosting_mode: string
          id?: string
          last_checked_at?: string | null
          modalities?: string[]
          model_identifier: string
          model_version?: string
          observed_state?: string
          provider_id: string
          resource_requirements?: Json
          resource_version?: number
          runtime?: string | null
          supports_tools?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          artifact_reference?: string | null
          confidentiality_class?: string
          context_window?: number | null
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name?: string
          health_status?: string
          hosting_mode?: string
          id?: string
          last_checked_at?: string | null
          modalities?: string[]
          model_identifier?: string
          model_version?: string
          observed_state?: string
          provider_id?: string
          resource_requirements?: Json
          resource_version?: number
          runtime?: string | null
          supports_tools?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "studio_ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_ai_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_model_provider_same_workspace_fkey"
            columns: ["workspace_id", "provider_id"]
            isOneToOne: false
            referencedRelation: "studio_ai_providers"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      studio_ai_providers: {
        Row: {
          configuration: Json
          connector_binding_id: string | null
          created_at: string
          created_by: string
          desired_state: string
          display_name: string
          endpoint_url: string | null
          health_status: string
          hosting_mode: string
          id: string
          last_checked_at: string | null
          observed_state: string
          provider_kind: string
          resource_version: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          configuration?: Json
          connector_binding_id?: string | null
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name: string
          endpoint_url?: string | null
          health_status?: string
          hosting_mode: string
          id?: string
          last_checked_at?: string | null
          observed_state?: string
          provider_kind: string
          resource_version?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          configuration?: Json
          connector_binding_id?: string | null
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name?: string
          endpoint_url?: string | null
          health_status?: string
          hosting_mode?: string
          id?: string
          last_checked_at?: string | null
          observed_state?: string
          provider_kind?: string
          resource_version?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_ai_providers_connector_binding_id_fkey"
            columns: ["connector_binding_id"]
            isOneToOne: false
            referencedRelation: "studio_connector_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_ai_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_provider_connector_same_workspace_fkey"
            columns: ["workspace_id", "connector_binding_id"]
            isOneToOne: false
            referencedRelation: "studio_connector_bindings"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      studio_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          correlation_id: string
          created_at: string
          environment: string | null
          id: string
          metadata: Json
          result: string
          target_id: string | null
          target_type: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          correlation_id?: string
          created_at?: string
          environment?: string | null
          id?: string
          metadata?: Json
          result: string
          target_id?: string | null
          target_type: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          correlation_id?: string
          created_at?: string
          environment?: string | null
          id?: string
          metadata?: Json
          result?: string
          target_id?: string | null
          target_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_connection_checks: {
        Row: {
          action_request_id: string | null
          checked_at: string
          correlation_id: string
          id: string
          latency_ms: number | null
          result_code: string
          status: string
          summary: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Insert: {
          action_request_id?: string | null
          checked_at?: string
          correlation_id: string
          id?: string
          latency_ms?: number | null
          result_code: string
          status: string
          summary: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Update: {
          action_request_id?: string | null
          checked_at?: string
          correlation_id?: string
          id?: string
          latency_ms?: number | null
          result_code?: string
          status?: string
          summary?: string
          target_id?: string
          target_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_connection_checks_action_request_id_fkey"
            columns: ["action_request_id"]
            isOneToOne: false
            referencedRelation: "studio_action_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_connection_checks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_connector_bindings: {
        Row: {
          adapter_version: string | null
          capabilities: string[]
          configuration: Json
          connector_kind: string
          created_at: string
          created_by: string
          desired_state: string
          display_name: string
          endpoint_url: string | null
          environment: string
          health_status: string
          id: string
          last_checked_at: string | null
          last_error_code: string | null
          observed_state: string
          protocol: string
          required_scopes: string[]
          resource_version: number
          secret_reference_id: string | null
          updated_at: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          adapter_version?: string | null
          capabilities?: string[]
          configuration?: Json
          connector_kind: string
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name: string
          endpoint_url?: string | null
          environment: string
          health_status?: string
          id?: string
          last_checked_at?: string | null
          last_error_code?: string | null
          observed_state?: string
          protocol: string
          required_scopes?: string[]
          resource_version?: number
          secret_reference_id?: string | null
          updated_at?: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          adapter_version?: string | null
          capabilities?: string[]
          configuration?: Json
          connector_kind?: string
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name?: string
          endpoint_url?: string | null
          environment?: string
          health_status?: string
          id?: string
          last_checked_at?: string | null
          last_error_code?: string | null
          observed_state?: string
          protocol?: string
          required_scopes?: string[]
          resource_version?: number
          secret_reference_id?: string | null
          updated_at?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_connector_bindings_secret_reference_id_fkey"
            columns: ["secret_reference_id"]
            isOneToOne: false
            referencedRelation: "studio_secret_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_connector_bindings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_connector_secret_same_workspace_fkey"
            columns: ["workspace_id", "secret_reference_id"]
            isOneToOne: false
            referencedRelation: "studio_secret_references"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      studio_hosting_targets: {
        Row: {
          connector_binding_id: string | null
          created_at: string
          created_by: string
          desired_state: string
          display_name: string
          endpoint_url: string | null
          environment: string
          health_status: string
          id: string
          labels: Json
          last_checked_at: string | null
          observed_state: string
          provider: string
          region: string | null
          resource_version: number
          target_kind: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connector_binding_id?: string | null
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name: string
          endpoint_url?: string | null
          environment: string
          health_status?: string
          id?: string
          labels?: Json
          last_checked_at?: string | null
          observed_state?: string
          provider: string
          region?: string | null
          resource_version?: number
          target_kind: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connector_binding_id?: string | null
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name?: string
          endpoint_url?: string | null
          environment?: string
          health_status?: string
          id?: string
          labels?: Json
          last_checked_at?: string | null
          observed_state?: string
          provider?: string
          region?: string | null
          resource_version?: number
          target_kind?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_hosting_connector_same_workspace_fkey"
            columns: ["workspace_id", "connector_binding_id"]
            isOneToOne: false
            referencedRelation: "studio_connector_bindings"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "studio_hosting_targets_connector_binding_id_fkey"
            columns: ["connector_binding_id"]
            isOneToOne: false
            referencedRelation: "studio_connector_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_hosting_targets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_model_deployments: {
        Row: {
          created_at: string
          created_by: string
          desired_state: string
          display_name: string
          health_status: string
          id: string
          last_checked_at: string | null
          model_id: string
          observed_state: string
          resource_version: number
          runtime_configuration: Json
          updated_at: string
          worker_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name: string
          health_status?: string
          id?: string
          last_checked_at?: string | null
          model_id: string
          observed_state?: string
          resource_version?: number
          runtime_configuration?: Json
          updated_at?: string
          worker_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name?: string
          health_status?: string
          id?: string
          last_checked_at?: string | null
          model_id?: string
          observed_state?: string
          resource_version?: number
          runtime_configuration?: Json
          updated_at?: string
          worker_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_deployment_model_same_workspace_fkey"
            columns: ["workspace_id", "model_id"]
            isOneToOne: false
            referencedRelation: "studio_ai_models"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "studio_deployment_worker_same_workspace_fkey"
            columns: ["workspace_id", "worker_id"]
            isOneToOne: false
            referencedRelation: "studio_workers"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "studio_model_deployments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "studio_ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_model_deployments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "studio_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_model_deployments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_platform_settings: {
        Row: {
          created_at: string
          default_environment: string
          max_action_retries: number
          max_monthly_cost_usd: number | null
          operating_mode: string
          require_internal_for_confidential: boolean
          require_production_approval: boolean
          resource_version: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_environment?: string
          max_action_retries?: number
          max_monthly_cost_usd?: number | null
          operating_mode?: string
          require_internal_for_confidential?: boolean
          require_production_approval?: boolean
          resource_version?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_environment?: string
          max_action_retries?: number
          max_monthly_cost_usd?: number | null
          operating_mode?: string
          require_internal_for_confidential?: boolean
          require_production_approval?: boolean
          resource_version?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_platform_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_routing_policies: {
        Row: {
          allow_external_fallback: boolean
          confidentiality_rule: string
          created_at: string
          created_by: string
          display_name: string
          enabled: boolean
          fallback_model_ids: string[]
          id: string
          max_cost_usd_per_request: number | null
          minimum_free_vram_mb: number | null
          operating_mode: string
          preferred_model_ids: string[]
          priority_order: string[]
          require_fallback_confirmation: boolean
          required_modalities: string[]
          resource_version: number
          target_latency_ms: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_external_fallback?: boolean
          confidentiality_rule?: string
          created_at?: string
          created_by?: string
          display_name: string
          enabled?: boolean
          fallback_model_ids?: string[]
          id?: string
          max_cost_usd_per_request?: number | null
          minimum_free_vram_mb?: number | null
          operating_mode: string
          preferred_model_ids?: string[]
          priority_order?: string[]
          require_fallback_confirmation?: boolean
          required_modalities?: string[]
          resource_version?: number
          target_latency_ms?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_external_fallback?: boolean
          confidentiality_rule?: string
          created_at?: string
          created_by?: string
          display_name?: string
          enabled?: boolean
          fallback_model_ids?: string[]
          id?: string
          max_cost_usd_per_request?: number | null
          minimum_free_vram_mb?: number | null
          operating_mode?: string
          preferred_model_ids?: string[]
          priority_order?: string[]
          require_fallback_confirmation?: boolean
          required_modalities?: string[]
          resource_version?: number
          target_latency_ms?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_routing_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_secret_references: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          environment: string
          external_reference: string
          id: string
          last_rotated_at: string | null
          resource_version: number
          scope: string[]
          status: string
          updated_at: string
          vault_provider: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          display_name: string
          environment: string
          external_reference: string
          id?: string
          last_rotated_at?: string | null
          resource_version?: number
          scope?: string[]
          status?: string
          updated_at?: string
          vault_provider: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          environment?: string
          external_reference?: string
          id?: string
          last_rotated_at?: string | null
          resource_version?: number
          scope?: string[]
          status?: string
          updated_at?: string
          vault_provider?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_secret_references_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_workers: {
        Row: {
          agent_version: string | null
          capabilities: string[]
          capacity: Json
          created_at: string
          created_by: string
          desired_state: string
          display_name: string
          endpoint_url: string | null
          environment: string
          health_status: string
          hosting_target_id: string | null
          id: string
          last_heartbeat_at: string | null
          observed_state: string
          observed_usage: Json
          resource_version: number
          updated_at: string
          worker_kind: string
          workspace_id: string
        }
        Insert: {
          agent_version?: string | null
          capabilities?: string[]
          capacity?: Json
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name: string
          endpoint_url?: string | null
          environment: string
          health_status?: string
          hosting_target_id?: string | null
          id?: string
          last_heartbeat_at?: string | null
          observed_state?: string
          observed_usage?: Json
          resource_version?: number
          updated_at?: string
          worker_kind: string
          workspace_id: string
        }
        Update: {
          agent_version?: string | null
          capabilities?: string[]
          capacity?: Json
          created_at?: string
          created_by?: string
          desired_state?: string
          display_name?: string
          endpoint_url?: string | null
          environment?: string
          health_status?: string
          hosting_target_id?: string | null
          id?: string
          last_heartbeat_at?: string | null
          observed_state?: string
          observed_usage?: Json
          resource_version?: number
          updated_at?: string
          worker_kind?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_worker_target_same_workspace_fkey"
            columns: ["workspace_id", "hosting_target_id"]
            isOneToOne: false
            referencedRelation: "studio_hosting_targets"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "studio_workers_hosting_target_id_fkey"
            columns: ["hosting_target_id"]
            isOneToOne: false
            referencedRelation: "studio_hosting_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_workers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_workspace_members: {
        Row: {
          created_at: string
          created_by: string
          resource_version: number
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          resource_version?: number
          role: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          resource_version?: number
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studio_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          resource_version: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          resource_version?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          resource_version?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      studio_create_workspace: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      studio_request_transition: {
        Args: {
          p_action: string
          p_desired_state: string
          p_environment: string
          p_idempotency_key: string
          p_resource_version: number
          p_target_id: string
          p_target_type: string
          p_workspace_id: string
        }
        Returns: string
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
