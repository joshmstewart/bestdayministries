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
      active_subscriptions_cache: {
        Row: {
          amount: number
          created_at: string
          current_period_end: string | null
          designation: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_mode: string
          stripe_subscription_id: string
          updated_at: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          current_period_end?: string | null
          designation?: string
          id?: string
          status: string
          stripe_customer_id?: string | null
          stripe_mode?: string
          stripe_subscription_id: string
          updated_at?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          current_period_end?: string | null
          designation?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_mode?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      address_validation_log: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          original_address: Json
          provider: string | null
          user_id: string | null
          validated_address: Json | null
          validation_messages: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          original_address: Json
          provider?: string | null
          user_id?: string | null
          validated_address?: Json | null
          validation_messages?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          original_address?: Json
          provider?: string | null
          user_id?: string | null
          validated_address?: Json | null
          validation_messages?: string[] | null
        }
        Relationships: []
      }
      ai_gateway_usage_log: {
        Row: {
          created_at: string
          estimated_cost: number | null
          function_name: string
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          function_name: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          user_id?: string | null
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
          image_url: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_severity: string | null
          moderation_status: string | null
          original_image_url: string | null
          video_id: string | null
          video_type: string | null
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          original_image_url?: string | null
          video_id?: string | null
          video_type?: string | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_severity?: string | null
          moderation_status?: string | null
          original_image_url?: string | null
          video_id?: string | null
          video_type?: string | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_images_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_images_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
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
      app_configurations: {
        Row: {
          app_id: string
          category: string | null
          created_at: string
          display_name: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          app_id: string
          category?: string | null
          created_at?: string
          display_name?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          app_id?: string
          category?: string | null
          created_at?: string
          display_name?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
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
      badge_earned_email_queue: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_name: string
          created_at: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          recipient_email: string
          recipient_name: string | null
          recipient_user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          recipient_user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_user_id?: string
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
      beat_pad_creations: {
        Row: {
          ai_audio_url: string | null
          created_at: string
          creator_id: string
          id: string
          image_url: string | null
          instrument_order: string[] | null
          is_public: boolean
          likes_count: number
          name: string
          pattern: Json
          plays_count: number | null
          tempo: number
          updated_at: string
        }
        Insert: {
          ai_audio_url?: string | null
          created_at?: string
          creator_id: string
          id?: string
          image_url?: string | null
          instrument_order?: string[] | null
          is_public?: boolean
          likes_count?: number
          name?: string
          pattern?: Json
          plays_count?: number | null
          tempo?: number
          updated_at?: string
        }
        Update: {
          ai_audio_url?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          image_url?: string | null
          instrument_order?: string[] | null
          is_public?: boolean
          likes_count?: number
          name?: string
          pattern?: Json
          plays_count?: number | null
          tempo?: number
          updated_at?: string
        }
        Relationships: []
      }
      beat_pad_likes: {
        Row: {
          created_at: string
          creation_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creation_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_pad_likes_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "beat_pad_creations"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_pad_presets: {
        Row: {
          created_at: string
          id: string
          instrument_ids: string[]
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instrument_ids: string[]
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instrument_ids?: string[]
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beat_pad_sounds: {
        Row: {
          audio_url: string | null
          category: string | null
          color: string
          created_at: string
          decay: number | null
          description: string | null
          display_order: number | null
          emoji: string
          frequency: number | null
          has_noise: boolean | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          oscillator_type: string | null
          price_coins: number
          sound_type: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          color?: string
          created_at?: string
          decay?: number | null
          description?: string | null
          display_order?: number | null
          emoji?: string
          frequency?: number | null
          has_noise?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          oscillator_type?: string | null
          price_coins?: number
          sound_type: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          color?: string
          created_at?: string
          decay?: number | null
          description?: string | null
          display_order?: number | null
          emoji?: string
          frequency?: number | null
          has_noise?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          oscillator_type?: string | null
          price_coins?: number
          sound_type?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
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
      card_designs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_designs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      card_likes: {
        Row: {
          card_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_likes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "user_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_templates: {
        Row: {
          background_image_url: string | null
          category: string | null
          coin_price: number
          cover_image_url: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_free: boolean
          title: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          category?: string | null
          coin_price?: number
          cover_image_url: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_free?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          category?: string | null
          coin_price?: number
          cover_image_url?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_free?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_word_arts: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          phrase: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          phrase: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          phrase?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_word_arts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
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
          require_prayer_approval: boolean | null
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
          require_prayer_approval?: boolean | null
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
          require_prayer_approval?: boolean | null
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
      cash_register_customers: {
        Row: {
          character_type: string
          created_at: string
          description: string | null
          disability: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_pack_only: boolean
          name: string
          updated_at: string
        }
        Insert: {
          character_type: string
          created_at?: string
          description?: string | null
          disability?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_pack_only?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          character_type?: string
          created_at?: string
          description?: string | null
          disability?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_pack_only?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_leaderboard_rewards: {
        Row: {
          awarded_at: string | null
          coins_awarded: number
          duration_seconds: number
          id: string
          rank: number
          reward_month: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          coins_awarded: number
          duration_seconds: number
          id?: string
          rank: number
          reward_month: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          coins_awarded?: number
          duration_seconds?: number
          id?: string
          rank?: number
          reward_month?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_register_pack_items: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          pack_id: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          pack_id: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          pack_id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_pack_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "cash_register_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "cash_register_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_pack_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "cash_register_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_packs: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pack_type: string
          price_coins: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pack_type?: string
          price_coins?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pack_type?: string
          price_coins?: number
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_stores: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_default: boolean | null
          is_free: boolean
          is_pack_only: boolean
          menu_items: Json | null
          name: string
          price_coins: number
          receipt_address: string | null
          receipt_tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_free?: boolean
          is_pack_only?: boolean
          menu_items?: Json | null
          name: string
          price_coins?: number
          receipt_address?: string | null
          receipt_tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_free?: boolean
          is_pack_only?: boolean
          menu_items?: Json | null
          name?: string
          price_coins?: number
          receipt_address?: string | null
          receipt_tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_time_trial_bests: {
        Row: {
          achieved_at: string
          best_levels: number
          best_score: number
          duration_seconds: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          best_levels?: number
          best_score?: number
          duration_seconds: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          best_levels?: number
          best_score?: number
          duration_seconds?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_register_time_trial_scores: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          levels_completed: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          id?: string
          levels_completed?: number
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          levels_completed?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      cash_register_user_stats: {
        Row: {
          best_level: number
          created_at: string
          current_month_score: number | null
          current_month_year: string | null
          high_score: number
          id: string
          total_games_played: number
          total_levels_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_level?: number
          created_at?: string
          current_month_score?: number | null
          current_month_year?: string | null
          high_score?: number
          id?: string
          total_games_played?: number
          total_levels_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_level?: number
          created_at?: string
          current_month_score?: number | null
          current_month_year?: string | null
          high_score?: number
          id?: string
          total_games_played?: number
          total_levels_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      chore_badge_images: {
        Row: {
          badge_type: string
          created_at: string
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          badge_type: string
          created_at?: string
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      chore_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chore_celebration_images: {
        Row: {
          activity_category: string
          avatar_id: string | null
          completion_date: string
          created_at: string
          id: string
          image_url: string
          location_id: string | null
          location_name: string | null
          location_pack_name: string | null
          user_id: string
        }
        Insert: {
          activity_category: string
          avatar_id?: string | null
          completion_date: string
          created_at?: string
          id?: string
          image_url: string
          location_id?: string | null
          location_name?: string | null
          location_pack_name?: string | null
          user_id: string
        }
        Update: {
          activity_category?: string
          avatar_id?: string | null
          completion_date?: string
          created_at?: string
          id?: string
          image_url?: string
          location_id?: string | null
          location_name?: string | null
          location_pack_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_celebration_images_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "fitness_avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_celebration_images_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "workout_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_challenge_daily_completions: {
        Row: {
          completion_date: string
          created_at: string
          id: string
          sticker_earned: boolean
          sticker_placed: boolean
          theme_id: string
          user_id: string
        }
        Insert: {
          completion_date: string
          created_at?: string
          id?: string
          sticker_earned?: boolean
          sticker_placed?: boolean
          theme_id: string
          user_id: string
        }
        Update: {
          completion_date?: string
          created_at?: string
          id?: string
          sticker_earned?: boolean
          sticker_placed?: boolean
          theme_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_challenge_daily_completions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "chore_challenge_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_challenge_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          likes_count: number
          progress_id: string
          theme_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          likes_count?: number
          progress_id: string
          theme_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          likes_count?: number
          progress_id?: string
          theme_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_challenge_gallery_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "chore_challenge_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_challenge_gallery_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "chore_challenge_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_challenge_gallery_likes: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_challenge_gallery_likes_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "chore_challenge_gallery"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_challenge_progress: {
        Row: {
          completed_at: string | null
          completion_days: number
          created_at: string
          id: string
          is_completed: boolean
          placed_stickers: Json
          selected_background: string | null
          shared_at: string | null
          shared_image_url: string | null
          theme_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_days?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          placed_stickers?: Json
          selected_background?: string | null
          shared_at?: string | null
          shared_image_url?: string | null
          theme_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_days?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          placed_stickers?: Json
          selected_background?: string | null
          shared_at?: string | null
          shared_image_url?: string | null
          theme_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_challenge_progress_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "chore_challenge_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_challenge_themes: {
        Row: {
          background_options: Json
          badge_description: string | null
          badge_icon: string
          badge_name: string
          coin_reward: number
          created_at: string
          days_required: number
          description: string | null
          id: string
          is_active: boolean
          month: number
          name: string
          sticker_elements: Json
          updated_at: string
          year: number
        }
        Insert: {
          background_options?: Json
          badge_description?: string | null
          badge_icon: string
          badge_name: string
          coin_reward?: number
          created_at?: string
          days_required?: number
          description?: string | null
          id?: string
          is_active?: boolean
          month: number
          name: string
          sticker_elements?: Json
          updated_at?: string
          year: number
        }
        Update: {
          background_options?: Json
          badge_description?: string | null
          badge_icon?: string
          badge_name?: string
          coin_reward?: number
          created_at?: string
          days_required?: number
          description?: string | null
          id?: string
          is_active?: boolean
          month?: number
          name?: string
          sticker_elements?: Json
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      chore_completions: {
        Row: {
          chore_id: string
          completed_at: string
          completed_date: string
          id: string
          user_id: string
        }
        Insert: {
          chore_id: string
          completed_at?: string
          completed_date?: string
          id?: string
          user_id: string
        }
        Update: {
          chore_id?: string
          completed_at?: string
          completed_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_completions_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_daily_rewards: {
        Row: {
          claimed_at: string
          id: string
          reward_date: string
          reward_type: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_date?: string
          reward_type?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_date?: string
          reward_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_daily_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_daily_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_completion_date: string | null
          longest_streak: number
          total_completion_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          total_completion_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          total_completion_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chore_wheel_spins: {
        Row: {
          created_at: string
          id: string
          prize_amount: number
          prize_type: string
          spin_date: string
          user_id: string
          wheel_config: string
        }
        Insert: {
          created_at?: string
          id?: string
          prize_amount: number
          prize_type: string
          spin_date: string
          user_id: string
          wheel_config: string
        }
        Update: {
          created_at?: string
          id?: string
          prize_amount?: number
          prize_type?: string
          spin_date?: string
          user_id?: string
          wheel_config?: string
        }
        Relationships: []
      }
      chores: {
        Row: {
          bestie_id: string
          created_at: string
          created_by: string
          day_of_week: number | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          recurrence_type: Database["public"]["Enums"]["chore_recurrence_type"]
          recurrence_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          bestie_id: string
          created_at?: string
          created_by: string
          day_of_week?: number | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          recurrence_type?: Database["public"]["Enums"]["chore_recurrence_type"]
          recurrence_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          bestie_id?: string
          created_at?: string
          created_by?: string
          day_of_week?: number | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          recurrence_type?: Database["public"]["Enums"]["chore_recurrence_type"]
          recurrence_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_bestie_id_fkey"
            columns: ["bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_products: {
        Row: {
          cost_price: number
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          images: string[] | null
          is_active: boolean
          name: string
          selling_price: number
          shipstation_sku: string
          updated_at: string
        }
        Insert: {
          cost_price: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name: string
          selling_price: number
          shipstation_sku: string
          updated_at?: string
        }
        Update: {
          cost_price?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name?: string
          selling_price?: number
          shipstation_sku?: string
          updated_at?: string
        }
        Relationships: []
      }
      coffee_shop_menu_addons: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          price: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "coffee_shop_menu_addons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "coffee_shop_menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_shop_menu_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coffee_shop_menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          price_hot_12oz: number | null
          price_hot_16oz: number | null
          price_iced_16oz: number | null
          price_iced_24oz: number | null
          price_large: number | null
          price_small: number | null
          single_price: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_hot_12oz?: number | null
          price_hot_16oz?: number | null
          price_iced_16oz?: number | null
          price_iced_24oz?: number | null
          price_large?: number | null
          price_small?: number | null
          single_price?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_hot_12oz?: number | null
          price_hot_16oz?: number | null
          price_iced_16oz?: number | null
          price_iced_24oz?: number | null
          price_large?: number | null
          price_small?: number | null
          single_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_shop_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "coffee_shop_menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_rewards_settings: {
        Row: {
          category: string
          coins_amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          reward_key: string
          reward_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          coins_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          reward_key: string
          reward_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          coins_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          reward_key?: string
          reward_name?: string
          updated_at?: string
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
      coloring_books: {
        Row: {
          coin_price: number
          cover_image_url: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          generation_prompt: string | null
          id: string
          is_active: boolean
          is_free: boolean
          title: string
          updated_at: string
        }
        Insert: {
          coin_price?: number
          cover_image_url: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          generation_prompt?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          coin_price?: number
          cover_image_url?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          generation_prompt?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coloring_likes: {
        Row: {
          coloring_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          coloring_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          coloring_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coloring_likes_coloring_id_fkey"
            columns: ["coloring_id"]
            isOneToOne: false
            referencedRelation: "user_colorings"
            referencedColumns: ["id"]
          },
        ]
      }
      coloring_pages: {
        Row: {
          book_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coloring_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "coloring_books"
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
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
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
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
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
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
      contact_form_replies: {
        Row: {
          cc_emails: string[] | null
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
          cc_emails?: string[] | null
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
          cc_emails?: string[] | null
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
          assigned_to: string | null
          cc_emails: string[] | null
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
          assigned_to?: string | null
          cc_emails?: string[] | null
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
          assigned_to?: string | null
          cc_emails?: string[] | null
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
      content_announcement_likes: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_announcement_likes_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "content_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      content_announcements: {
        Row: {
          announcement_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_free: boolean | null
          likes_count: number
          link_label: string | null
          link_url: string | null
          price_coins: number | null
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          likes_count?: number
          link_label?: string | null
          link_url?: string | null
          price_coins?: number | null
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          likes_count?: number
          link_label?: string | null
          link_url?: string | null
          price_coins?: number | null
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_like_email_queue: {
        Row: {
          content_link: string | null
          content_title: string | null
          content_type: string
          created_at: string | null
          error_message: string | null
          id: string
          liker_name: string
          processed_at: string | null
          recipient_email: string
          recipient_name: string | null
          recipient_user_id: string
        }
        Insert: {
          content_link?: string | null
          content_title?: string | null
          content_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          liker_name: string
          processed_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          recipient_user_id: string
        }
        Update: {
          content_link?: string | null
          content_title?: string | null
          content_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          liker_name?: string
          processed_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_user_id?: string
        }
        Relationships: []
      }
      currency_images: {
        Row: {
          created_at: string
          denomination: string
          denomination_type: string
          display_name: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          denomination: string
          denomination_type: string
          display_name: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          denomination?: string
          denomination_type?: string
          display_name?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      custom_drink_likes: {
        Row: {
          created_at: string
          drink_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drink_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drink_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_drink_likes_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "custom_drinks"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_drinks: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          generated_image_url: string | null
          id: string
          ingredients: string[]
          is_public: boolean
          likes_count: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          generated_image_url?: string | null
          id?: string
          ingredients: string[]
          is_public?: boolean
          likes_count?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          generated_image_url?: string | null
          id?: string
          ingredients?: string[]
          is_public?: boolean
          likes_count?: number
          name?: string
          updated_at?: string
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
      donation_history_cache: {
        Row: {
          amount: number
          created_at: string
          designation: string
          donation_date: string
          frequency: string
          id: string
          receipt_url: string | null
          status: string
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_mode: string
          stripe_subscription_id: string | null
          updated_at: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          designation?: string
          donation_date: string
          frequency: string
          id?: string
          receipt_url?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_mode?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          designation?: string
          donation_date?: string
          frequency?: string
          id?: string
          receipt_url?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_mode?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      donation_stripe_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          designation: string | null
          donation_id: string | null
          donor_id: string | null
          email: string
          frequency: string
          id: string
          merged_metadata: Json | null
          raw_charge: Json | null
          raw_checkout_session: Json | null
          raw_invoice: Json | null
          raw_payment_intent: Json | null
          receipt_id: string | null
          status: string
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_mode: string
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          designation?: string | null
          donation_id?: string | null
          donor_id?: string | null
          email: string
          frequency: string
          id?: string
          merged_metadata?: Json | null
          raw_charge?: Json | null
          raw_checkout_session?: Json | null
          raw_invoice?: Json | null
          raw_payment_intent?: Json | null
          receipt_id?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_mode: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          transaction_date: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          designation?: string | null
          donation_id?: string | null
          donor_id?: string | null
          email?: string
          frequency?: string
          id?: string
          merged_metadata?: Json | null
          raw_charge?: Json | null
          raw_checkout_session?: Json | null
          raw_invoice?: Json | null
          raw_payment_intent?: Json | null
          receipt_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_mode?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_stripe_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_stripe_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations_missing_receipts"
            referencedColumns: ["donation_id"]
          },
          {
            foreignKeyName: "donation_stripe_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "orphaned_receipts_analysis"
            referencedColumns: ["potential_donation_id"]
          },
          {
            foreignKeyName: "donation_stripe_transactions_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_stripe_transactions_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_stripe_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "orphaned_receipts_analysis"
            referencedColumns: ["receipt_id"]
          },
          {
            foreignKeyName: "donation_stripe_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_sync_status: {
        Row: {
          donations_synced: number | null
          error_message: string | null
          id: string
          last_synced_at: string
          stripe_mode: string
          subscriptions_synced: number | null
          sync_status: string
          user_email: string
        }
        Insert: {
          donations_synced?: number | null
          error_message?: string | null
          id?: string
          last_synced_at?: string
          stripe_mode?: string
          subscriptions_synced?: number | null
          sync_status?: string
          user_email: string
        }
        Update: {
          donations_synced?: number | null
          error_message?: string | null
          id?: string
          last_synced_at?: string
          stripe_mode?: string
          subscriptions_synced?: number | null
          sync_status?: string
          user_email?: string
        }
        Relationships: []
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
      drink_ingredients: {
        Row: {
          category: Database["public"]["Enums"]["ingredient_category"]
          color_hint: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ingredient_category"]
          color_hint?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ingredient_category"]
          color_hint?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      drink_vibes: {
        Row: {
          atmosphere_hint: string
          created_at: string
          description: string
          display_order: number
          emoji: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          atmosphere_hint: string
          created_at?: string
          description: string
          display_order?: number
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          atmosphere_hint?: string
          created_at?: string
          description?: string
          display_order?: number
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
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
      emotion_journal_entries: {
        Row: {
          audio_url: string | null
          coping_strategies: string[] | null
          created_at: string
          emotion: string
          emotion_emoji: string
          id: string
          intensity: number
          journal_text: string | null
          triggers: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          coping_strategies?: string[] | null
          created_at?: string
          emotion: string
          emotion_emoji: string
          id?: string
          intensity: number
          journal_text?: string | null
          triggers?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          coping_strategies?: string[] | null
          created_at?: string
          emotion?: string
          emotion_emoji?: string
          id?: string
          intensity?: number
          journal_text?: string | null
          triggers?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotion_types: {
        Row: {
          category: string
          color: string
          coping_suggestions: string[] | null
          created_at: string
          display_order: number
          emoji: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string
          color?: string
          coping_suggestions?: string[] | null
          created_at?: string
          display_order?: number
          emoji: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          color?: string
          coping_suggestions?: string[] | null
          created_at?: string
          display_order?: number
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
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
      event_email_queue: {
        Row: {
          created_at: string
          error_message: string | null
          event_date: string | null
          event_id: string
          event_image_url: string | null
          event_link_label: string | null
          event_link_url: string | null
          event_location: string | null
          event_title: string
          id: string
          processed: boolean | null
          processed_at: string | null
          retry_count: number | null
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_date?: string | null
          event_id: string
          event_image_url?: string | null
          event_link_label?: string | null
          event_link_url?: string | null
          event_location?: string | null
          event_title: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_date?: string | null
          event_id?: string
          event_image_url?: string | null
          event_link_label?: string | null
          event_link_url?: string | null
          event_location?: string | null
          event_title?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      event_likes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_likes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_update_email_queue: {
        Row: {
          change_description: string
          created_at: string
          event_date: string | null
          event_id: string
          event_location: string | null
          event_title: string
          id: string
          processed: boolean
          processed_at: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          change_description: string
          created_at?: string
          event_date?: string | null
          event_id: string
          event_location?: string | null
          event_title: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          change_description?: string
          created_at?: string
          event_date?: string | null
          event_id?: string
          event_location?: string | null
          event_title?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
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
          likes_count: number
          link_label: string | null
          link_url: string | null
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
          status: string
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
          likes_count?: number
          link_label?: string | null
          link_url?: string | null
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
          status?: string
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
          likes_count?: number
          link_label?: string | null
          link_url?: string | null
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
          status?: string
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
      feed_reposts: {
        Row: {
          created_at: string
          id: string
          original_item_id: string
          original_item_type: string
          reposted_at: string
          reposted_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          original_item_id: string
          original_item_type: string
          reposted_at?: string
          reposted_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          original_item_id?: string
          original_item_type?: string
          reposted_at?: string
          reposted_by?: string | null
        }
        Relationships: []
      }
      fitness_avatar_celebration_images: {
        Row: {
          avatar_id: string
          celebration_type: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_id: string
          celebration_type?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_id?: string
          celebration_type?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_avatar_celebration_images_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "fitness_avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_avatar_templates: {
        Row: {
          archived_at: string | null
          character_type: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
          prompt: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          character_type: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          prompt: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          character_type?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      fitness_avatars: {
        Row: {
          category: string | null
          character_prompt: string
          character_type: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_free: boolean
          name: string
          preview_image_url: string | null
          price_coins: number
          sex: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          character_prompt: string
          character_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          name: string
          preview_image_url?: string | null
          price_coins?: number
          sex?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          character_prompt?: string
          character_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          name?: string
          preview_image_url?: string | null
          price_coins?: number
          sex?: string | null
          updated_at?: string
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
      guardian_resources: {
        Row: {
          attachments: Json | null
          category: string
          content: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          has_content_page: boolean
          icon: string | null
          id: string
          is_active: boolean
          resource_type: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          attachments?: Json | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          has_content_page?: boolean
          icon?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          has_content_page?: boolean
          icon?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
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
      joke_categories: {
        Row: {
          coin_price: number
          created_at: string
          description: string | null
          display_order: number
          emoji: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_free: boolean
          name: string
          show_in_selector: boolean | null
          updated_at: string
        }
        Insert: {
          coin_price?: number
          created_at?: string
          description?: string | null
          display_order?: number
          emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name: string
          show_in_selector?: boolean | null
          updated_at?: string
        }
        Update: {
          coin_price?: number
          created_at?: string
          description?: string | null
          display_order?: number
          emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name?: string
          show_in_selector?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      joke_library: {
        Row: {
          ai_quality_rating: string | null
          ai_quality_reason: string | null
          ai_reviewed_at: string | null
          answer: string
          category: string | null
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_reviewed: boolean
          question: string
          times_served: number | null
        }
        Insert: {
          ai_quality_rating?: string | null
          ai_quality_reason?: string | null
          ai_reviewed_at?: string | null
          answer: string
          category?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_reviewed?: boolean
          question: string
          times_served?: number | null
        }
        Update: {
          ai_quality_rating?: string | null
          ai_quality_reason?: string | null
          ai_reviewed_at?: string | null
          answer?: string
          category?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_reviewed?: boolean
          question?: string
          times_served?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "joke_library_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "joke_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      joke_likes: {
        Row: {
          created_at: string
          id: string
          joke_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joke_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joke_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "joke_likes_joke_id_fkey"
            columns: ["joke_id"]
            isOneToOne: false
            referencedRelation: "saved_jokes"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_house_store_images: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_hero: boolean | null
          location_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_hero?: boolean | null
          location_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_hero?: boolean | null
          location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joy_house_store_images_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "joy_house_store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_house_store_locations: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          hours: Json | null
          hours_vary_seasonally: boolean
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hours?: Json | null
          hours_vary_seasonally?: boolean
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hours?: Json | null
          hours_vary_seasonally?: boolean
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      joy_house_stores_content: {
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
          setting_value?: Json
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
      marketplace_reconciliation_log: {
        Row: {
          cancelled: number
          confirmed: number
          created_at: string
          details: Json | null
          errors: number
          id: string
          orders_checked: number
          run_at: string
          skipped: number
        }
        Insert: {
          cancelled?: number
          confirmed?: number
          created_at?: string
          details?: Json | null
          errors?: number
          id?: string
          orders_checked?: number
          run_at?: string
          skipped?: number
        }
        Update: {
          cancelled?: number
          confirmed?: number
          created_at?: string
          details?: Json | null
          errors?: number
          id?: string
          orders_checked?: number
          run_at?: string
          skipped?: number
        }
        Relationships: []
      }
      memory_match_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string | null
          name: string
          pack_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          name: string
          pack_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          name?: string
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_match_images_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "memory_match_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_match_packs: {
        Row: {
          background_color: string | null
          card_back_url: string | null
          created_at: string
          description: string | null
          design_style: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_purchasable: boolean | null
          module_color: string | null
          name: string
          preview_image_url: string | null
          price_coins: number | null
          store_item_id: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          card_back_url?: string | null
          created_at?: string
          description?: string | null
          design_style?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_purchasable?: boolean | null
          module_color?: string | null
          name: string
          preview_image_url?: string | null
          price_coins?: number | null
          store_item_id?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          card_back_url?: string | null
          created_at?: string
          description?: string | null
          design_style?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_purchasable?: boolean | null
          module_color?: string | null
          name?: string
          preview_image_url?: string | null
          price_coins?: number | null
          store_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_match_packs_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
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
          bestie_emoji: string | null
          created_at: string
          created_by: string
          display_order: number
          emoji: string | null
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
          bestie_emoji?: string | null
          created_at?: string
          created_by: string
          display_order?: number
          emoji?: string | null
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
          bestie_emoji?: string | null
          created_at?: string
          created_by?: string
          display_order?: number
          emoji?: string | null
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
          email_on_badge_earned: boolean | null
          email_on_comment_on_post: boolean
          email_on_comment_on_thread: boolean
          email_on_content_like: boolean | null
          email_on_event_update: boolean
          email_on_message_approved: boolean
          email_on_message_rejected: boolean
          email_on_new_content_announcement: boolean | null
          email_on_new_event: boolean
          email_on_new_sponsor_message: boolean
          email_on_new_sponsorship: boolean
          email_on_order_delivered: boolean | null
          email_on_order_shipped: boolean | null
          email_on_pending_approval: boolean
          email_on_prayed_for_you: boolean | null
          email_on_prayer_approved: boolean | null
          email_on_prayer_expiring: boolean | null
          email_on_prayer_pending_approval: boolean | null
          email_on_prayer_rejected: boolean | null
          email_on_product_update: boolean | null
          email_on_sponsorship_update: boolean
          enable_digest_emails: boolean
          id: string
          inapp_on_approval_decision: boolean
          inapp_on_badge_earned: boolean | null
          inapp_on_comment_on_post: boolean
          inapp_on_comment_on_thread: boolean
          inapp_on_content_like: boolean | null
          inapp_on_event_update: boolean
          inapp_on_message_approved: boolean
          inapp_on_message_rejected: boolean
          inapp_on_new_content_announcement: boolean | null
          inapp_on_new_event: boolean
          inapp_on_new_sponsor_message: boolean
          inapp_on_new_sponsorship: boolean
          inapp_on_order_delivered: boolean | null
          inapp_on_order_shipped: boolean | null
          inapp_on_pending_approval: boolean
          inapp_on_prayed_for_you: boolean | null
          inapp_on_prayer_approved: boolean | null
          inapp_on_prayer_expiring: boolean | null
          inapp_on_prayer_pending_approval: boolean | null
          inapp_on_prayer_rejected: boolean | null
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
          email_on_badge_earned?: boolean | null
          email_on_comment_on_post?: boolean
          email_on_comment_on_thread?: boolean
          email_on_content_like?: boolean | null
          email_on_event_update?: boolean
          email_on_message_approved?: boolean
          email_on_message_rejected?: boolean
          email_on_new_content_announcement?: boolean | null
          email_on_new_event?: boolean
          email_on_new_sponsor_message?: boolean
          email_on_new_sponsorship?: boolean
          email_on_order_delivered?: boolean | null
          email_on_order_shipped?: boolean | null
          email_on_pending_approval?: boolean
          email_on_prayed_for_you?: boolean | null
          email_on_prayer_approved?: boolean | null
          email_on_prayer_expiring?: boolean | null
          email_on_prayer_pending_approval?: boolean | null
          email_on_prayer_rejected?: boolean | null
          email_on_product_update?: boolean | null
          email_on_sponsorship_update?: boolean
          enable_digest_emails?: boolean
          id?: string
          inapp_on_approval_decision?: boolean
          inapp_on_badge_earned?: boolean | null
          inapp_on_comment_on_post?: boolean
          inapp_on_comment_on_thread?: boolean
          inapp_on_content_like?: boolean | null
          inapp_on_event_update?: boolean
          inapp_on_message_approved?: boolean
          inapp_on_message_rejected?: boolean
          inapp_on_new_content_announcement?: boolean | null
          inapp_on_new_event?: boolean
          inapp_on_new_sponsor_message?: boolean
          inapp_on_new_sponsorship?: boolean
          inapp_on_order_delivered?: boolean | null
          inapp_on_order_shipped?: boolean | null
          inapp_on_pending_approval?: boolean
          inapp_on_prayed_for_you?: boolean | null
          inapp_on_prayer_approved?: boolean | null
          inapp_on_prayer_expiring?: boolean | null
          inapp_on_prayer_pending_approval?: boolean | null
          inapp_on_prayer_rejected?: boolean | null
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
          email_on_badge_earned?: boolean | null
          email_on_comment_on_post?: boolean
          email_on_comment_on_thread?: boolean
          email_on_content_like?: boolean | null
          email_on_event_update?: boolean
          email_on_message_approved?: boolean
          email_on_message_rejected?: boolean
          email_on_new_content_announcement?: boolean | null
          email_on_new_event?: boolean
          email_on_new_sponsor_message?: boolean
          email_on_new_sponsorship?: boolean
          email_on_order_delivered?: boolean | null
          email_on_order_shipped?: boolean | null
          email_on_pending_approval?: boolean
          email_on_prayed_for_you?: boolean | null
          email_on_prayer_approved?: boolean | null
          email_on_prayer_expiring?: boolean | null
          email_on_prayer_pending_approval?: boolean | null
          email_on_prayer_rejected?: boolean | null
          email_on_product_update?: boolean | null
          email_on_sponsorship_update?: boolean
          enable_digest_emails?: boolean
          id?: string
          inapp_on_approval_decision?: boolean
          inapp_on_badge_earned?: boolean | null
          inapp_on_comment_on_post?: boolean
          inapp_on_comment_on_thread?: boolean
          inapp_on_content_like?: boolean | null
          inapp_on_event_update?: boolean
          inapp_on_message_approved?: boolean
          inapp_on_message_rejected?: boolean
          inapp_on_new_content_announcement?: boolean | null
          inapp_on_new_event?: boolean
          inapp_on_new_sponsor_message?: boolean
          inapp_on_new_sponsorship?: boolean
          inapp_on_order_delivered?: boolean | null
          inapp_on_order_shipped?: boolean | null
          inapp_on_pending_approval?: boolean
          inapp_on_prayed_for_you?: boolean | null
          inapp_on_prayer_approved?: boolean | null
          inapp_on_prayer_expiring?: boolean | null
          inapp_on_prayer_pending_approval?: boolean | null
          inapp_on_prayer_rejected?: boolean | null
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
          last_transfer_attempt: string | null
          order_id: string
          platform_fee: number | null
          price_at_purchase: number
          printify_line_item_id: string | null
          printify_order_id: string | null
          printify_status: string | null
          product_id: string
          quantity: number
          shipped_at: string | null
          shipping_amount_cents: number | null
          shipping_carrier: string | null
          shipping_service: string | null
          shipstation_last_checked_at: string | null
          shipstation_order_id: string | null
          shipstation_order_key: string | null
          shipstation_shipment_id: string | null
          shipstation_synced_at: string | null
          stripe_transfer_id: string | null
          tracking_number: string | null
          tracking_url: string | null
          transfer_attempts: number | null
          transfer_error_message: string | null
          transfer_status: string | null
          vendor_id: string | null
          vendor_payout: number | null
          weight_oz: number | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          last_transfer_attempt?: string | null
          order_id: string
          platform_fee?: number | null
          price_at_purchase: number
          printify_line_item_id?: string | null
          printify_order_id?: string | null
          printify_status?: string | null
          product_id: string
          quantity: number
          shipped_at?: string | null
          shipping_amount_cents?: number | null
          shipping_carrier?: string | null
          shipping_service?: string | null
          shipstation_last_checked_at?: string | null
          shipstation_order_id?: string | null
          shipstation_order_key?: string | null
          shipstation_shipment_id?: string | null
          shipstation_synced_at?: string | null
          stripe_transfer_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          transfer_attempts?: number | null
          transfer_error_message?: string | null
          transfer_status?: string | null
          vendor_id?: string | null
          vendor_payout?: number | null
          weight_oz?: number | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          last_transfer_attempt?: string | null
          order_id?: string
          platform_fee?: number | null
          price_at_purchase?: number
          printify_line_item_id?: string | null
          printify_order_id?: string | null
          printify_status?: string | null
          product_id?: string
          quantity?: number
          shipped_at?: string | null
          shipping_amount_cents?: number | null
          shipping_carrier?: string | null
          shipping_service?: string | null
          shipstation_last_checked_at?: string | null
          shipstation_order_id?: string | null
          shipstation_order_key?: string | null
          shipstation_shipment_id?: string | null
          shipstation_synced_at?: string | null
          stripe_transfer_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          transfer_attempts?: number | null
          transfer_error_message?: string | null
          transfer_status?: string | null
          vendor_id?: string | null
          vendor_payout?: number | null
          weight_oz?: number | null
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
          customer_email: string | null
          customer_id: string | null
          id: string
          notes: string | null
          paid_at: string | null
          selected_shipping_service: string | null
          shipping_address: Json | null
          shipping_address_validated: boolean | null
          shipping_breakdown: Json | null
          shipping_provider: string | null
          shipping_total_cents: number | null
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
          customer_email?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          selected_shipping_service?: string | null
          shipping_address?: Json | null
          shipping_address_validated?: boolean | null
          shipping_breakdown?: Json | null
          shipping_provider?: string | null
          shipping_total_cents?: number | null
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
          customer_email?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          selected_shipping_service?: string | null
          shipping_address?: Json | null
          shipping_address_validated?: boolean | null
          shipping_breakdown?: Json | null
          shipping_provider?: string | null
          shipping_total_cents?: number | null
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
      page_visits: {
        Row: {
          id: string
          page_title: string | null
          page_url: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          page_title?: string | null
          page_url: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          page_title?: string | null
          page_url?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string
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
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
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
      picture_password_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string
          was_successful: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address: string
          was_successful?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string
          was_successful?: boolean
        }
        Relationships: []
      }
      picture_password_notifications: {
        Row: {
          created_at: string | null
          dismissed_at: string | null
          dont_show_again: boolean | null
          id: string
          is_read: boolean | null
          notification_type: string
          picture_sequence: string[] | null
          related_bestie_id: string | null
          related_bestie_name: string | null
          remind_after: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed_at?: string | null
          dont_show_again?: boolean | null
          id?: string
          is_read?: boolean | null
          notification_type: string
          picture_sequence?: string[] | null
          related_bestie_id?: string | null
          related_bestie_name?: string | null
          remind_after?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed_at?: string | null
          dont_show_again?: boolean | null
          id?: string
          is_read?: boolean | null
          notification_type?: string
          picture_sequence?: string[] | null
          related_bestie_id?: string | null
          related_bestie_name?: string | null
          remind_after?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "picture_password_notifications_related_bestie_id_fkey"
            columns: ["related_bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picture_password_notifications_related_bestie_id_fkey"
            columns: ["related_bestie_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      picture_passwords: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          picture_sequence: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          picture_sequence: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          picture_sequence?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "picture_passwords_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picture_passwords_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picture_passwords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picture_passwords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_request_likes: {
        Row: {
          created_at: string
          id: string
          prayer_request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_request_likes_prayer_request_id_fkey"
            columns: ["prayer_request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          answer_notes: string | null
          answered_at: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          audio_url: string | null
          content: string
          created_at: string
          expires_at: string | null
          expiry_notified: boolean
          gratitude_message: string | null
          id: string
          image_moderation_reason: string | null
          image_moderation_severity: string | null
          image_moderation_status: string | null
          image_url: string | null
          is_anonymous: boolean
          is_answered: boolean
          is_public: boolean
          likes_count: number
          renewed_at: string | null
          share_duration: string | null
          title: string
          updated_at: string
          user_id: string
          visible_to_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Insert: {
          answer_notes?: string | null
          answered_at?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          audio_url?: string | null
          content: string
          created_at?: string
          expires_at?: string | null
          expiry_notified?: boolean
          gratitude_message?: string | null
          id?: string
          image_moderation_reason?: string | null
          image_moderation_severity?: string | null
          image_moderation_status?: string | null
          image_url?: string | null
          is_anonymous?: boolean
          is_answered?: boolean
          is_public?: boolean
          likes_count?: number
          renewed_at?: string | null
          share_duration?: string | null
          title: string
          updated_at?: string
          user_id: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Update: {
          answer_notes?: string | null
          answered_at?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          audio_url?: string | null
          content?: string
          created_at?: string
          expires_at?: string | null
          expiry_notified?: boolean
          gratitude_message?: string | null
          id?: string
          image_moderation_reason?: string | null
          image_moderation_severity?: string | null
          image_moderation_status?: string | null
          image_url?: string | null
          is_anonymous?: boolean
          is_answered?: boolean
          is_public?: boolean
          likes_count?: number
          renewed_at?: string | null
          share_duration?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visible_to_roles?: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_color_images: {
        Row: {
          color_name: string
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          product_id: string
          updated_at: string
        }
        Insert: {
          color_name: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          product_id: string
          updated_at?: string
        }
        Update: {
          color_name?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_color_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          default_image_index: number | null
          default_image_url: string | null
          description: string | null
          id: string
          image_option_mapping: Json | null
          images: string[] | null
          inventory_count: number
          is_active: boolean
          is_printify: boolean
          is_printify_product: boolean | null
          name: string
          options: Json | null
          price: number
          printify_blueprint_id: number | null
          printify_original_description: string | null
          printify_original_images: string[] | null
          printify_original_price: number | null
          printify_original_title: string | null
          printify_print_provider_id: number | null
          printify_product_id: string | null
          printify_variant_ids: Json | null
          ships_separately: boolean | null
          tags: string[] | null
          updated_at: string
          vendor_id: string | null
          view_count: number
          weight_oz: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_image_index?: number | null
          default_image_url?: string | null
          description?: string | null
          id?: string
          image_option_mapping?: Json | null
          images?: string[] | null
          inventory_count?: number
          is_active?: boolean
          is_printify?: boolean
          is_printify_product?: boolean | null
          name: string
          options?: Json | null
          price: number
          printify_blueprint_id?: number | null
          printify_original_description?: string | null
          printify_original_images?: string[] | null
          printify_original_price?: number | null
          printify_original_title?: string | null
          printify_print_provider_id?: number | null
          printify_product_id?: string | null
          printify_variant_ids?: Json | null
          ships_separately?: boolean | null
          tags?: string[] | null
          updated_at?: string
          vendor_id?: string | null
          view_count?: number
          weight_oz?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          default_image_index?: number | null
          default_image_url?: string | null
          description?: string | null
          id?: string
          image_option_mapping?: Json | null
          images?: string[] | null
          inventory_count?: number
          is_active?: boolean
          is_printify?: boolean
          is_printify_product?: boolean | null
          name?: string
          options?: Json | null
          price?: number
          printify_blueprint_id?: number | null
          printify_original_description?: string | null
          printify_original_images?: string[] | null
          printify_original_price?: number | null
          printify_original_title?: string | null
          printify_print_provider_id?: number | null
          printify_product_id?: string | null
          printify_variant_ids?: Json | null
          ships_separately?: boolean | null
          tags?: string[] | null
          updated_at?: string
          vendor_id?: string | null
          view_count?: number
          weight_oz?: number | null
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
          auto_share_workout_images: boolean
          avatar_number: number | null
          avatar_url: string | null
          bio: string | null
          coin_balance: number
          coins: number
          created_at: string
          custom_avatar_type: string | null
          custom_avatar_url: string | null
          display_name: string
          email: string | null
          feed_last_seen_at: string | null
          friend_code: string | null
          id: string
          last_daily_login_reward_at: string | null
          show_feed_badge: boolean | null
          tts_enabled: boolean
          tts_voice: string | null
          updated_at: string
          wordle_easy_mode_enabled: boolean | null
        }
        Insert: {
          audio_notifications_enabled?: boolean | null
          auto_share_workout_images?: boolean
          avatar_number?: number | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          coins?: number
          created_at?: string
          custom_avatar_type?: string | null
          custom_avatar_url?: string | null
          display_name: string
          email?: string | null
          feed_last_seen_at?: string | null
          friend_code?: string | null
          id: string
          last_daily_login_reward_at?: string | null
          show_feed_badge?: boolean | null
          tts_enabled?: boolean
          tts_voice?: string | null
          updated_at?: string
          wordle_easy_mode_enabled?: boolean | null
        }
        Update: {
          audio_notifications_enabled?: boolean | null
          auto_share_workout_images?: boolean
          avatar_number?: number | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          coins?: number
          created_at?: string
          custom_avatar_type?: string | null
          custom_avatar_url?: string | null
          display_name?: string
          email?: string | null
          feed_last_seen_at?: string | null
          friend_code?: string | null
          id?: string
          last_daily_login_reward_at?: string | null
          show_feed_badge?: boolean | null
          tts_enabled?: boolean
          tts_voice?: string | null
          updated_at?: string
          wordle_easy_mode_enabled?: boolean | null
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
      public_recipe_likes: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_recipe_likes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "public_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      public_recipes: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[]
          is_active: boolean
          likes_count: number
          saves_count: number
          steps: string[]
          tips: string[] | null
          title: string
          tools: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_active?: boolean
          likes_count?: number
          saves_count?: number
          steps?: string[]
          tips?: string[] | null
          title: string
          tools?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_active?: boolean
          likes_count?: number
          saves_count?: number
          steps?: string[]
          tips?: string[] | null
          title?: string
          tools?: string[] | null
          updated_at?: string
        }
        Relationships: []
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
      recipe_ingredients: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_shopping_list: {
        Row: {
          created_at: string
          emoji: string | null
          estimated_cost: string | null
          id: string
          is_purchased: boolean | null
          item_name: string
          item_type: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          estimated_cost?: string | null
          id?: string
          is_purchased?: boolean | null
          item_name: string
          item_type: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          estimated_cost?: string | null
          id?: string
          is_purchased?: boolean | null
          item_name?: string
          item_type?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_tools: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      recipe_unmatched_items: {
        Row: {
          first_seen_at: string
          id: string
          is_resolved: boolean
          item_name: string
          item_type: string
          last_seen_at: string
          occurrence_count: number
          resolved_at: string | null
          resolved_to: string | null
        }
        Insert: {
          first_seen_at?: string
          id?: string
          is_resolved?: boolean
          item_name: string
          item_type: string
          last_seen_at?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_to?: string | null
        }
        Update: {
          first_seen_at?: string
          id?: string
          is_resolved?: boolean
          item_name?: string
          item_type?: string
          last_seen_at?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_to?: string | null
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
      saved_jokes: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_public: boolean | null
          is_user_created: boolean | null
          likes_count: number | null
          question: string
          shared_at: string | null
          times_shared: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          is_user_created?: boolean | null
          likes_count?: number | null
          question: string
          shared_at?: string | null
          times_shared?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          is_user_created?: boolean | null
          likes_count?: number | null
          question?: string
          shared_at?: string | null
          times_shared?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          address: string
          created_at: string
          created_by: string
          hours: string | null
          hours_vary_seasonally: boolean
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by: string
          hours?: string | null
          hours_vary_seasonally?: boolean
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string
          hours?: string | null
          hours_vary_seasonally?: boolean
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[]
          is_favorite: boolean
          last_made_at: string | null
          source_recipe_id: string | null
          steps: string[]
          times_made: number
          tips: string[] | null
          title: string
          tools: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_favorite?: boolean
          last_made_at?: string | null
          source_recipe_id?: string | null
          steps?: string[]
          times_made?: number
          tips?: string[] | null
          title: string
          tools?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_favorite?: boolean
          last_made_at?: string | null
          source_recipe_id?: string | null
          steps?: string[]
          times_made?: number
          tips?: string[] | null
          title?: string
          tools?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_shopping_tips: {
        Row: {
          dismissed_ingredients: string[] | null
          dismissed_tools: string[] | null
          id: string
          ingredient_tips: Json | null
          last_generated_at: string
          tool_tips: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          dismissed_ingredients?: string[] | null
          dismissed_tools?: string[] | null
          id?: string
          ingredient_tips?: Json | null
          last_generated_at?: string
          tool_tips?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          dismissed_ingredients?: string[] | null
          dismissed_tools?: string[] | null
          id?: string
          ingredient_tips?: Json | null
          last_generated_at?: string
          tool_tips?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_rate_cache: {
        Row: {
          cache_key: string
          cheapest_rate_cents: number
          cheapest_service: string
          created_at: string
          destination_zip: string
          expires_at: string
          id: string
          origin_zip: string
          rates: Json
          weight_oz: number
        }
        Insert: {
          cache_key: string
          cheapest_rate_cents: number
          cheapest_service: string
          created_at?: string
          destination_zip: string
          expires_at?: string
          id?: string
          origin_zip: string
          rates: Json
          weight_oz: number
        }
        Update: {
          cache_key?: string
          cheapest_rate_cents?: number
          cheapest_service?: string
          created_at?: string
          destination_zip?: string
          expires_at?: string
          id?: string
          origin_zip?: string
          rates?: Json
          weight_oz?: number
        }
        Relationships: []
      }
      shopping_cart: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          session_id: string | null
          updated_at: string
          user_id: string | null
          variant_info: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          variant_info?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          variant_info?: Json | null
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
            referencedRelation: "sponsor_bestie_funding_progress_by_mode"
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
      sponsorship_email_queue: {
        Row: {
          amount: number | null
          bestie_name: string | null
          created_at: string
          id: string
          notification_type: string
          old_amount: number | null
          old_tier_name: string | null
          processed: boolean
          processed_at: string | null
          sponsor_name: string | null
          tier_name: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          bestie_name?: string | null
          created_at?: string
          id?: string
          notification_type: string
          old_amount?: number | null
          old_tier_name?: string | null
          processed?: boolean
          processed_at?: string | null
          sponsor_name?: string | null
          tier_name?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          amount?: number | null
          bestie_name?: string | null
          created_at?: string
          id?: string
          notification_type?: string
          old_amount?: number | null
          old_tier_name?: string | null
          processed?: boolean
          processed_at?: string | null
          sponsor_name?: string | null
          tier_name?: string | null
          user_email?: string
          user_id?: string
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
            referencedRelation: "sponsor_bestie_funding_progress_by_mode"
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
      user_app_preferences: {
        Row: {
          app_order: string[] | null
          created_at: string
          hidden_apps: string[] | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_order?: string[] | null
          created_at?: string
          hidden_apps?: string[] | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_order?: string[] | null
          created_at?: string
          hidden_apps?: string[] | null
          id?: string
          updated_at?: string
          user_id?: string
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
      user_beat_pad_sounds: {
        Row: {
          id: string
          purchased_at: string
          sound_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          sound_id: string
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          sound_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_beat_pad_sounds_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "beat_pad_sounds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_card_templates: {
        Row: {
          coins_spent: number
          id: string
          purchased_at: string
          template_id: string
          user_id: string
        }
        Insert: {
          coins_spent?: number
          id?: string
          purchased_at?: string
          template_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          id?: string
          purchased_at?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cards: {
        Row: {
          canvas_data: string | null
          card_design_id: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          is_public: boolean | null
          likes_count: number | null
          template_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_data?: string | null
          card_design_id?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          template_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_data?: string | null
          card_design_id?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          template_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_design_id_fkey"
            columns: ["card_design_id"]
            isOneToOne: false
            referencedRelation: "card_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cash_register_packs: {
        Row: {
          coins_spent: number
          id: string
          pack_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          coins_spent?: number
          id?: string
          pack_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          id?: string
          pack_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cash_register_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "cash_register_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cash_register_stores: {
        Row: {
          coins_spent: number
          id: string
          purchased_at: string
          store_id: string
          user_id: string
        }
        Insert: {
          coins_spent?: number
          id?: string
          purchased_at?: string
          store_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          id?: string
          purchased_at?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cash_register_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "cash_register_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coloring_books: {
        Row: {
          book_id: string
          coins_spent: number
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          coins_spent?: number
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          coins_spent?: number
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coloring_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "coloring_books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_colorings: {
        Row: {
          canvas_data: string | null
          coloring_page_id: string
          created_at: string
          id: string
          is_completed: boolean | null
          is_public: boolean | null
          likes_count: number | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_data?: string | null
          coloring_page_id: string
          created_at?: string
          id?: string
          is_completed?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_data?: string | null
          coloring_page_id?: string
          created_at?: string
          id?: string
          is_completed?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_colorings_coloring_page_id_fkey"
            columns: ["coloring_page_id"]
            isOneToOne: false
            referencedRelation: "coloring_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_activities: {
        Row: {
          activity_id: string
          created_at: string
          display_order: number
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          display_order?: number
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          display_order?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "workout_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fitness_avatars: {
        Row: {
          avatar_id: string
          id: string
          is_selected: boolean
          purchased_at: string
          user_id: string
        }
        Insert: {
          avatar_id: string
          id?: string
          is_selected?: boolean
          purchased_at?: string
          user_id: string
        }
        Update: {
          avatar_id?: string
          id?: string
          is_selected?: boolean
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fitness_avatars_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "fitness_avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_joke_categories: {
        Row: {
          category_id: string
          coins_spent: number
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          coins_spent?: number
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          coins_spent?: number
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_joke_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "joke_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_joke_history: {
        Row: {
          created_at: string
          id: string
          joke_question: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joke_question: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joke_question?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memory_match_packs: {
        Row: {
          id: string
          pack_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          pack_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          pack_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_match_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "memory_match_packs"
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
      user_recipe_ingredients: {
        Row: {
          id: string
          ingredients: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          ingredients?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          ingredients?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_recipe_tools: {
        Row: {
          id: string
          tools: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          tools?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          tools?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_workout_goals: {
        Row: {
          coin_reward: number | null
          created_at: string
          id: string
          set_by: string | null
          updated_at: string
          user_id: string
          weekly_activity_goal: number | null
        }
        Insert: {
          coin_reward?: number | null
          created_at?: string
          id?: string
          set_by?: string | null
          updated_at?: string
          user_id: string
          weekly_activity_goal?: number | null
        }
        Update: {
          coin_reward?: number | null
          created_at?: string
          id?: string
          set_by?: string | null
          updated_at?: string
          user_id?: string
          weekly_activity_goal?: number | null
        }
        Relationships: []
      }
      user_workout_location_packs: {
        Row: {
          id: string
          is_enabled: boolean
          pack_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          pack_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          pack_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_location_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "workout_location_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workout_locations: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "workout_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workout_logs: {
        Row: {
          activity_id: string | null
          completed_at: string
          id: string
          notes: string | null
          user_id: string
          video_id: string | null
          workout_type: string
        }
        Insert: {
          activity_id?: string | null
          completed_at?: string
          id?: string
          notes?: string | null
          user_id: string
          video_id?: string | null
          workout_type: string
        }
        Update: {
          activity_id?: string | null
          completed_at?: string
          id?: string
          notes?: string | null
          user_id?: string
          video_id?: string | null
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "workout_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_logs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "workout_videos"
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
      vendor_story_media: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          updated_at: string
          vendor_id: string
          youtube_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          media_type: string
          media_url: string
          updated_at?: string
          vendor_id: string
          youtube_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          updated_at?: string
          vendor_id?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_story_media_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_earnings"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_story_media_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["vendor_team_role"]
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["vendor_team_role"]
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["vendor_team_role"]
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_team_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_earnings"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_team_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          agreed_to_terms_at: string | null
          agreed_to_vendor_terms: boolean | null
          allowed_carriers: string[] | null
          application_notes: string | null
          approved_at: string | null
          approved_by: string | null
          banner_image_url: string | null
          business_name: string
          commission_percentage: number
          contact_email: string | null
          created_at: string
          description: string | null
          disable_free_shipping: boolean
          estimated_processing_days: number | null
          featured_bestie_id: string | null
          flat_rate_amount_cents: number | null
          free_shipping_threshold: number | null
          id: string
          is_house_vendor: boolean
          logo_url: string | null
          product_categories: string[] | null
          rejection_reason: string | null
          ship_from_city: string | null
          ship_from_state: string | null
          ship_from_zip: string | null
          shipping_mode: Database["public"]["Enums"]["shipping_mode"] | null
          social_links: Json | null
          status: Database["public"]["Enums"]["vendor_status"]
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_connect_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_payouts_enabled: boolean | null
          theme_color: string | null
          updated_at: string
          use_flat_rate_fallback: boolean | null
          user_id: string
        }
        Insert: {
          agreed_to_terms_at?: string | null
          agreed_to_vendor_terms?: boolean | null
          allowed_carriers?: string[] | null
          application_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          banner_image_url?: string | null
          business_name: string
          commission_percentage?: number
          contact_email?: string | null
          created_at?: string
          description?: string | null
          disable_free_shipping?: boolean
          estimated_processing_days?: number | null
          featured_bestie_id?: string | null
          flat_rate_amount_cents?: number | null
          free_shipping_threshold?: number | null
          id?: string
          is_house_vendor?: boolean
          logo_url?: string | null
          product_categories?: string[] | null
          rejection_reason?: string | null
          ship_from_city?: string | null
          ship_from_state?: string | null
          ship_from_zip?: string | null
          shipping_mode?: Database["public"]["Enums"]["shipping_mode"] | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["vendor_status"]
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          theme_color?: string | null
          updated_at?: string
          use_flat_rate_fallback?: boolean | null
          user_id: string
        }
        Update: {
          agreed_to_terms_at?: string | null
          agreed_to_vendor_terms?: boolean | null
          allowed_carriers?: string[] | null
          application_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          banner_image_url?: string | null
          business_name?: string
          commission_percentage?: number
          contact_email?: string | null
          created_at?: string
          description?: string | null
          disable_free_shipping?: boolean
          estimated_processing_days?: number | null
          featured_bestie_id?: string | null
          flat_rate_amount_cents?: number | null
          free_shipping_threshold?: number | null
          id?: string
          is_house_vendor?: boolean
          logo_url?: string | null
          product_categories?: string[] | null
          rejection_reason?: string | null
          ship_from_city?: string | null
          ship_from_state?: string | null
          ship_from_zip?: string | null
          shipping_mode?: Database["public"]["Enums"]["shipping_mode"] | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["vendor_status"]
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          theme_color?: string | null
          updated_at?: string
          use_flat_rate_fallback?: boolean | null
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
      wordle_attempts: {
        Row: {
          coins_earned: number
          completed_at: string | null
          created_at: string
          daily_word_id: string
          extra_rounds_used: number
          guesses: string[]
          hints_used: number
          id: string
          is_easy_mode: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coins_earned?: number
          completed_at?: string | null
          created_at?: string
          daily_word_id: string
          extra_rounds_used?: number
          guesses?: string[]
          hints_used?: number
          id?: string
          is_easy_mode?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coins_earned?: number
          completed_at?: string | null
          created_at?: string
          daily_word_id?: string
          extra_rounds_used?: number
          guesses?: string[]
          hints_used?: number
          id?: string
          is_easy_mode?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordle_attempts_daily_word_id_fkey"
            columns: ["daily_word_id"]
            isOneToOne: false
            referencedRelation: "wordle_daily_words"
            referencedColumns: ["id"]
          },
        ]
      }
      wordle_daily_words: {
        Row: {
          created_at: string
          hint: string | null
          id: string
          theme_id: string | null
          word: string
          word_date: string
        }
        Insert: {
          created_at?: string
          hint?: string | null
          id?: string
          theme_id?: string | null
          word: string
          word_date: string
        }
        Update: {
          created_at?: string
          hint?: string | null
          id?: string
          theme_id?: string | null
          word?: string
          word_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordle_daily_words_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "wordle_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      wordle_themes: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          emoji: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      wordle_user_stats: {
        Row: {
          best_streak: number
          created_at: string
          current_month_wins: number | null
          current_month_year: string | null
          current_streak: number
          id: string
          last_played_date: string | null
          last_win_date: string | null
          total_games_played: number
          total_wins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_month_wins?: number | null
          current_month_year?: string | null
          current_streak?: number
          id?: string
          last_played_date?: string | null
          last_win_date?: string | null
          total_games_played?: number
          total_wins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_month_wins?: number | null
          current_month_year?: string | null
          current_streak?: number
          id?: string
          last_played_date?: string | null
          last_win_date?: string | null
          total_games_played?: number
          total_wins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_activities: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workout_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_generated_images: {
        Row: {
          activity_name: string | null
          avatar_id: string
          created_at: string
          id: string
          image_type: string
          image_url: string
          is_shared_to_community: boolean
          is_test: boolean
          likes_count: number
          location_id: string | null
          location_name: string | null
          location_pack_name: string | null
          user_id: string
          workout_log_id: string | null
        }
        Insert: {
          activity_name?: string | null
          avatar_id: string
          created_at?: string
          id?: string
          image_type: string
          image_url: string
          is_shared_to_community?: boolean
          is_test?: boolean
          likes_count?: number
          location_id?: string | null
          location_name?: string | null
          location_pack_name?: string | null
          user_id: string
          workout_log_id?: string | null
        }
        Update: {
          activity_name?: string | null
          avatar_id?: string
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          is_shared_to_community?: boolean
          is_test?: boolean
          likes_count?: number
          location_id?: string | null
          location_name?: string | null
          location_pack_name?: string | null
          user_id?: string
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_generated_images_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "fitness_avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_generated_images_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "workout_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_generated_images_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "user_workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_image_likes: {
        Row: {
          created_at: string
          id: string
          image_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_image_likes_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "workout_generated_images"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_location_packs: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_free: boolean
          name: string
          price_coins: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          name: string
          price_coins?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          name?: string
          price_coins?: number
          updated_at?: string
        }
        Relationships: []
      }
      workout_locations: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pack_id: string | null
          prompt_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pack_id?: string | null
          prompt_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pack_id?: string | null
          prompt_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_locations_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "workout_location_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_videos: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          points: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "workout_categories"
            referencedColumns: ["id"]
          },
        ]
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
      community_feed_items: {
        Row: {
          author_id: string | null
          comments_count: number | null
          created_at: string | null
          description: string | null
          extra_data: Json | null
          id: string | null
          image_url: string | null
          item_type: string | null
          likes_count: number | null
          repost_id: string | null
          title: string | null
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
      page_visit_stats: {
        Row: {
          page_url: string | null
          unique_sessions: number | null
          unique_users: number | null
          visit_count: number | null
          visit_date: string | null
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
      check_daily_chore_completion: {
        Args: { p_date: string; p_user_id: string }
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
      cleanup_shipping_rate_cache: { Args: never; Returns: undefined }
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
      get_marketplace_access_settings: {
        Args: never
        Returns: {
          marketplace_stripe_mode: string
          store_access_mode: string
        }[]
      }
      get_notification_preferences: {
        Args: { _user_id: string }
        Returns: {
          digest_frequency: string
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
          email_on_prayed_for_you: boolean
          email_on_prayer_approved: boolean
          email_on_prayer_pending_approval: boolean
          email_on_prayer_rejected: boolean
          email_on_product_update: boolean
          email_on_sponsorship_update: boolean
          enable_digest_emails: boolean
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
          inapp_on_prayed_for_you: boolean
          inapp_on_prayer_approved: boolean
          inapp_on_prayer_pending_approval: boolean
          inapp_on_prayer_rejected: boolean
          inapp_on_product_update: boolean
          inapp_on_sponsorship_update: boolean
        }[]
      }
      get_prayer_creator_name: {
        Args: { prayer_is_anonymous: boolean; prayer_user_id: string }
        Returns: string
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
      get_random_unseen_joke: {
        Args: { _category?: string; _user_id: string }
        Returns: {
          answer: string
          category: string
          id: string
          question: string
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
      get_user_vendor_id: { Args: { _user_id: string }; Returns: string }
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
      increment_beat_plays: { Args: { beat_id: string }; Returns: undefined }
      is_admin_or_owner: { Args: never; Returns: boolean }
      is_guardian_of: {
        Args: { _bestie_id: string; _guardian_id: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_admin: {
        Args: { _user_id: string; _vendor_id: string }
        Returns: boolean
      }
      is_vendor_for_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_vendor_for_order_item: {
        Args: { _user_id: string; _vendor_id: string }
        Returns: boolean
      }
      is_vendor_owner: {
        Args: { _user_id: string; _vendor_id: string }
        Returns: boolean
      }
      is_vendor_team_member: {
        Args: { check_user_id: string; check_vendor_id: string }
        Returns: boolean
      }
      promote_collections_to_ga: { Args: never; Returns: undefined }
      queue_content_like_email: {
        Args: {
          p_content_link: string
          p_content_title: string
          p_content_type: string
          p_liker_user_id: string
          p_recipient_user_id: string
        }
        Returns: undefined
      }
      update_featured_collections: { Args: never; Returns: undefined }
      user_can_manage_vendor: {
        Args: { p_vendor_id: string }
        Returns: boolean
      }
      user_owns_vendor: { Args: { p_vendor_id: string }; Returns: boolean }
    }
    Enums: {
      avatar_category: "humans" | "animals" | "monsters" | "shapes"
      chore_recurrence_type:
        | "daily"
        | "weekly"
        | "every_x_days"
        | "every_x_weeks"
        | "once"
      fulfillment_status:
        | "pending"
        | "in_production"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      ingredient_category: "base" | "flavor" | "topping" | "extra"
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
      shipping_mode: "flat" | "calculated"
      sticker_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      user_role:
        | "bestie"
        | "caregiver"
        | "supporter"
        | "admin"
        | "owner"
        | "vendor"
        | "moderator"
      vendor_status: "pending" | "approved" | "rejected" | "suspended"
      vendor_team_role: "owner" | "admin" | "staff"
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
      chore_recurrence_type: [
        "daily",
        "weekly",
        "every_x_days",
        "every_x_weeks",
        "once",
      ],
      fulfillment_status: [
        "pending",
        "in_production",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      ingredient_category: ["base", "flavor", "topping", "extra"],
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
      shipping_mode: ["flat", "calculated"],
      sticker_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      user_role: [
        "bestie",
        "caregiver",
        "supporter",
        "admin",
        "owner",
        "vendor",
        "moderator",
      ],
      vendor_status: ["pending", "approved", "rejected", "suspended"],
      vendor_team_role: ["owner", "admin", "staff"],
    },
  },
} as const
