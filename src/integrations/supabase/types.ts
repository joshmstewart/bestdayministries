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
      about_sections: {
        Row: {
          content: Json | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_key: string
          section_name: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          display_order: number
          id?: string
          is_visible?: boolean
          section_key: string
          section_name: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_key?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      album_images: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_severity: string | null
          moderation_status: string | null
          original_image_url: string | null
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          original_image_url?: string | null
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          original_image_url?: string | null
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
          allow_admin_edit: boolean
          allow_owner_edit: boolean
          audio_url: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          event_id: string | null
          id: string
          is_active: boolean
          is_post: boolean
          is_public: boolean
          title: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          allow_admin_edit?: boolean
          allow_owner_edit?: boolean
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_post?: boolean
          is_public?: boolean
          title: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          allow_admin_edit?: boolean
          allow_owner_edit?: boolean
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_post?: boolean
          is_public?: boolean
          title?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
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
      ambassador_email_messages: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          message_content: string
          recipient_email: string
          resend_email_id: string | null
          sender_email: string
          sender_name: string | null
          subject: string | null
          thread_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          message_content: string
          recipient_email: string
          resend_email_id?: string | null
          sender_email: string
          sender_name?: string | null
          subject?: string | null
          thread_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          message_content?: string
          recipient_email?: string
          resend_email_id?: string | null
          sender_email?: string
          sender_name?: string | null
          subject?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ambassador_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_email_threads: {
        Row: {
          ambassador_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          recipient_email: string
          recipient_name: string | null
          subject: string
          thread_key: string
        }
        Insert: {
          ambassador_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          subject: string
          thread_key: string
        }
        Update: {
          ambassador_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          subject?: string
          thread_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_email_threads_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_profiles: {
        Row: {
          ambassador_email: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          personal_email: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ambassador_email: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          personal_email: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ambassador_email?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          personal_email?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      app_sound_effects: {
        Row: {
          audio_clip_id: string | null
          created_at: string | null
          event_type: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          audio_clip_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          audio_clip_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_sound_effects_audio_clip_id_fkey"
            columns: ["audio_clip_id"]
            isOneToOne: false
            referencedRelation: "audio_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_clips: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration: number | null
          file_url: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      automated_campaign_sends: {
        Row: {
          clicked_at: string | null
          complained_at: string | null
          created_at: string
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          trigger_data: Json | null
          trigger_event: string
        }
        Insert: {
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          trigger_data?: Json | null
          trigger_event: string
        }
        Update: {
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          trigger_data?: Json | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_campaign_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
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
      badges: {
        Row: {
          badge_type: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          requirements: Json | null
        }
        Insert: {
          badge_type?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          requirements?: Json | null
        }
        Update: {
          badge_type?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requirements?: Json | null
        }
        Relationships: []
      }
      campaign_templates: {
        Row: {
          auto_send: boolean
          content: string
          created_at: string
          created_by: string | null
          delay_minutes: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          template_type: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          auto_send?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_type: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          auto_send?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_type?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      caregiver_bestie_links: {
        Row: {
          allow_featured_posts: boolean
          allow_sponsor_messages: boolean
          bestie_id: string
          caregiver_id: string
          created_at: string
          id: string
          relationship: string
          require_comment_approval: boolean
          require_message_approval: boolean
          require_post_approval: boolean
          require_vendor_asset_approval: boolean
          show_sponsor_link_on_bestie: boolean
          show_sponsor_link_on_guardian: boolean
          show_vendor_link_on_bestie: boolean
          show_vendor_link_on_guardian: boolean
        }
        Insert: {
          allow_featured_posts?: boolean
          allow_sponsor_messages?: boolean
          bestie_id: string
          caregiver_id: string
          created_at?: string
          id?: string
          relationship: string
          require_comment_approval?: boolean
          require_message_approval?: boolean
          require_post_approval?: boolean
          require_vendor_asset_approval?: boolean
          show_sponsor_link_on_bestie?: boolean
          show_sponsor_link_on_guardian?: boolean
          show_vendor_link_on_bestie?: boolean
          show_vendor_link_on_guardian?: boolean
        }
        Update: {
          allow_featured_posts?: boolean
          allow_sponsor_messages?: boolean
          bestie_id?: string
          caregiver_id?: string
          created_at?: string
          id?: string
          relationship?: string
          require_comment_approval?: boolean
          require_message_approval?: boolean
          require_post_approval?: boolean
          require_vendor_asset_approval?: boolean
          show_sponsor_link_on_bestie?: boolean
          show_sponsor_link_on_guardian?: boolean
          show_vendor_link_on_bestie?: boolean
          show_vendor_link_on_guardian?: boolean
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
            foreignKeyName: "caregiver_bestie_links_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_bestie_links_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_bestie_links_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      change_logs: {
        Row: {
          affected_record_id: string | null
          affected_table: string | null
          change_details: Json | null
          change_summary: string
          change_type: string
          changed_by: string
          created_at: string
          id: string
        }
        Insert: {
          affected_record_id?: string | null
          affected_table?: string | null
          change_details?: Json | null
          change_summary: string
          change_type: string
          changed_by: string
          created_at?: string
          id?: string
        }
        Update: {
          affected_record_id?: string | null
          affected_table?: string | null
          change_details?: Json | null
          change_summary?: string
          change_type?: string
          changed_by?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json | null
          related_item_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          related_item_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          related_item_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          commission_percentage: number
          created_at: string | null
          created_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          commission_percentage?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          commission_percentage?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      community_features: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          gradient: string
          icon: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_quick_links: {
        Row: {
          color: string
          created_at: string
          created_by: string
          display_order: number
          href: string
          icon: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          display_order?: number
          href: string
          icon?: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          display_order?: number
          href?: string
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_sections: {
        Row: {
          content: Json | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_key: string
          section_name: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          display_order: number
          id?: string
          is_visible?: boolean
          section_key: string
          section_name: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_key?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_form_replies: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_email: string
          sender_id: string | null
          sender_name: string
          sender_type: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_email: string
          sender_id?: string | null
          sender_name: string
          sender_type: string
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_email?: string
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_form_replies_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_form_settings: {
        Row: {
          created_at: string
          description: string
          id: string
          is_enabled: boolean
          recipient_email: string
          reply_from_email: string
          reply_from_name: string
          success_message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          recipient_email: string
          reply_from_email?: string
          reply_from_name?: string
          success_message?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          recipient_email?: string
          reply_from_email?: string
          reply_from_name?: string
          success_message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_form_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          image_url: string | null
          message: string
          message_type: string | null
          name: string
          replied_at: string | null
          replied_by: string | null
          reply_message: string | null
          source: string | null
          status: string
          subject: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          image_url?: string | null
          message: string
          message_type?: string | null
          name: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          source?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          image_url?: string | null
          message?: string
          message_type?: string | null
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          source?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      daily_scratch_cards: {
        Row: {
          collection_id: string
          created_at: string
          date: string
          expires_at: string
          id: string
          is_bonus_card: boolean
          is_scratched: boolean
          purchase_number: number
          revealed_sticker_id: string | null
          scratched_at: string | null
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          date?: string
          expires_at: string
          id?: string
          is_bonus_card?: boolean
          is_scratched?: boolean
          purchase_number?: number
          revealed_sticker_id?: string | null
          scratched_at?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          date?: string
          expires_at?: string
          id?: string
          is_bonus_card?: boolean
          is_scratched?: boolean
          purchase_number?: number
          revealed_sticker_id?: string | null
          scratched_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_scratch_cards_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "sticker_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_scratch_cards_revealed_sticker_id_fkey"
            columns: ["revealed_sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_emails_log: {
        Row: {
          error_message: string | null
          frequency: string
          id: string
          metadata: Json | null
          notification_count: number
          recipient_email: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          frequency: string
          id?: string
          metadata?: Json | null
          notification_count: number
          recipient_email: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          frequency?: string
          id?: string
          metadata?: Json | null
          notification_count?: number
          recipient_email?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      discussion_comments: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
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
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
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
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
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
            foreignKeyName: "discussion_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          album_id: string | null
          allow_admin_edit: boolean
          allow_owner_claim: boolean
          allow_owner_edit: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          aspect_ratio: string
          author_id: string
          category: string | null
          content: string
          created_at: string
          event_id: string | null
          id: string
          image_url: string | null
          is_moderated: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_reason: string | null
          moderation_severity: string | null
          moderation_status: string | null
          title: string
          updated_at: string
          video_cover_timestamp: number | null
          video_cover_url: string | null
          video_id: string | null
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
          youtube_url: string | null
        }
        Insert: {
          album_id?: string | null
          allow_admin_edit?: boolean
          allow_owner_claim?: boolean
          allow_owner_edit?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string | null
          is_moderated?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          title: string
          updated_at?: string
          video_cover_timestamp?: number | null
          video_cover_url?: string | null
          video_id?: string | null
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
          youtube_url?: string | null
        }
        Update: {
          album_id?: string | null
          allow_admin_edit?: boolean
          allow_owner_claim?: boolean
          allow_owner_edit?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string | null
          is_moderated?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          title?: string
          updated_at?: string
          video_cover_timestamp?: number | null
          video_cover_url?: string | null
          video_id?: string | null
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          amount_charged: number | null
          created_at: string
          donor_email: string | null
          donor_id: string | null
          ended_at: string | null
          frequency: string
          id: string
          started_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_mode: string
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          amount_charged?: number | null
          created_at?: string
          donor_email?: string | null
          donor_id?: string | null
          ended_at?: string | null
          frequency: string
          id?: string
          started_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_mode?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_charged?: number | null
          created_at?: string
          donor_email?: string | null
          donor_id?: string | null
          ended_at?: string | null
          frequency?: string
          id?: string
          started_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_mode?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_audit_log: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          from_email: string
          from_name: string | null
          html_content: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          recipient_user_id: string | null
          related_id: string | null
          related_type: string | null
          resend_email_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          from_email: string
          from_name?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          from_email?: string
          from_name?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_notifications_log: {
        Row: {
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          recipient_email: string
          sent_at: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          recipient_email: string
          sent_at?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          browser_info: Json | null
          created_at: string
          environment: string | null
          error_message: string
          error_type: string | null
          id: string
          metadata: Json | null
          sentry_event_id: string | null
          severity: string
          stack_trace: string | null
          url: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          browser_info?: Json | null
          created_at?: string
          environment?: string | null
          error_message: string
          error_type?: string | null
          id?: string
          metadata?: Json | null
          sentry_event_id?: string | null
          severity?: string
          stack_trace?: string | null
          url?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          browser_info?: Json | null
          created_at?: string
          environment?: string | null
          error_message?: string
          error_type?: string | null
          id?: string
          metadata?: Json | null
          sentry_event_id?: string | null
          severity?: string
          stack_trace?: string | null
          url?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_dates: {
        Row: {
          created_at: string
          event_date: string
          event_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_admin_edit: boolean
          allow_owner_edit: boolean
          aspect_ratio: string
          audio_url: string | null
          created_at: string
          created_by: string
          description: string
          event_date: string
          expires_after_date: boolean
          id: string
          image_url: string | null
          is_active: boolean
          is_public: boolean
          is_recurring: boolean
          location: string | null
          max_attendees: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_severity: string | null
          moderation_status: string | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          title: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          allow_admin_edit?: boolean
          allow_owner_edit?: boolean
          aspect_ratio?: string
          audio_url?: string | null
          created_at?: string
          created_by: string
          description: string
          event_date: string
          expires_after_date?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_public?: boolean
          is_recurring?: boolean
          location?: string | null
          max_attendees?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          title: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          allow_admin_edit?: boolean
          allow_owner_edit?: boolean
          aspect_ratio?: string
          audio_url?: string | null
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          expires_after_date?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_public?: boolean
          is_recurring?: boolean
          location?: string | null
          max_attendees?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          title?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      family_organizations: {
        Row: {
          button_text: string
          color: string
          created_at: string
          created_by: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          button_text?: string
          color?: string
          created_at?: string
          created_by: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          button_text?: string
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
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
            referencedRelation: "bestie_funding_progress"
            referencedColumns: ["featured_bestie_id"]
          },
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
          {
            foreignKeyName: "featured_bestie_hearts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_besties: {
        Row: {
          allow_admin_edit: boolean
          allow_owner_edit: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          aspect_ratio: string
          available_for_sponsorship: boolean
          bestie_id: string | null
          bestie_name: string
          created_at: string
          description: string
          end_date: string | null
          id: string
          image_url: string
          is_active: boolean | null
          is_fully_funded: boolean
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_severity: string | null
          moderation_status: string | null
          monthly_goal: number | null
          start_date: string | null
          updated_at: string
          voice_note_url: string | null
        }
        Insert: {
          allow_admin_edit?: boolean
          allow_owner_edit?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string
          available_for_sponsorship?: boolean
          bestie_id?: string | null
          bestie_name: string
          created_at?: string
          description: string
          end_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          is_fully_funded?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          monthly_goal?: number | null
          start_date?: string | null
          updated_at?: string
          voice_note_url?: string | null
        }
        Update: {
          allow_admin_edit?: boolean
          allow_owner_edit?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string
          available_for_sponsorship?: boolean
          bestie_id?: string | null
          bestie_name?: string
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_fully_funded?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          monthly_goal?: number | null
          start_date?: string | null
          updated_at?: string
          voice_note_url?: string | null
        }
        Relationships: []
      }
      featured_items: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          created_by: string
          description: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_public: boolean
          link_text: string | null
          link_url: string
          original_image_url: string | null
          title: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          created_by: string
          description: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_public?: boolean
          link_text?: string | null
          link_url: string
          original_image_url?: string | null
          title: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          created_by?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_public?: boolean
          link_text?: string | null
          link_url?: string
          original_image_url?: string | null
          title?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          created_at: string
          display_order: number
          href: string
          id: string
          is_active: boolean
          label: string
          section_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          href: string
          id?: string
          is_active?: boolean
          label: string
          section_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          href?: string
          id?: string
          is_active?: boolean
          label?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "footer_links_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "footer_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          coins_earned: number
          completed_at: string
          difficulty: string
          game_type: string
          id: string
          metadata: Json | null
          moves_count: number
          score: number
          time_seconds: number
          user_id: string
        }
        Insert: {
          coins_earned?: number
          completed_at?: string
          difficulty: string
          game_type: string
          id?: string
          metadata?: Json | null
          moves_count?: number
          score?: number
          time_seconds?: number
          user_id: string
        }
        Update: {
          coins_earned?: number
          completed_at?: string
          difficulty?: string
          game_type?: string
          id?: string
          metadata?: Json | null
          moves_count?: number
          score?: number
          time_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      help_faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          question: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
      help_guides: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          reading_time_minutes: number | null
          title: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          reading_time_minutes?: number | null
          title: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          reading_time_minutes?: number | null
          title?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
      help_tours: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          duration_minutes: number | null
          icon: string
          id: string
          is_active: boolean
          required_route: string | null
          steps: Json
          title: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          duration_minutes?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          required_route?: string | null
          steps?: Json
          title: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          duration_minutes?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          required_route?: string | null
          steps?: Json
          title?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_key: string
          section_name: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          display_order: number
          id?: string
          is_visible?: boolean
          section_key: string
          section_name: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_key?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      issue_reports: {
        Row: {
          admin_notes: string | null
          browser_info: Json | null
          created_at: string
          current_url: string | null
          description: string
          id: string
          image_url: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          session_data: Json | null
          status: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: Json | null
          created_at?: string
          current_url?: string | null
          description: string
          id?: string
          image_url?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_data?: Json | null
          status?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_info?: Json | null
          created_at?: string
          current_url?: string | null
          description?: string
          id?: string
          image_url?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      moderation_settings: {
        Row: {
          auto_approve_low_severity: boolean | null
          discussion_comment_image_policy:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          discussion_post_image_policy:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          id: string
          sponsor_message_image_policy:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          sponsor_message_video_policy:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_approve_low_severity?: boolean | null
          discussion_comment_image_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          discussion_post_image_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          id?: string
          sponsor_message_image_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          sponsor_message_video_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_approve_low_severity?: boolean | null
          discussion_comment_image_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          discussion_post_image_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          id?: string
          sponsor_message_image_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          sponsor_message_video_policy?:
            | Database["public"]["Enums"]["moderation_policy"]
            | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      navigation_links: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          href: string
          id: string
          is_active: boolean
          label: string
          link_type: string
          parent_id: string | null
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          href: string
          id?: string
          is_active?: boolean
          label: string
          link_type?: string
          parent_id?: string | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          href?: string
          id?: string
          is_active?: boolean
          label?: string
          link_type?: string
          parent_id?: string | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_links"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_analytics: {
        Row: {
          campaign_id: string
          clicked_url: string | null
          created_at: string
          email: string
          event_type: Database["public"]["Enums"]["newsletter_event_type"]
          id: string
          ip_address: string | null
          metadata: Json | null
          resend_event_id: string | null
          subscriber_id: string | null
          timezone: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          clicked_url?: string | null
          created_at?: string
          email: string
          event_type: Database["public"]["Enums"]["newsletter_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resend_event_id?: string | null
          subscriber_id?: string | null
          timezone?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_url?: string | null
          created_at?: string
          email?: string
          event_type?: Database["public"]["Enums"]["newsletter_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resend_event_id?: string | null
          subscriber_id?: string | null
          timezone?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_analytics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_automation_enrollments: {
        Row: {
          automation_id: string | null
          completed_at: string | null
          current_step: number | null
          enrolled_at: string
          id: string
          metadata: Json | null
          next_send_at: string | null
          sequence_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          automation_id?: string | null
          completed_at?: string | null
          current_step?: number | null
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          next_send_at?: string | null
          sequence_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          automation_id?: string | null
          completed_at?: string | null
          current_step?: number | null
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          next_send_at?: string | null
          sequence_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_automation_enrollments_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "newsletter_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_automation_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "newsletter_drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_automation_logs: {
        Row: {
          action: string
          automation_id: string | null
          campaign_id: string | null
          created_at: string
          enrollment_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          sequence_id: string | null
          status: string
          step_number: number | null
        }
        Insert: {
          action: string
          automation_id?: string | null
          campaign_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sequence_id?: string | null
          status?: string
          step_number?: number | null
        }
        Update: {
          action?: string
          automation_id?: string | null
          campaign_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sequence_id?: string | null
          status?: string
          step_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "newsletter_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_automation_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_automation_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "newsletter_automation_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_automation_logs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "newsletter_drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_automations: {
        Row: {
          campaign_id: string | null
          conditions: Json | null
          created_at: string
          created_by: string
          description: string | null
          drip_sequence_id: string | null
          id: string
          name: string
          status: string
          total_enrolled: number | null
          total_sent: number | null
          trigger_event: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          conditions?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          drip_sequence_id?: string | null
          id?: string
          name: string
          status?: string
          total_enrolled?: number | null
          total_sent?: number | null
          trigger_event?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          conditions?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          drip_sequence_id?: string | null
          id?: string
          name?: string
          status?: string
          total_enrolled?: number | null
          total_sent?: number | null
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_automation_drip_sequence"
            columns: ["drip_sequence_id"]
            isOneToOne: false
            referencedRelation: "newsletter_drip_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_automations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_campaigns: {
        Row: {
          created_at: string
          created_by: string
          html_content: string
          id: string
          preview_text: string | null
          scheduled_for: string | null
          segment_filter: Json | null
          sent_at: string | null
          sent_to_count: number | null
          status: Database["public"]["Enums"]["newsletter_campaign_status"]
          subject: string
          target_audience: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          html_content: string
          id?: string
          preview_text?: string | null
          scheduled_for?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: Database["public"]["Enums"]["newsletter_campaign_status"]
          subject: string
          target_audience?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          html_content?: string
          id?: string
          preview_text?: string | null
          scheduled_for?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: Database["public"]["Enums"]["newsletter_campaign_status"]
          subject?: string
          target_audience?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_drip_sequences: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          enrollment_trigger: string
          exit_conditions: Json | null
          id: string
          name: string
          status: string
          total_completed: number | null
          total_enrolled: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          enrollment_trigger: string
          exit_conditions?: Json | null
          id?: string
          name: string
          status?: string
          total_completed?: number | null
          total_enrolled?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          enrollment_trigger?: string
          exit_conditions?: Json | null
          id?: string
          name?: string
          status?: string
          total_completed?: number | null
          total_enrolled?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_drip_steps: {
        Row: {
          campaign_id: string | null
          conditions: Json | null
          created_at: string
          delay_unit: string
          delay_value: number
          id: string
          sequence_id: string
          step_number: number
        }
        Insert: {
          campaign_id?: string | null
          conditions?: Json | null
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          sequence_id: string
          step_number: number
        }
        Update: {
          campaign_id?: string | null
          conditions?: Json | null
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          sequence_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_drip_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_drip_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "newsletter_drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_emails_log: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_message: string | null
          html_content: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          resend_email_id: string | null
          sent_at: string
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          resend_email_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          resend_email_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_emails_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_emails_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_links: {
        Row: {
          campaign_id: string
          click_count: number | null
          created_at: string
          id: string
          original_url: string
          short_code: string
        }
        Insert: {
          campaign_id: string
          click_count?: number | null
          created_at?: string
          id?: string
          original_url: string
          short_code: string
        }
        Update: {
          campaign_id?: string
          click_count?: number | null
          created_at?: string
          id?: string
          original_url?: string
          short_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          campaign_template_id: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          location_state: string | null
          metadata: Json | null
          source: string
          status: Database["public"]["Enums"]["newsletter_status"]
          subscribed_at: string
          timezone: string | null
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          campaign_template_id?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          metadata?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["newsletter_status"]
          subscribed_at?: string
          timezone?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_template_id?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          metadata?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["newsletter_status"]
          subscribed_at?: string
          timezone?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_campaign_template_id_fkey"
            columns: ["campaign_template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          preview_text_template: string | null
          subject_template: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          preview_text_template?: string | null
          subject_template: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          preview_text_template?: string | null
          subject_template?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email_on_approval_decision: boolean
          email_on_comment_on_post: boolean
          email_on_comment_on_thread: boolean
          email_on_event_update: boolean
          email_on_message_approved: boolean
          email_on_message_rejected: boolean
          email_on_new_event: boolean
          email_on_new_sponsor_message: boolean
          email_on_new_sponsorship: boolean
          email_on_pending_approval: boolean
          email_on_product_update: boolean | null
          email_on_sponsorship_update: boolean
          enable_digest_emails: boolean
          id: string
          inapp_on_approval_decision: boolean
          inapp_on_comment_on_post: boolean
          inapp_on_comment_on_thread: boolean
          inapp_on_event_update: boolean
          inapp_on_message_approved: boolean
          inapp_on_message_rejected: boolean
          inapp_on_new_event: boolean
          inapp_on_new_sponsor_message: boolean
          inapp_on_new_sponsorship: boolean
          inapp_on_pending_approval: boolean
          inapp_on_product_update: boolean | null
          inapp_on_sponsorship_update: boolean
          last_digest_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email_on_approval_decision?: boolean
          email_on_comment_on_post?: boolean
          email_on_comment_on_thread?: boolean
          email_on_event_update?: boolean
          email_on_message_approved?: boolean
          email_on_message_rejected?: boolean
          email_on_new_event?: boolean
          email_on_new_sponsor_message?: boolean
          email_on_new_sponsorship?: boolean
          email_on_pending_approval?: boolean
          email_on_product_update?: boolean | null
          email_on_sponsorship_update?: boolean
          enable_digest_emails?: boolean
          id?: string
          inapp_on_approval_decision?: boolean
          inapp_on_comment_on_post?: boolean
          inapp_on_comment_on_thread?: boolean
          inapp_on_event_update?: boolean
          inapp_on_message_approved?: boolean
          inapp_on_message_rejected?: boolean
          inapp_on_new_event?: boolean
          inapp_on_new_sponsor_message?: boolean
          inapp_on_new_sponsorship?: boolean
          inapp_on_pending_approval?: boolean
          inapp_on_product_update?: boolean | null
          inapp_on_sponsorship_update?: boolean
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email_on_approval_decision?: boolean
          email_on_comment_on_post?: boolean
          email_on_comment_on_thread?: boolean
          email_on_event_update?: boolean
          email_on_message_approved?: boolean
          email_on_message_rejected?: boolean
          email_on_new_event?: boolean
          email_on_new_sponsor_message?: boolean
          email_on_new_sponsorship?: boolean
          email_on_pending_approval?: boolean
          email_on_product_update?: boolean | null
          email_on_sponsorship_update?: boolean
          enable_digest_emails?: boolean
          id?: string
          inapp_on_approval_decision?: boolean
          inapp_on_comment_on_post?: boolean
          inapp_on_comment_on_thread?: boolean
          inapp_on_event_update?: boolean
          inapp_on_message_approved?: boolean
          inapp_on_message_rejected?: boolean
          inapp_on_new_event?: boolean
          inapp_on_new_sponsor_message?: boolean
          inapp_on_new_sponsorship?: boolean
          inapp_on_pending_approval?: boolean
          inapp_on_product_update?: boolean | null
          inapp_on_sponsorship_update?: boolean
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          auto_resolved: boolean | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          auto_resolved?: boolean | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          auto_resolved?: boolean | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          order_id: string
          platform_fee: number | null
          price_at_purchase: number
          printify_line_item_id: string | null
          printify_order_id: string | null
          printify_status: string | null
          product_id: string
          quantity: number
          shipped_at: string | null
          stripe_transfer_id: string | null
          tracking_number: string | null
          tracking_url: string | null
          vendor_id: string | null
          vendor_payout: number | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          order_id: string
          platform_fee?: number | null
          price_at_purchase: number
          printify_line_item_id?: string | null
          printify_order_id?: string | null
          printify_status?: string | null
          product_id: string
          quantity: number
          shipped_at?: string | null
          stripe_transfer_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          vendor_id?: string | null
          vendor_payout?: number | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          order_id?: string
          platform_fee?: number | null
          price_at_purchase?: number
          printify_line_item_id?: string | null
          printify_order_id?: string | null
          printify_status?: string | null
          product_id?: string
          quantity?: number
          shipped_at?: string | null
          stripe_transfer_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          vendor_id?: string | null
          vendor_payout?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_earnings"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          paid_at: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_mode: string | null
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_url: string
          name: string
          updated_at: string
          website_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url: string
          name: string
          updated_at?: string
          website_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      pet_types: {
        Row: {
          base_energy: number
          base_happiness: number
          base_hunger: number
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          unlock_cost: number
          updated_at: string
        }
        Insert: {
          base_energy?: number
          base_happiness?: number
          base_hunger?: number
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          unlock_cost?: number
          updated_at?: string
        }
        Update: {
          base_energy?: number
          base_happiness?: number
          base_hunger?: number
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          unlock_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          inventory_count: number
          is_active: boolean
          is_printify: boolean
          is_printify_product: boolean | null
          name: string
          price: number
          printify_blueprint_id: number | null
          printify_print_provider_id: number | null
          printify_product_id: string | null
          printify_variant_ids: Json | null
          tags: string[] | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number
          is_active?: boolean
          is_printify?: boolean
          is_printify_product?: boolean | null
          name: string
          price: number
          printify_blueprint_id?: number | null
          printify_print_provider_id?: number | null
          printify_product_id?: string | null
          printify_variant_ids?: Json | null
          tags?: string[] | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number
          is_active?: boolean
          is_printify?: boolean
          is_printify_product?: boolean | null
          name?: string
          price?: number
          printify_blueprint_id?: number | null
          printify_print_provider_id?: number | null
          printify_product_id?: string | null
          printify_variant_ids?: Json | null
          tags?: string[] | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_earnings"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          audio_notifications_enabled: boolean | null
          avatar_number: number | null
          avatar_url: string | null
          bio: string | null
          coin_balance: number
          coins: number
          created_at: string
          display_name: string
          email: string | null
          friend_code: string | null
          id: string
          tts_enabled: boolean
          tts_voice: string | null
          updated_at: string
        }
        Insert: {
          audio_notifications_enabled?: boolean | null
          avatar_number?: number | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          coins?: number
          created_at?: string
          display_name: string
          email?: string | null
          friend_code?: string | null
          id: string
          tts_enabled?: boolean
          tts_voice?: string | null
          updated_at?: string
        }
        Update: {
          audio_notifications_enabled?: boolean | null
          avatar_number?: number | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          coins?: number
          created_at?: string
          display_name?: string
          email?: string | null
          friend_code?: string | null
          id?: string
          tts_enabled?: boolean
          tts_voice?: string | null
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
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      receipt_generation_logs: {
        Row: {
          created_at: string | null
          donation_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          receipt_id: string | null
          sponsorship_id: string | null
          stage: string
          status: string
        }
        Insert: {
          created_at?: string | null
          donation_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          receipt_id?: string | null
          sponsorship_id?: string | null
          stage: string
          status: string
        }
        Update: {
          created_at?: string | null
          donation_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          receipt_id?: string | null
          sponsorship_id?: string | null
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_generation_logs_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_generation_logs_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations_missing_receipts"
            referencedColumns: ["donation_id"]
          },
          {
            foreignKeyName: "receipt_generation_logs_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "orphaned_receipts_analysis"
            referencedColumns: ["potential_donation_id"]
          },
          {
            foreignKeyName: "receipt_generation_logs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "orphaned_receipts_analysis"
            referencedColumns: ["receipt_id"]
          },
          {
            foreignKeyName: "receipt_generation_logs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_generation_logs_sponsorship_id_fkey"
            columns: ["sponsorship_id"]
            isOneToOne: false
            referencedRelation: "sponsorships"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_settings: {
        Row: {
          donation_receipt_message: string | null
          donation_tax_deductible_notice: string | null
          enable_receipts: boolean
          from_email: string
          id: string
          organization_address: string | null
          organization_ein: string
          organization_name: string
          receipt_message: string
          reply_to_email: string | null
          sponsorship_receipt_message: string | null
          sponsorship_tax_deductible_notice: string | null
          tax_deductible_notice: string
          updated_at: string | null
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          donation_receipt_message?: string | null
          donation_tax_deductible_notice?: string | null
          enable_receipts?: boolean
          from_email?: string
          id?: string
          organization_address?: string | null
          organization_ein?: string
          organization_name?: string
          receipt_message?: string
          reply_to_email?: string | null
          sponsorship_receipt_message?: string | null
          sponsorship_tax_deductible_notice?: string | null
          tax_deductible_notice?: string
          updated_at?: string | null
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          donation_receipt_message?: string | null
          donation_tax_deductible_notice?: string | null
          enable_receipts?: boolean
          from_email?: string
          id?: string
          organization_address?: string | null
          organization_ein?: string
          organization_name?: string
          receipt_message?: string
          reply_to_email?: string | null
          sponsorship_receipt_message?: string | null
          sponsorship_tax_deductible_notice?: string | null
          tax_deductible_notice?: string
          updated_at?: string | null
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reconciliation_changes: {
        Row: {
          after_state: Json
          before_state: Json
          change_type: string
          created_at: string | null
          id: string
          job_log_id: string
          sponsorship_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          after_state: Json
          before_state: Json
          change_type: string
          created_at?: string | null
          id?: string
          job_log_id: string
          sponsorship_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          after_state?: Json
          before_state?: Json
          change_type?: string
          created_at?: string | null
          id?: string
          job_log_id?: string
          sponsorship_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_changes_job_log_id_fkey"
            columns: ["job_log_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_job_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_changes_sponsorship_id_fkey"
            columns: ["sponsorship_id"]
            isOneToOne: false
            referencedRelation: "sponsorships"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_job_logs: {
        Row: {
          checked_count: number | null
          completed_at: string | null
          created_at: string | null
          error_count: number | null
          errors: Json | null
          id: string
          job_name: string
          metadata: Json | null
          ran_at: string
          skipped_count: number | null
          status: string
          stripe_mode: string
          triggered_by: string | null
          updated_count: number | null
        }
        Insert: {
          checked_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          job_name: string
          metadata?: Json | null
          ran_at?: string
          skipped_count?: number | null
          status?: string
          stripe_mode: string
          triggered_by?: string | null
          updated_count?: number | null
        }
        Update: {
          checked_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          job_name?: string
          metadata?: Json | null
          ran_at?: string
          skipped_count?: number | null
          status?: string
          stripe_mode?: string
          triggered_by?: string | null
          updated_count?: number | null
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          address: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_cart: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_cart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_bestie_requests: {
        Row: {
          bestie_id: string
          created_at: string
          id: string
          message: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          sponsor_bestie_id: string | null
          sponsor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bestie_id: string
          created_at?: string
          id?: string
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sponsor_bestie_id?: string | null
          sponsor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bestie_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sponsor_bestie_id?: string | null
          sponsor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_bestie_requests_sponsor_bestie_id_fkey"
            columns: ["sponsor_bestie_id"]
            isOneToOne: false
            referencedRelation: "sponsor_bestie_funding_progress"
            referencedColumns: ["sponsor_bestie_id"]
          },
          {
            foreignKeyName: "sponsor_bestie_requests_sponsor_bestie_id_fkey"
            columns: ["sponsor_bestie_id"]
            isOneToOne: false
            referencedRelation: "sponsor_besties"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_besties: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          aspect_ratio: string
          bestie_id: string | null
          bestie_name: string
          created_at: string
          created_by: string
          id: string
          image_url: string
          is_active: boolean | null
          is_fully_funded: boolean | null
          is_public: boolean
          monthly_goal: number | null
          text_sections: Json | null
          updated_at: string
          voice_note_url: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string
          bestie_id?: string | null
          bestie_name: string
          created_at?: string
          created_by: string
          id?: string
          image_url: string
          is_active?: boolean | null
          is_fully_funded?: boolean | null
          is_public?: boolean
          monthly_goal?: number | null
          text_sections?: Json | null
          updated_at?: string
          voice_note_url?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string
          bestie_id?: string | null
          bestie_name?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_fully_funded?: boolean | null
          is_public?: boolean
          monthly_goal?: number | null
          text_sections?: Json | null
          updated_at?: string
          voice_note_url?: string | null
        }
        Relationships: []
      }
      sponsor_messages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audio_url: string | null
          bestie_id: string
          created_at: string
          from_guardian: boolean | null
          id: string
          image_url: string | null
          is_read: boolean
          message: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_result: Json | null
          moderation_severity: string | null
          moderation_status: string | null
          rejection_reason: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audio_url?: string | null
          bestie_id: string
          created_at?: string
          from_guardian?: boolean | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          message: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_result?: Json | null
          moderation_severity?: string | null
          moderation_status?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject: string
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audio_url?: string | null
          bestie_id?: string
          created_at?: string
          from_guardian?: boolean | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_result?: Json | null
          moderation_severity?: string | null
          moderation_status?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string
          video_url?: string | null
        }
        Relationships: []
      }
      sponsor_page_sections: {
        Row: {
          content: Json | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_key: string
          section_name: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          display_order: number
          id?: string
          is_visible?: boolean
          section_key: string
          section_name: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_key?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsorship_receipts: {
        Row: {
          amount: number
          bestie_name: string
          created_at: string | null
          frequency: string
          id: string
          organization_ein: string | null
          organization_name: string | null
          receipt_number: string
          sent_at: string | null
          sponsor_email: string
          sponsor_name: string | null
          sponsorship_id: string | null
          stripe_mode: string
          tax_year: number
          transaction_date: string
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          bestie_name: string
          created_at?: string | null
          frequency: string
          id?: string
          organization_ein?: string | null
          organization_name?: string | null
          receipt_number: string
          sent_at?: string | null
          sponsor_email: string
          sponsor_name?: string | null
          sponsorship_id?: string | null
          stripe_mode?: string
          tax_year: number
          transaction_date: string
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          bestie_name?: string
          created_at?: string | null
          frequency?: string
          id?: string
          organization_ein?: string | null
          organization_name?: string | null
          receipt_number?: string
          sent_at?: string | null
          sponsor_email?: string
          sponsor_name?: string | null
          sponsorship_id?: string | null
          stripe_mode?: string
          tax_year?: number
          transaction_date?: string
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sponsorship_shares: {
        Row: {
          bestie_id: string
          created_at: string
          id: string
          shared_by: string
          sponsorship_id: string
        }
        Insert: {
          bestie_id: string
          created_at?: string
          id?: string
          shared_by: string
          sponsorship_id: string
        }
        Update: {
          bestie_id?: string
          created_at?: string
          id?: string
          shared_by?: string
          sponsorship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_shares_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_shares_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_shares_sponsorship_id_fkey"
            columns: ["sponsorship_id"]
            isOneToOne: false
            referencedRelation: "sponsorships"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorships: {
        Row: {
          amount: number | null
          bestie_id: string | null
          ended_at: string | null
          frequency: string | null
          id: string
          sponsor_bestie_id: string | null
          sponsor_email: string | null
          sponsor_id: string | null
          started_at: string
          status: string | null
          stripe_customer_id: string | null
          stripe_mode: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          bestie_id?: string | null
          ended_at?: string | null
          frequency?: string | null
          id?: string
          sponsor_bestie_id?: string | null
          sponsor_email?: string | null
          sponsor_id?: string | null
          started_at?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          bestie_id?: string | null
          ended_at?: string | null
          frequency?: string | null
          id?: string
          sponsor_bestie_id?: string | null
          sponsor_email?: string | null
          sponsor_id?: string | null
          started_at?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
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
            foreignKeyName: "sponsorships_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_bestie_id_fkey"
            columns: ["sponsor_bestie_id"]
            isOneToOne: false
            referencedRelation: "sponsor_bestie_funding_progress"
            referencedColumns: ["sponsor_bestie_id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_bestie_id_fkey"
            columns: ["sponsor_bestie_id"]
            isOneToOne: false
            referencedRelation: "sponsor_besties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_collections: {
        Row: {
          completion_badge_id: string | null
          created_at: string
          description: string | null
          display_order: number
          end_date: string | null
          featured_start_date: string | null
          ga_date: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          pack_animation_url: string | null
          pack_image_url: string | null
          preview_sticker_id: string | null
          rarity_percentages: Json | null
          start_date: string
          stickers_per_pack: number
          theme: string
          updated_at: string
          use_default_rarity: boolean
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          completion_badge_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          end_date?: string | null
          featured_start_date?: string | null
          ga_date?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          pack_animation_url?: string | null
          pack_image_url?: string | null
          preview_sticker_id?: string | null
          rarity_percentages?: Json | null
          start_date?: string
          stickers_per_pack?: number
          theme: string
          updated_at?: string
          use_default_rarity?: boolean
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          completion_badge_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          end_date?: string | null
          featured_start_date?: string | null
          ga_date?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          pack_animation_url?: string | null
          pack_image_url?: string | null
          preview_sticker_id?: string | null
          rarity_percentages?: Json | null
          start_date?: string
          stickers_per_pack?: number
          theme?: string
          updated_at?: string
          use_default_rarity?: boolean
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_completion_badge"
            columns: ["completion_badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticker_collections_preview_sticker_id_fkey"
            columns: ["preview_sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      stickers: {
        Row: {
          collection_id: string
          created_at: string
          description: string | null
          drop_rate: number
          id: string
          image_url: string
          is_active: boolean
          metadata: Json | null
          name: string
          rarity: Database["public"]["Enums"]["sticker_rarity"]
          sticker_number: number
          visual_style: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          description?: string | null
          drop_rate: number
          id?: string
          image_url: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          rarity: Database["public"]["Enums"]["sticker_rarity"]
          sticker_number: number
          visual_style: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          description?: string | null
          drop_rate?: number
          id?: string
          image_url?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          rarity?: Database["public"]["Enums"]["sticker_rarity"]
          sticker_number?: number
          visual_style?: string
        }
        Relationships: [
          {
            foreignKeyName: "stickers_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "sticker_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          required_role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          required_role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          required_role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
      stripe_webhook_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          error_message: string | null
          error_stack: string | null
          event_id: string
          event_type: string
          http_status_code: number | null
          id: string
          metadata: Json | null
          processing_duration_ms: number | null
          processing_status: string
          processing_steps: Json | null
          raw_event: Json
          related_record_id: string | null
          related_record_type: string | null
          retry_count: number | null
          stripe_mode: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_id: string
          event_type: string
          http_status_code?: number | null
          id?: string
          metadata?: Json | null
          processing_duration_ms?: number | null
          processing_status?: string
          processing_steps?: Json | null
          raw_event: Json
          related_record_id?: string | null
          related_record_type?: string | null
          retry_count?: number | null
          stripe_mode: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_id?: string
          event_type?: string
          http_status_code?: number | null
          id?: string
          metadata?: Json | null
          processing_duration_ms?: number | null
          processing_status?: string
          processing_steps?: Json | null
          raw_event?: Json
          related_record_id?: string | null
          related_record_type?: string | null
          retry_count?: number | null
          stripe_mode?: string
        }
        Relationships: []
      }
      support_page_sections: {
        Row: {
          content: Json | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_key: string
          section_name: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          display_order: number
          id?: string
          is_visible?: boolean
          section_key: string
          section_name: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_key?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          privacy_version: string
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_runs: {
        Row: {
          branch: string
          commit_message: string | null
          commit_sha: string
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          passed_count: number | null
          run_id: string
          run_url: string
          skipped_count: number | null
          status: string
          test_count: number | null
          workflow_name: string
        }
        Insert: {
          branch: string
          commit_message?: string | null
          commit_sha: string
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          passed_count?: number | null
          run_id: string
          run_url: string
          skipped_count?: number | null
          status: string
          test_count?: number | null
          workflow_name: string
        }
        Update: {
          branch?: string
          commit_message?: string | null
          commit_sha?: string
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          passed_count?: number | null
          run_id?: string
          run_url?: string
          skipped_count?: number | null
          status?: string
          test_count?: number | null
          workflow_name?: string
        }
        Relationships: []
      }
      tour_completions: {
        Row: {
          completed_at: string
          id: string
          tour_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          tour_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_completions_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "help_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_voices: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          updated_at: string
          voice_id: string
          voice_label: string
          voice_name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          voice_id: string
          voice_label: string
          voice_name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          voice_id?: string
          voice_label?: string
          voice_name?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_type: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_type: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pets: {
        Row: {
          adopted_at: string
          created_at: string
          energy: number
          happiness: number
          hunger: number
          id: string
          last_decay_at: string
          last_fed_at: string | null
          last_played_at: string | null
          last_rested_at: string | null
          pet_name: string
          pet_type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adopted_at?: string
          created_at?: string
          energy?: number
          happiness?: number
          hunger?: number
          id?: string
          last_decay_at?: string
          last_fed_at?: string | null
          last_played_at?: string | null
          last_rested_at?: string | null
          pet_name: string
          pet_type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adopted_at?: string
          created_at?: string
          energy?: number
          happiness?: number
          hunger?: number
          id?: string
          last_decay_at?: string
          last_fed_at?: string | null
          last_played_at?: string | null
          last_rested_at?: string | null
          pet_name?: string
          pet_type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pets_pet_type_id_fkey"
            columns: ["pet_type_id"]
            isOneToOne: false
            referencedRelation: "pet_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          coins_spent: number
          id: string
          purchased_at: string
          store_item_id: string
          user_id: string
        }
        Insert: {
          coins_spent: number
          id?: string
          purchased_at?: string
          store_item_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          id?: string
          purchased_at?: string
          store_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stickers: {
        Row: {
          collection_id: string
          first_obtained_at: string
          id: string
          last_obtained_at: string
          obtained_from: string
          quantity: number
          sticker_id: string
          user_id: string
        }
        Insert: {
          collection_id: string
          first_obtained_at?: string
          id?: string
          last_obtained_at?: string
          obtained_from?: string
          quantity?: number
          sticker_id: string
          user_id: string
        }
        Update: {
          collection_id?: string
          first_obtained_at?: string
          id?: string
          last_obtained_at?: string
          obtained_from?: string
          quantity?: number
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stickers_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "sticker_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_store_purchases: {
        Row: {
          coins_spent: number
          id: string
          is_redeemed: boolean
          metadata: Json | null
          purchased_at: string
          redeemed_at: string | null
          store_item_id: string
          user_id: string
        }
        Insert: {
          coins_spent: number
          id?: string
          is_redeemed?: boolean
          metadata?: Json | null
          purchased_at?: string
          redeemed_at?: string | null
          store_item_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          id?: string
          is_redeemed?: boolean
          metadata?: Json | null
          purchased_at?: string
          redeemed_at?: string | null
          store_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_purchases_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bestie_assets: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          asset_title: string | null
          asset_type: string
          asset_url: string
          bestie_id: string
          created_at: string
          id: string
          updated_at: string
          vendor_bestie_request_id: string | null
          vendor_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_title?: string | null
          asset_type: string
          asset_url: string
          bestie_id: string
          created_at?: string
          id?: string
          updated_at?: string
          vendor_bestie_request_id?: string | null
          vendor_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_title?: string | null
          asset_type?: string
          asset_url?: string
          bestie_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          vendor_bestie_request_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bestie_assets_vendor_bestie_request_id_fkey"
            columns: ["vendor_bestie_request_id"]
            isOneToOne: false
            referencedRelation: "vendor_bestie_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bestie_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_earnings"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_bestie_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bestie_requests: {
        Row: {
          bestie_id: string
          bestie_role: string | null
          created_at: string
          id: string
          message: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          bestie_id: string
          bestie_role?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          bestie_id?: string
          bestie_role?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bestie_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_earnings"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_bestie_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          banner_image_url: string | null
          business_name: string
          commission_percentage: number
          created_at: string
          description: string | null
          featured_bestie_id: string | null
          id: string
          logo_url: string | null
          rejection_reason: string | null
          social_links: Json | null
          status: Database["public"]["Enums"]["vendor_status"]
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_connect_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_payouts_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          banner_image_url?: string | null
          business_name: string
          commission_percentage?: number
          created_at?: string
          description?: string | null
          featured_bestie_id?: string | null
          id?: string
          logo_url?: string | null
          rejection_reason?: string | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["vendor_status"]
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          banner_image_url?: string | null
          business_name?: string
          commission_percentage?: number
          created_at?: string
          description?: string | null
          featured_bestie_id?: string | null
          id?: string
          logo_url?: string | null
          rejection_reason?: string | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["vendor_status"]
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          cover_timestamp: number | null
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          duration: number | null
          id: string
          is_active: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string | null
          video_url: string
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          cover_timestamp?: number | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          duration?: number | null
          id?: string
          is_active?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string | null
          video_url: string
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          cover_timestamp?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          duration?: number | null
          id?: string
          is_active?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string | null
          video_url?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      ways_to_give: {
        Row: {
          button_text: string
          button_url: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          gradient_from: string
          gradient_to: string
          hover_border_color: string
          icon: string
          icon_gradient_from: string
          icon_gradient_to: string
          id: string
          is_active: boolean
          is_popular: boolean
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string
          button_url: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          gradient_from?: string
          gradient_to?: string
          hover_border_color?: string
          icon?: string
          icon_gradient_from?: string
          icon_gradient_to?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string
          button_url?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          gradient_from?: string
          gradient_to?: string
          hover_border_color?: string
          icon?: string
          icon_gradient_from?: string
          icon_gradient_to?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      year_end_summary_sent: {
        Row: {
          created_at: string
          id: string
          resend_email_id: string | null
          sent_at: string
          status: string
          tax_year: number
          total_amount: number
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          resend_email_id?: string | null
          sent_at?: string
          status?: string
          tax_year: number
          total_amount: number
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          resend_email_id?: string | null
          sent_at?: string
          status?: string
          tax_year?: number
          total_amount?: number
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      year_end_summary_settings: {
        Row: {
          auto_send_day: number
          auto_send_enabled: boolean
          auto_send_month: number
          email_intro_text: string
          email_subject: string
          id: string
          tax_notice_text: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_send_day?: number
          auto_send_enabled?: boolean
          auto_send_month?: number
          email_intro_text?: string
          email_subject?: string
          id?: string
          tax_notice_text?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_send_day?: number
          auto_send_enabled?: boolean
          auto_send_month?: number
          email_intro_text?: string
          email_subject?: string
          id?: string
          tax_notice_text?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      bestie_funding_progress: {
        Row: {
          bestie_id: string | null
          bestie_name: string | null
          current_monthly_pledges: number | null
          featured_bestie_id: string | null
          funding_percentage: number | null
          monthly_goal: number | null
          remaining_needed: number | null
        }
        Relationships: []
      }
      donations_missing_receipts: {
        Row: {
          amount: number | null
          amount_charged: number | null
          donation_date: string | null
          donation_id: string | null
          donor_email: string | null
          frequency: string | null
          status: string | null
          stripe_mode: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          amount_charged?: number | null
          donation_date?: string | null
          donation_id?: string | null
          donor_email?: string | null
          frequency?: string | null
          status?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          amount_charged?: number | null
          donation_date?: string | null
          donation_id?: string | null
          donor_email?: string | null
          frequency?: string | null
          status?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      game_leaderboard: {
        Row: {
          best_moves: number | null
          best_time: number | null
          difficulty: string | null
          game_type: string | null
          games_played: number | null
          high_score: number | null
          total_coins: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orphaned_receipts_analysis: {
        Row: {
          amount: number | null
          donation_amount: number | null
          donation_created_at: string | null
          donation_status: string | null
          potential_donation_id: string | null
          receipt_created_at: string | null
          receipt_id: string | null
          sponsor_email: string | null
          sponsorship_id: string | null
          stripe_mode: string | null
          time_diff_seconds: number | null
          transaction_date: string | null
          transaction_id: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_number: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          friend_code: string | null
          id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
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
      sponsor_bestie_funding_progress: {
        Row: {
          bestie_id: string | null
          bestie_name: string | null
          current_monthly_pledges: number | null
          funding_percentage: number | null
          monthly_goal: number | null
          remaining_needed: number | null
          sponsor_bestie_id: string | null
        }
        Relationships: []
      }
      sponsor_bestie_funding_progress_by_mode: {
        Row: {
          bestie_id: string | null
          bestie_name: string | null
          current_monthly_pledges: number | null
          funding_percentage: number | null
          monthly_goal: number | null
          remaining_needed: number | null
          sponsor_bestie_id: string | null
          stripe_mode: string | null
        }
        Relationships: []
      }
      sponsorship_year_end_summary: {
        Row: {
          donations: Json[] | null
          first_donation_date: string | null
          last_donation_date: string | null
          sponsor_email: string | null
          sponsor_name: string | null
          tax_year: number | null
          total_amount: number | null
          total_donations: number | null
        }
        Relationships: []
      }
      vendor_earnings: {
        Row: {
          business_name: string | null
          total_earnings: number | null
          total_fees: number | null
          total_orders: number | null
          total_sales: number | null
          user_id: string | null
          vendor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_collections_on_start_date: { Args: never; Returns: undefined }
      backfill_missing_donations: {
        Args: never
        Returns: {
          amount: number
          created_donation_id: string
          receipt_id: string
          sponsor_email: string
          status: string
        }[]
      }
      can_moderate: { Args: { _user_id: string }; Returns: boolean }
      can_view_sponsorship: {
        Args: { _sponsorship_id: string; _user_id: string }
        Returns: boolean
      }
      check_collection_completion: {
        Args: { _collection_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          _endpoint: string
          _max_requests: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      deactivate_collections_after_end_date: { Args: never; Returns: undefined }
      generate_daily_scratch_card: {
        Args: { _user_id: string }
        Returns: string
      }
      generate_missing_receipts: {
        Args: never
        Returns: {
          amount: number
          created_receipt_id: string
          donation_id: string
          donor_email: string
          status: string
        }[]
      }
      get_notification_preferences: {
        Args: { _user_id: string }
        Returns: {
          email_on_approval_decision: boolean
          email_on_comment_on_post: boolean
          email_on_comment_on_thread: boolean
          email_on_event_update: boolean
          email_on_message_approved: boolean
          email_on_message_rejected: boolean
          email_on_new_event: boolean
          email_on_new_sponsor_message: boolean
          email_on_new_sponsorship: boolean
          email_on_pending_approval: boolean
          email_on_product_update: boolean
          email_on_sponsorship_update: boolean
          inapp_on_approval_decision: boolean
          inapp_on_comment_on_post: boolean
          inapp_on_comment_on_thread: boolean
          inapp_on_event_update: boolean
          inapp_on_message_approved: boolean
          inapp_on_message_rejected: boolean
          inapp_on_new_event: boolean
          inapp_on_new_sponsor_message: boolean
          inapp_on_new_sponsorship: boolean
          inapp_on_pending_approval: boolean
          inapp_on_product_update: boolean
          inapp_on_sponsorship_update: boolean
        }[]
      }
      get_public_app_settings: {
        Args: never
        Returns: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }[]
      }
      get_sponsor_bestie_funding_progress: {
        Args: never
        Returns: {
          bestie_id: string
          bestie_name: string
          current_monthly_pledges: number
          funding_percentage: number
          monthly_goal: number
          remaining_needed: number
          sponsor_bestie_id: string
          stripe_mode: string
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_needing_digest: {
        Args: { _frequency: string }
        Returns: {
          unread_count: number
          user_email: string
          user_id: string
        }[]
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission_type: string; _user_id: string }
        Returns: boolean
      }
      is_guardian_of: {
        Args: { _bestie_id: string; _guardian_id: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_for_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_vendor_for_order_item: {
        Args: { _user_id: string; _vendor_id: string }
        Returns: boolean
      }
      promote_collections_to_ga: { Args: never; Returns: undefined }
      update_featured_collections: { Args: never; Returns: undefined }
    }
    Enums: {
      avatar_category: "humans" | "animals" | "monsters" | "shapes"
      fulfillment_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      message_status:
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "pending_moderation"
      moderation_policy: "all" | "flagged" | "none"
      newsletter_campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "failed"
      newsletter_event_type:
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
      newsletter_status: "active" | "unsubscribed" | "bounced" | "complained"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "completed"
        | "cancelled"
        | "refunded"
      sticker_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      user_role:
        | "bestie"
        | "caregiver"
        | "supporter"
        | "admin"
        | "owner"
        | "vendor"
      vendor_status: "pending" | "approved" | "rejected" | "suspended"
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
      fulfillment_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      message_status: [
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "pending_moderation",
      ],
      moderation_policy: ["all", "flagged", "none"],
      newsletter_campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "failed",
      ],
      newsletter_event_type: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
      ],
      newsletter_status: ["active", "unsubscribed", "bounced", "complained"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
      ],
      sticker_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      user_role: [
        "bestie",
        "caregiver",
        "supporter",
        "admin",
        "owner",
        "vendor",
      ],
      vendor_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
