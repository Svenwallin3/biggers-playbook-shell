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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assignable_module_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          employee_id: string
          id: string
          is_deleted: boolean
          module_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          is_deleted?: boolean
          module_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          is_deleted?: boolean
          module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignable_module_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignable_module_assignments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignable_module_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignable_module_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_instances: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          instance_date: string
          is_deleted: boolean
          location_tag: string | null
          reference_document_id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          instance_date: string
          is_deleted?: boolean
          location_tag?: string | null
          reference_document_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          instance_date?: string
          is_deleted?: boolean
          location_tag?: string | null
          reference_document_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_instances_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_instances_reference_document_id_fkey"
            columns: ["reference_document_id"]
            isOneToOne: false
            referencedRelation: "reference_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_instances_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_line_completions: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          instance_id: string
          line_order: number
          section_index: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id: string
          line_order: number
          section_index: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          line_order?: number
          section_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_line_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_line_completions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "checklist_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_issues: {
        Row: {
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          issue_description: string
          photo_url: string | null
          photo_url_2: string | null
          product_vendor: string
          reported_by: string | null
          resolved_at: string | null
          status: string
          truck_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          issue_description: string
          photo_url?: string | null
          photo_url_2?: string | null
          product_vendor: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: string
          truck_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          issue_description?: string
          photo_url?: string | null
          photo_url_2?: string | null
          product_vendor?: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: string
          truck_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_issues_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          auth_tier: Database["public"]["Enums"]["auth_tier"]
          can_manage_team: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          department_scope: Database["public"]["Enums"]["department"] | null
          email: string
          full_name: string | null
          id: string
          is_deleted: boolean
          location_id: string | null
          merged_into: string | null
          path: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth_tier?: Database["public"]["Enums"]["auth_tier"]
          can_manage_team?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_scope?: Database["public"]["Enums"]["department"] | null
          email: string
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          location_id?: string | null
          merged_into?: string | null
          path?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth_tier?: Database["public"]["Enums"]["auth_tier"]
          can_manage_team?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_scope?: Database["public"]["Enums"]["department"] | null
          email?: string
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          location_id?: string | null
          merged_into?: string | null
          path?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      huddle_cards: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          departments: string[]
          id: string
          is_deleted: boolean
          manager_tip: string
          sequence_order: number
          standard_text: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          departments?: string[]
          id?: string
          is_deleted?: boolean
          manager_tip: string
          sequence_order?: number
          standard_text: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          departments?: string[]
          id?: string
          is_deleted?: boolean
          manager_tip?: string
          sequence_order?: number
          standard_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "huddle_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huddle_cards_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_notes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          departments: string[]
          effective_date: string
          id: string
          is_deleted: boolean
          location_tag: string | null
          note_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          departments?: string[]
          effective_date: string
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          note_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          departments?: string[]
          effective_date?: string
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_notes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          day_assignment: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_assignable: boolean
          is_deleted: boolean
          location_tag: string | null
          name: string
          sequence_order: number
          slug: string
          sub_path: string | null
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_assignment?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_assignable?: boolean
          is_deleted?: boolean
          location_tag?: string | null
          name: string
          sequence_order?: number
          slug: string
          sub_path?: string | null
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_assignment?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_assignable?: boolean
          is_deleted?: boolean
          location_tag?: string | null
          name?: string
          sequence_order?: number
          slug?: string
          sub_path?: string | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_reference_entries: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          id: string
          is_deleted: boolean
          item_name: string
          location_tag: string | null
          photo_url: string | null
          portion_note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          id?: string
          is_deleted?: boolean
          item_name: string
          location_tag?: string | null
          photo_url?: string | null
          portion_note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          id?: string
          is_deleted?: boolean
          item_name?: string
          location_tag?: string | null
          photo_url?: string | null
          portion_note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentation_reference_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentation_reference_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_records: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          signed_off_at: string | null
          signed_off_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          step_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          step_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempted_at: string
          chosen_option: number | null
          created_at: string
          employee_id: string
          id: string
          is_correct: boolean | null
          quiz_id: string
          updated_at: string
        }
        Insert: {
          attempted_at?: string
          chosen_option?: number | null
          created_at?: string
          employee_id: string
          id?: string
          is_correct?: boolean | null
          quiz_id: string
          updated_at?: string
        }
        Update: {
          attempted_at?: string
          chosen_option?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          is_correct?: boolean | null
          quiz_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_bank: {
        Row: {
          correct_option: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          explanation: string | null
          id: string
          is_deleted: boolean
          options: Json
          question: string
          sequence_order: number
          step_id: string
          updated_at: string
        }
        Insert: {
          correct_option?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean
          options?: Json
          question: string
          sequence_order?: number
          step_id: string
          updated_at?: string
        }
        Update: {
          correct_option?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          explanation?: string | null
          id?: string
          is_deleted?: boolean
          options?: Json
          question?: string
          sequence_order?: number
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_bank_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_bank_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_documents: {
        Row: {
          content_notes: string | null
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          departments: string[]
          document_type: Database["public"]["Enums"]["reference_document_type"]
          id: string
          is_deleted: boolean
          location_tag: string | null
          sections: Json
          sub_category: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_notes?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          departments?: string[]
          document_type: Database["public"]["Enums"]["reference_document_type"]
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          sections?: Json
          sub_category?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_notes?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          departments?: string[]
          document_type?: Database["public"]["Enums"]["reference_document_type"]
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          sections?: Json
          sub_category?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_board_delete_requests: {
        Row: {
          entry_id: string
          id: string
          product_snapshot: string
          reason: string | null
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          entry_id: string
          id?: string
          product_snapshot: string
          reason?: string | null
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          entry_id?: string
          id?: string
          product_snapshot?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_board_delete_requests_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "sourcing_board_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_board_delete_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_board_delete_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_board_entries: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          location_tag: string | null
          notes: string | null
          photo_url: string | null
          product: string
          region: string | null
          seasonality: string | null
          since_date: string | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          notes?: string | null
          photo_url?: string | null
          product: string
          region?: string | null
          seasonality?: string | null
          since_date?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          notes?: string | null
          photo_url?: string | null
          product?: string
          region?: string | null
          seasonality?: string | null
          since_date?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_board_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          content_body: string | null
          content_notes: string | null
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          location_tag: string | null
          media_url: string | null
          module_id: string
          sequence_order: number
          step_type: Database["public"]["Enums"]["step_type"]
          supports_manager_initials: boolean
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_body?: string | null
          content_notes?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          media_url?: string | null
          module_id: string
          sequence_order?: number
          step_type?: Database["public"]["Enums"]["step_type"]
          supports_manager_initials?: boolean
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_body?: string | null
          content_notes?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          media_url?: string | null
          module_id?: string
          sequence_order?: number
          step_type?: Database["public"]["Enums"]["step_type"]
          supports_manager_initials?: boolean
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_queue: {
        Row: {
          created_at: string
          decision_notes: string | null
          field_how: string | null
          field_how_you_know: string | null
          field_what: string
          id: string
          module_id: string | null
          reference_document_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          step_id: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_notes?: string | null
          field_how?: string | null
          field_how_you_know?: string | null
          field_what: string
          id?: string
          module_id?: string | null
          reference_document_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          step_id?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_notes?: string | null
          field_how?: string | null
          field_how_you_know?: string | null
          field_what?: string
          id?: string
          module_id?: string | null
          reference_document_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          step_id?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_queue_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_queue_reference_document_id_fkey"
            columns: ["reference_document_id"]
            isOneToOne: false
            referencedRelation: "reference_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_queue_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_queue_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          department: Database["public"]["Enums"]["department"]
          description: string | null
          id: string
          is_deleted: boolean
          location_tag: string | null
          name: string
          sequence_order: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department: Database["public"]["Enums"]["department"]
          description?: string | null
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          name: string
          sequence_order?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          id?: string
          is_deleted?: boolean
          location_tag?: string | null
          name?: string
          sequence_order?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      version_history: {
        Row: {
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          snapshot: Json
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_progress_for: {
        Args: { _employee_id: string; _step_id: string }
        Returns: boolean
      }
      current_tier: {
        Args: never
        Returns: Database["public"]["Enums"]["auth_tier"]
      }
      has_tier: {
        Args: { _tier: Database["public"]["Enums"]["auth_tier"] }
        Returns: boolean
      }
      is_gm: { Args: never; Returns: boolean }
      is_manager_or_owner: { Args: never; Returns: boolean }
      merge_employees: {
        Args: { _duplicate: string; _primary: string }
        Returns: undefined
      }
      my_department: {
        Args: never
        Returns: Database["public"]["Enums"]["department"]
      }
      my_location: { Args: never; Returns: string }
    }
    Enums: {
      auth_tier: "staff" | "manager" | "owner"
      content_status: "ready" | "needs_restructuring" | "missing" | "blocked"
      department: "universal" | "market" | "kitchen" | "delivery"
      employee_status: "active" | "inactive" | "merged"
      progress_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "signed_off"
      reference_document_type: "checklist" | "sop"
      step_type:
        | "text"
        | "photo"
        | "video"
        | "quiz"
        | "doing_signoff"
        | "supervised_live_practice"
      suggestion_status: "pending" | "approved" | "rejected"
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
    Enums: {
      auth_tier: ["staff", "manager", "owner"],
      content_status: ["ready", "needs_restructuring", "missing", "blocked"],
      department: ["universal", "market", "kitchen", "delivery"],
      employee_status: ["active", "inactive", "merged"],
      progress_status: [
        "not_started",
        "in_progress",
        "completed",
        "signed_off",
      ],
      reference_document_type: ["checklist", "sop"],
      step_type: [
        "text",
        "photo",
        "video",
        "quiz",
        "doing_signoff",
        "supervised_live_practice",
      ],
      suggestion_status: ["pending", "approved", "rejected"],
    },
  },
} as const
