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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      album_images: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_images_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          audio_url: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          event_id: string | null
          id: string
          is_active: boolean
          is_post: boolean
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_post?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_post?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          avatar_number: number
          category: Database["public"]["Enums"]["avatar_category"]
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_number: number
          category: Database["public"]["Enums"]["avatar_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_number?: number
          category?: Database["public"]["Enums"]["avatar_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      caregiver_bestie_links: {
        Row: {
          bestie_id: string
          caregiver_id: string
          created_at: string
          id: string
          relationship: string
        }
        Insert: {
          bestie_id: string
          caregiver_id: string
          created_at?: string
          id?: string
          relationship: string
        }
        Update: {
          bestie_id?: string
          caregiver_id?: string
          created_at?: string
          id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_bestie_links_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_bestie_links_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_comments: {
        Row: {
          audio_url: string | null
          author_id: string
          content: string
          created_at: string
          id: string
          is_moderated: boolean | null
          moderation_notes: string | null
          post_id: string
        }
        Insert: {
          audio_url?: string | null
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_moderated?: boolean | null
          moderation_notes?: string | null
          post_id: string
        }
        Update: {
          audio_url?: string | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_moderated?: boolean | null
          moderation_notes?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_moderated: boolean | null
          moderation_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_moderated?: boolean | null
          moderation_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_moderated?: boolean | null
          moderation_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          audio_url: string | null
          created_at: string
          created_by: string
          description: string
          event_date: string
          expires_after_date: boolean
          id: string
          image_url: string | null
          is_recurring: boolean
          location: string | null
          max_attendees: number | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          created_by: string
          description: string
          event_date: string
          expires_after_date?: boolean
          id?: string
          image_url?: string | null
          is_recurring?: boolean
          location?: string | null
          max_attendees?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          expires_after_date?: boolean
          id?: string
          image_url?: string | null
          is_recurring?: boolean
          location?: string | null
          max_attendees?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_bestie_hearts: {
        Row: {
          created_at: string
          featured_bestie_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          featured_bestie_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          featured_bestie_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_bestie_hearts_featured_bestie_id_fkey"
            columns: ["featured_bestie_id"]
            isOneToOne: false
            referencedRelation: "featured_besties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_bestie_hearts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_besties: {
        Row: {
          bestie_id: string | null
          bestie_name: string
          created_at: string
          description: string
          end_date: string
          id: string
          image_url: string
          is_active: boolean | null
          start_date: string
          voice_note_url: string | null
        }
        Insert: {
          bestie_id?: string | null
          bestie_name: string
          created_at?: string
          description: string
          end_date?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          start_date?: string
          voice_note_url?: string | null
        }
        Update: {
          bestie_id?: string | null
          bestie_name?: string
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          start_date?: string
          voice_note_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          audio_notifications_enabled: boolean | null
          avatar_number: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          audio_notifications_enabled?: boolean | null
          avatar_number?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          audio_notifications_enabled?: boolean | null
          avatar_number?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_number_fkey"
            columns: ["avatar_number"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["avatar_number"]
          },
        ]
      }
      sponsorships: {
        Row: {
          amount: number | null
          bestie_id: string
          ended_at: string | null
          frequency: string | null
          id: string
          sponsor_id: string
          started_at: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          bestie_id: string
          ended_at?: string | null
          frequency?: string | null
          id?: string
          sponsor_id: string
          started_at?: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          bestie_id?: string
          ended_at?: string | null
          frequency?: string | null
          id?: string
          sponsor_id?: string
          started_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorships_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_id_fkey"
            columns: ["sponsor_id"]
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
      is_owner: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      avatar_category: "humans" | "animals" | "monsters" | "shapes"
      user_role: "bestie" | "caregiver" | "supporter" | "admin" | "owner"
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
      avatar_category: ["humans", "animals", "monsters", "shapes"],
      user_role: ["bestie", "caregiver", "supporter", "admin", "owner"],
    },
  },
} as const
