export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bot_logs: {
        Row: {
          action: string
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          telegram_id: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          telegram_id?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          telegram_id?: number | null
        }
        Relationships: []
      }
      capsule_items: {
        Row: {
          capsule_id: string
          created_at: string | null
          id: string
          image_url: string
          name: string
          price: number
          product_id: string
          source: string
          telegram_id: number
          url: string
        }
        Insert: {
          capsule_id: string
          created_at?: string | null
          id?: string
          image_url: string
          name: string
          price: number
          product_id: string
          source: string
          telegram_id: number
          url: string
        }
        Update: {
          capsule_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          name?: string
          price?: number
          product_id?: string
          source?: string
          telegram_id?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "capsule_items_capsule_id_fkey"
            columns: ["capsule_id"]
            isOneToOne: false
            referencedRelation: "capsules"
            referencedColumns: ["id"]
          },
        ]
      }
      capsules: {
        Row: {
          client_name: string
          created_at: string | null
          id: string
          status: string
          telegram_id: number
          updated_at: string | null
        }
        Insert: {
          client_name: string
          created_at?: string | null
          id?: string
          status?: string
          telegram_id: number
          updated_at?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string | null
          id?: string
          status?: string
          telegram_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      search_results: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          name: string
          price: number
          product_id: string
          raw_data: Json | null
          session_id: string | null
          source: string
          telegram_id: number
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          name: string
          price: number
          product_id: string
          raw_data?: Json | null
          session_id?: string | null
          source: string
          telegram_id: number
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          name?: string
          price?: number
          product_id?: string
          raw_data?: Json | null
          session_id?: string | null
          source?: string
          telegram_id?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          current_client_name: string | null
          current_query: Json | null
          current_segment: string | null
          id: string
          state: string
          telegram_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_client_name?: string | null
          current_query?: Json | null
          current_segment?: string | null
          id?: string
          state?: string
          telegram_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_client_name?: string | null
          current_query?: Json | null
          current_segment?: string | null
          id?: string
          state?: string
          telegram_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
