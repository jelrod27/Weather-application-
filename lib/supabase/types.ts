export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          preferred_units: 'metric' | 'imperial'
          default_location: string | null
          timezone: string | null
          welcome_email_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferred_units?: 'metric' | 'imperial'
          default_location?: string | null
          timezone?: string | null
          welcome_email_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferred_units?: 'metric' | 'imperial'
          default_location?: string | null
          timezone?: string | null
          welcome_email_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          id: string
          user_id: string
          location_name: string
          city: string
          state: string | null
          country: string
          latitude: number
          longitude: number
          is_favorite: boolean
          custom_name: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_name: string
          city: string
          state?: string | null
          country: string
          latitude: number
          longitude: number
          is_favorite?: boolean
          custom_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location_name?: string
          city?: string
          state?: string | null
          country?: string
          latitude?: number
          longitude?: number
          is_favorite?: boolean
          custom_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: string
          temperature_unit: 'celsius' | 'fahrenheit'
          wind_unit: 'mph' | 'kmh' | 'ms'
          auto_location: boolean
          notifications_enabled: boolean
          visible_metrics: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          temperature_unit?: 'celsius' | 'fahrenheit'
          wind_unit?: 'mph' | 'kmh' | 'ms'
          auto_location?: boolean
          notifications_enabled?: boolean
          visible_metrics?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          temperature_unit?: 'celsius' | 'fahrenheit'
          wind_unit?: 'mph' | 'kmh' | 'ms'
          auto_location?: boolean
          notifications_enabled?: boolean
          visible_metrics?: string[] | null
          created_at?: string
          updated_at?: string
        },
      },
      storm_reports: {
        Row: {
          id: string
          user_id: string
          report_type: 'hail' | 'wind' | 'tornado' | 'flood' | 'funnel' | 'other'
          description: string
          latitude: number
          longitude: number
          location_name: string | null
          image_url: string | null
          occurred_at: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          report_type: 'hail' | 'wind' | 'tornado' | 'flood' | 'funnel' | 'other'
          description: string
          latitude: number
          longitude: number
          location_name?: string | null
          image_url?: string | null
          occurred_at?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          report_type?: 'hail' | 'wind' | 'tornado' | 'flood' | 'funnel' | 'other'
          description?: string
          latitude?: number
          longitude?: number
          location_name?: string | null
          image_url?: string | null
          occurred_at?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      },
      user_ai_memory: {
        Row: {
          user_id: string
          memory_notes: string
          recent_locations: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          memory_notes?: string
          recent_locations?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          memory_notes?: string
          recent_locations?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      alert_subscriptions: {
        Row: {
          id: string
          user_id: string
          saved_location_id: string
          kind: 'severe_weather'
          enabled: boolean
          notify_tornado: boolean
          notify_severe_thunderstorm: boolean
          notify_flash_flood: boolean
          notify_upgrades: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          saved_location_id: string
          kind: 'severe_weather'
          enabled?: boolean
          notify_tornado?: boolean
          notify_severe_thunderstorm?: boolean
          notify_flash_flood?: boolean
          notify_upgrades?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          saved_location_id?: string
          kind?: 'severe_weather'
          enabled?: boolean
          notify_tornado?: boolean
          notify_severe_thunderstorm?: boolean
          notify_flash_flood?: boolean
          notify_upgrades?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      alert_monitor_state: {
        Row: {
          subscription_id: string
          active_alert_ids: string[]
          updated_at: string
        }
        Insert: {
          subscription_id: string
          active_alert_ids?: string[]
          updated_at?: string
        }
        Update: {
          subscription_id?: string
          active_alert_ids?: string[]
          updated_at?: string
        }
      }
      user_alerts: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          kind: 'severe_weather' | 'severe_weather_all_clear'
          payload: Json
          email_sent_at: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          kind: 'severe_weather' | 'severe_weather_all_clear'
          payload?: Json
          email_sent_at?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          kind?: 'severe_weather' | 'severe_weather_all_clear'
          payload?: Json
          email_sent_at?: string | null
          created_at?: string
          read_at?: string | null
        }
      }
      guest_alert_subscribers: {
        Row: {
          id: string
          email: string
          latitude: number
          longitude: number
          location_label: string
          enabled: boolean
          verified_at: string | null
          verify_token_hash: string | null
          verify_token_expires_at: string | null
          manage_token_hash: string
          notify_tornado: boolean
          notify_severe_thunderstorm: boolean
          notify_flash_flood: boolean
          notify_upgrades: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          latitude: number
          longitude: number
          location_label: string
          enabled?: boolean
          verified_at?: string | null
          verify_token_hash?: string | null
          verify_token_expires_at?: string | null
          manage_token_hash: string
          notify_tornado?: boolean
          notify_severe_thunderstorm?: boolean
          notify_flash_flood?: boolean
          notify_upgrades?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          latitude?: number
          longitude?: number
          location_label?: string
          enabled?: boolean
          verified_at?: string | null
          verify_token_hash?: string | null
          verify_token_expires_at?: string | null
          manage_token_hash?: string
          notify_tornado?: boolean
          notify_severe_thunderstorm?: boolean
          notify_flash_flood?: boolean
          notify_upgrades?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      guest_alert_monitor_state: {
        Row: {
          subscriber_id: string
          active_alert_ids: string[]
          updated_at: string
        }
        Insert: {
          subscriber_id: string
          active_alert_ids?: string[]
          updated_at?: string
        }
        Update: {
          subscriber_id?: string
          active_alert_ids?: string[]
          updated_at?: string
        }
      }
      guest_alert_deliveries: {
        Row: {
          id: string
          subscriber_id: string
          alert_id: string
          email_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          alert_id: string
          email_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          alert_id?: string
          email_sent_at?: string | null
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string | null
          guest_subscriber_id: string | null
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          guest_subscriber_id?: string | null
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          guest_subscriber_id?: string | null
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
      bitwatch_ingest_state: {
        Row: {
          id: string
          watermark_sent: string | null
          last_success_at: string | null
          last_error: string | null
          lease_until: string | null
          updated_at: string
        }
        Insert: {
          id: string
          watermark_sent?: string | null
          last_success_at?: string | null
          last_error?: string | null
          lease_until?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          watermark_sent?: string | null
          last_success_at?: string | null
          last_error?: string | null
          lease_until?: string | null
          updated_at?: string
        }
      }
      bitwatch_source_messages: {
        Row: {
          id: string
          nws_id: string
          sender: string
          sent: string
          message_type: string
          event: string
          content_hash: string
          warning_event_id: string | null
          payload: Json
          observed_at: string
        }
        Insert: {
          id?: string
          nws_id: string
          sender?: string
          sent: string
          message_type: string
          event: string
          content_hash: string
          warning_event_id?: string | null
          payload?: Json
          observed_at?: string
        }
        Update: {
          id?: string
          nws_id?: string
          sender?: string
          sent?: string
          message_type?: string
          event?: string
          content_hash?: string
          warning_event_id?: string | null
          payload?: Json
          observed_at?: string
        }
      }
      bitwatch_warning_events: {
        Row: {
          id: string
          nws_id: string
          event: string
          status: string
          ended_reason: string | null
          display: Json
          updated_at: string
        }
        Insert: {
          id: string
          nws_id: string
          event: string
          status: string
          ended_reason?: string | null
          display?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          nws_id?: string
          event?: string
          status?: string
          ended_reason?: string | null
          display?: Json
          updated_at?: string
        }
      }
      bitwatch_deliveries: {
        Row: {
          id: string
          warning_event_id: string
          lifecycle_phase: string
          channel: string
          subscriber_kind: string
          subscriber_id: string
          protected_place_key: string
          payload: Json
          provider_accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          warning_event_id: string
          lifecycle_phase: string
          channel: string
          subscriber_kind: string
          subscriber_id: string
          protected_place_key: string
          payload?: Json
          provider_accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          warning_event_id?: string
          lifecycle_phase?: string
          channel?: string
          subscriber_kind?: string
          subscriber_id?: string
          protected_place_key?: string
          payload?: Json
          provider_accepted_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_user_ai_memory_fact: {
        Args: { p_fact: string; p_user_id: string }
        Returns: undefined
      }
      add_user_ai_memory_location: {
        Args: { p_location: string; p_user_id: string }
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

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type SavedLocation = Database['public']['Tables']['saved_locations']['Row']
export type SavedLocationInsert = Database['public']['Tables']['saved_locations']['Insert']
export type SavedLocationUpdate = Database['public']['Tables']['saved_locations']['Update']

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

export type UserAlert = Database['public']['Tables']['user_alerts']['Row']

type UserAIMemoryRow = Database['public']['Tables']['user_ai_memory']['Row']