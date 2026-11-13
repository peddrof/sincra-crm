// Gerado a partir do projeto remoto sincra-plataforma-dev (ailthwmnfzilabdcoxav). Não editar à mão.
// Para regerar: npx supabase gen types typescript --project-id ailthwmnfzilabdcoxav --schema public > lib/supabase/database.types.ts

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
      activity_events: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          area: Database["public"]["Enums"]["event_area"]
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          mentions: string[]
          organization_id: string | null
          payload: Json
          summary: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          area?: Database["public"]["Enums"]["event_area"]
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          mentions?: string[]
          organization_id?: string | null
          payload?: Json
          summary: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          area?: Database["public"]["Enums"]["event_area"]
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          mentions?: string[]
          organization_id?: string | null
          payload?: Json
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signers: {
        Row: {
          contract_id: string
          email: string | null
          id: string
          name: string
          person_id: string | null
          phone: string | null
          profile_id: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["signer_status"]
        }
        Insert: {
          contract_id: string
          email?: string | null
          id?: string
          name: string
          person_id?: string | null
          phone?: string | null
          profile_id?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signer_status"]
        }
        Update: {
          contract_id?: string
          email?: string | null
          id?: string
          name?: string
          person_id?: string | null
          phone?: string | null
          profile_id?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_signers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signers_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean
          base_file_path: string
          created_at: string
          id: string
          kind: string
          legal_reviewed: boolean
          legal_reviewed_note: string | null
          name: string
          signing_mode: Database["public"]["Enums"]["signing_mode"]
          variables: Json
          version: number
        }
        Insert: {
          active?: boolean
          base_file_path: string
          created_at?: string
          id?: string
          kind: string
          legal_reviewed?: boolean
          legal_reviewed_note?: string | null
          name: string
          signing_mode: Database["public"]["Enums"]["signing_mode"]
          variables?: Json
          version?: number
        }
        Update: {
          active?: boolean
          base_file_path?: string
          created_at?: string
          id?: string
          kind?: string
          legal_reviewed?: boolean
          legal_reviewed_note?: string | null
          name?: string
          signing_mode?: Database["public"]["Enums"]["signing_mode"]
          variables?: Json
          version?: number
        }
        Relationships: []
      }
      contracts: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          generated_at: string | null
          id: string
          organization_id: string
          pdf_document_id: string | null
          signed_at: string | null
          signed_document_id: string | null
          signed_uploaded_by: string | null
          signer_check_override_by: string | null
          status: Database["public"]["Enums"]["contract_status"]
          template_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          generated_at?: string | null
          id?: string
          organization_id: string
          pdf_document_id?: string | null
          signed_at?: string | null
          signed_document_id?: string | null
          signed_uploaded_by?: string | null
          signer_check_override_by?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          generated_at?: string | null
          id?: string
          organization_id?: string
          pdf_document_id?: string | null
          signed_at?: string | null
          signed_document_id?: string | null
          signed_uploaded_by?: string | null
          signer_check_override_by?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contracts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_pdf_document_id_fkey"
            columns: ["pdf_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_signed_document_id_fkey"
            columns: ["signed_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_signed_uploaded_by_fkey"
            columns: ["signed_uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_signer_check_override_by_fkey"
            columns: ["signer_check_override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_people: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string
          papel: string | null
          person_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id: string
          papel?: string | null
          person_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string
          papel?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_people_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount_estimate_cents: number | null
          created_at: string
          created_by: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          organization_id: string
          owner_id: string | null
          pipeline_id: string
          rate_percent: number | null
          stage_changed_at: string
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          amount_estimate_cents?: number | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          owner_id?: string | null
          pipeline_id: string
          rate_percent?: number | null
          stage_changed_at?: string
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          amount_estimate_cents?: number | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          owner_id?: string | null
          pipeline_id?: string
          rate_percent?: number | null
          stage_changed_at?: string
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          deal_id: string | null
          decided_at: string
          decided_by: string | null
          description: string
          id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          decided_at?: string
          decided_by?: string | null
          description: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          decided_at?: string
          decided_by?: string | null
          description?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_checklist_items: {
        Row: {
          checklist_id: string
          description: string | null
          id: string
          position: number
          required: boolean
          title: string
        }
        Insert: {
          checklist_id: string
          description?: string | null
          id?: string
          position: number
          required?: boolean
          title: string
        }
        Update: {
          checklist_id?: string
          description?: string | null
          id?: string
          position?: number
          required?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "document_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      document_checklists: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_type:
            | Database["public"]["Enums"]["organization_type"]
            | null
          link_formulario: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          link_formulario?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          link_formulario?: string | null
        }
        Relationships: []
      }
      document_request_items: {
        Row: {
          description: string | null
          document_id: string | null
          id: string
          position: number
          request_id: string
          required: boolean
          reviewed_by: string | null
          reviewer_comment: string | null
          status: Database["public"]["Enums"]["doc_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          document_id?: string | null
          id?: string
          position: number
          request_id: string
          required?: boolean
          reviewed_by?: string | null
          reviewer_comment?: string | null
          status?: Database["public"]["Enums"]["doc_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          document_id?: string | null
          id?: string
          position?: number
          request_id?: string
          required?: boolean
          reviewed_by?: string | null
          reviewer_comment?: string | null
          status?: Database["public"]["Enums"]["doc_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_request_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_request_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          checklist_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          name: string | null
          organization_id: string
          link_formulario: string | null
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          name?: string | null
          organization_id: string
          link_formulario?: string | null
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          name?: string | null
          organization_id?: string
          link_formulario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "document_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          deal_id: string | null
          drive_file_id: string | null
          id: string
          mime_type: string | null
          organization_id: string | null
          size_bytes: number | null
          storage_path: string | null
          title: string
          uploaded_by: string | null
          uploaded_by_actor: Database["public"]["Enums"]["actor_type"]
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          drive_file_id?: string | null
          id?: string
          mime_type?: string | null
          organization_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          title: string
          uploaded_by?: string | null
          uploaded_by_actor?: Database["public"]["Enums"]["actor_type"]
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          drive_file_id?: string | null
          id?: string
          mime_type?: string | null
          organization_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          title?: string
          uploaded_by?: string | null
          uploaded_by_actor?: Database["public"]["Enums"]["actor_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_deal_fk"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          event_id: string
          id: string
          editado_em: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          event_id: string
          id?: string
          editado_em?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          editado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "activity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reactions: {
        Row: {
          created_at: string
          emoji: string
          event_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          event_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          event_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "activity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reads: {
        Row: {
          event_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          event_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          event_id?: string
          profile_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "activity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_google: {
        Row: {
          conectado_em: string
          conectado_por: string | null
          email: string
          escopos: string
          id: number
          refresh_token_cifrado: string
        }
        Insert: {
          conectado_em?: string
          conectado_por?: string | null
          email: string
          escopos: string
          id?: number
          refresh_token_cifrado: string
        }
        Update: {
          conectado_em?: string
          conectado_por?: string | null
          email?: string
          escopos?: string
          id?: number
          refresh_token_cifrado?: string
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_google_conectado_por_fkey"
            columns: ["conectado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          calendar_event_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          drive_file_id: string | null
          error: string | null
          extraction: Json | null
          id: string
          occurred_at: string
          organization_id: string | null
          status: string
          summary: string | null
          title: string | null
          transcript_document_id: string | null
          type: Database["public"]["Enums"]["interaction_type"]
          contexto: string
          duracao_minutos: number | null
          local: string | null
          participantes: string[]
        }
        Insert: {
          calendar_event_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          drive_file_id?: string | null
          error?: string | null
          extraction?: Json | null
          id?: string
          occurred_at?: string
          organization_id?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          transcript_document_id?: string | null
          type: Database["public"]["Enums"]["interaction_type"]
          contexto?: string
          duracao_minutos?: number | null
          local?: string | null
          participantes?: string[]
        }
        Update: {
          calendar_event_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          drive_file_id?: string | null
          error?: string | null
          extraction?: Json | null
          id?: string
          occurred_at?: string
          organization_id?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          transcript_document_id?: string | null
          type?: Database["public"]["Enums"]["interaction_type"]
          contexto?: string
          duracao_minutos?: number | null
          local?: string | null
          participantes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_transcript_document_id_fkey"
            columns: ["transcript_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          event_type: string
          profile_id: string
          push: boolean
        }
        Insert: {
          event_type: string
          profile_id: string
          push?: boolean
        }
        Update: {
          event_type?: string
          profile_id?: string
          push?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          drive_folder_id: string | null
          id: string
          legal_name: string | null
          notes: string | null
          owner_id: string | null
          state: string | null
          trade_name: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          drive_folder_id?: string | null
          id?: string
          legal_name?: string | null
          notes?: string | null
          owner_id?: string | null
          state?: string | null
          trade_name: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          drive_folder_id?: string | null
          id?: string
          legal_name?: string | null
          notes?: string | null
          owner_id?: string | null
          state?: string | null
          trade_name?: string
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          can_sign: boolean
          created_at: string
          created_by: string | null
          crm_number: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          role_title: string | null
          signing_evidence_document_id: string | null
          updated_at: string
          relacao_tipo: string | null
          profundidade: number | null
          situacao: string | null
          prioridade: number | null
          ultima_interacao: string | null
          confirmacao_pendente: boolean
          motivo_classificacao: string | null
          proximo_passo: string | null
          canal_contato: string | null
          fontes: string | null
          cidade: string | null
          uf: string | null
          natureza_local: string | null
        }
        Insert: {
          can_sign?: boolean
          created_at?: string
          created_by?: string | null
          crm_number?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role_title?: string | null
          signing_evidence_document_id?: string | null
          updated_at?: string
          relacao_tipo?: string | null
          profundidade?: number | null
          situacao?: string | null
          prioridade?: number | null
          ultima_interacao?: string | null
          confirmacao_pendente?: boolean
          motivo_classificacao?: string | null
          proximo_passo?: string | null
          canal_contato?: string | null
          fontes?: string | null
          cidade?: string | null
          uf?: string | null
          natureza_local?: string | null
        }
        Update: {
          can_sign?: boolean
          created_at?: string
          created_by?: string | null
          crm_number?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role_title?: string | null
          signing_evidence_document_id?: string | null
          updated_at?: string
          relacao_tipo?: string | null
          profundidade?: number | null
          situacao?: string | null
          prioridade?: number | null
          ultima_interacao?: string | null
          confirmacao_pendente?: boolean
          motivo_classificacao?: string | null
          proximo_passo?: string | null
          canal_contato?: string | null
          fontes?: string | null
          cidade?: string | null
          uf?: string | null
          natureza_local?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_signing_evidence_document_id_fkey"
            columns: ["signing_evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_organizacoes: {
        Row: {
          created_at: string
          created_by: string | null
          organization_id: string
          papel: string | null
          person_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          organization_id: string
          papel?: string | null
          person_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          organization_id?: string
          papel?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_organizacoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_organizacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_organizacoes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          id: string
          is_closed: boolean
          key: string
          name: string
          pipeline_id: string
          position: number
        }
        Insert: {
          id?: string
          is_closed?: boolean
          key: string
          name: string
          pipeline_id: string
          position: number
        }
        Update: {
          id?: string
          is_closed?: boolean
          key?: string
          name?: string
          pipeline_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          id: string
          key: string
          name: string
          position: number
        }
        Insert: {
          id?: string
          key: string
          name: string
          position?: number
        }
        Update: {
          id?: string
          key?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          main_area: Database["public"]["Enums"]["event_area"] | null
          nickname: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          main_area?: Database["public"]["Enums"]["event_area"] | null
          nickname?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          main_area?: Database["public"]["Enums"]["event_area"] | null
          nickname?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feed_eventos: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"] | null
          area: Database["public"]["Enums"]["event_area"] | null
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string | null
          lido: boolean | null
          me_menciona: boolean | null
          mentions: string[] | null
          organization_id: string | null
          payload: Json | null
          summary: string | null
          total_comentarios: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alertas_followup: {
        Args: never
        Returns: {
          area: Database["public"]["Enums"]["event_area"]
          dias: number
          entidade: string
          entidade_id: string
          organizacao_id: string
          responsavel: string
          resumo: string
          tipo: string
        }[]
      }
    }
    Enums: {
      actor_type: "user" | "system" | "github"
      contract_status:
        | "rascunho"
        | "em_revisao"
        | "aprovado"
        | "gerado"
        | "assinado"
        | "recusado"
        | "cancelado"
      deal_status: "aberto" | "ganho" | "perdido"
      doc_item_status: "pendente" | "recebido" | "aprovado" | "rejeitado"
      event_area: "comercial" | "produto" | "fundo" | "operacao" | "geral"
      interaction_type:
        | "reuniao"
        | "ligacao"
        | "email"
        | "nota"
        | "instagram"
        | "whatsapp"
      organization_type:
        | "hospital"
        | "clinica"
        | "operadora"
        | "fundo"
        | "medico"
        | "outro"
      signer_status: "pendente" | "assinado" | "recusado"
      signing_mode: "direto" | "revisao"
      task_status: "aberta" | "concluida" | "cancelada"
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
      actor_type: ["user", "system", "github"],
      contract_status: [
        "rascunho",
        "em_revisao",
        "aprovado",
        "gerado",
        "assinado",
        "recusado",
        "cancelado",
      ],
      deal_status: ["aberto", "ganho", "perdido"],
      doc_item_status: ["pendente", "recebido", "aprovado", "rejeitado"],
      event_area: ["comercial", "produto", "fundo", "operacao", "geral"],
      interaction_type: [
        "reuniao",
        "ligacao",
        "email",
        "nota",
        "instagram",
        "whatsapp",
      ],
      organization_type: ["hospital", "clinica", "operadora", "fundo", "medico", "outro"],
      signer_status: ["pendente", "assinado", "recusado"],
      signing_mode: ["direto", "revisao"],
      task_status: ["aberta", "concluida", "cancelada"],
    },
  },
} as const
