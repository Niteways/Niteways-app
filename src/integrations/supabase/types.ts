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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string
          id: string
          performed_by: string | null
          portal: string
          venue_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          performed_by?: string | null
          portal?: string
          venue_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by?: string | null
          portal?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: string
          created_at: string
          currency: string
          id: string
          image_position_x: number | null
          image_position_y: number | null
          image_url: string | null
          image_zoom: number | null
          name: string
          status: string
          tax_rate: number
          timezone: string
          updated_at: string
          venue_count: number
        }
        Insert: {
          country: string
          created_at?: string
          currency?: string
          id?: string
          image_position_x?: number | null
          image_position_y?: number | null
          image_url?: string | null
          image_zoom?: number | null
          name: string
          status?: string
          tax_rate?: number
          timezone?: string
          updated_at?: string
          venue_count?: number
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          image_position_x?: number | null
          image_position_y?: number | null
          image_url?: string | null
          image_zoom?: number | null
          name?: string
          status?: string
          tax_rate?: number
          timezone?: string
          updated_at?: string
          venue_count?: number
        }
        Relationships: []
      }
      city_advertising_cards: {
        Row: {
          background_color: string | null
          card_mode: string | null
          card_size: string | null
          city_id: string
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          position_after_section: string | null
          sort_order: number | null
          start_date: string | null
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          card_mode?: string | null
          card_size?: string | null
          city_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          position_after_section?: string | null
          sort_order?: number | null
          start_date?: string | null
          subtitle?: string | null
          text_color?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          card_mode?: string | null
          card_size?: string | null
          city_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          position_after_section?: string | null
          sort_order?: number | null
          start_date?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_advertising_cards_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_advertising_cards_position_after_section_fkey"
            columns: ["position_after_section"]
            isOneToOne: false
            referencedRelation: "city_venue_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      city_section_venues: {
        Row: {
          created_at: string
          id: string
          section_id: string
          sort_order: number | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_id: string
          sort_order?: number | null
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          section_id?: string
          sort_order?: number | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_section_venues_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "city_venue_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_section_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      city_venue_sections: {
        Row: {
          city_id: string
          created_at: string
          emoji: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          city_id: string
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_venue_sections_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          age_limit: number
          capacity: number | null
          created_at: string
          custom_tags: string[] | null
          description: string | null
          end_time: string | null
          event_date: string
          event_name: string
          event_time: string | null
          featured: boolean | null
          gallery_images: string[]
          id: string
          image_url: string | null
          music_genre: string | null
          status: string | null
          ticket_price: number | null
          ticket_types: Json | null
          tickets_sold: number | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          age_limit?: number
          capacity?: number | null
          created_at?: string
          custom_tags?: string[] | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_name: string
          event_time?: string | null
          featured?: boolean | null
          gallery_images?: string[]
          id?: string
          image_url?: string | null
          music_genre?: string | null
          status?: string | null
          ticket_price?: number | null
          ticket_types?: Json | null
          tickets_sold?: number | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          age_limit?: number
          capacity?: number | null
          created_at?: string
          custom_tags?: string[] | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_name?: string
          event_time?: string | null
          featured?: boolean | null
          gallery_images?: string[]
          id?: string
          image_url?: string | null
          music_genre?: string | null
          status?: string | null
          ticket_price?: number | null
          ticket_types?: Json | null
          tickets_sold?: number | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_rooms: {
        Row: {
          background_color: string | null
          background_image: string | null
          created_at: string
          elements: Json | null
          floor_plan_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          zones: Json | null
        }
        Insert: {
          background_color?: string | null
          background_image?: string | null
          created_at?: string
          elements?: Json | null
          floor_plan_id: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          zones?: Json | null
        }
        Update: {
          background_color?: string | null
          background_image?: string | null
          created_at?: string
          elements?: Json | null
          floor_plan_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          zones?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_rooms_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          created_at: string
          id: string
          is_draft: boolean
          is_published: boolean
          name: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_draft?: boolean
          is_published?: boolean
          name: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_draft?: boolean
          is_published?: boolean
          name?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_entries: {
        Row: {
          added_at: string
          added_by: string | null
          check_in_time: string | null
          checked_in: boolean | null
          event_date: string
          guest_id: string | null
          guest_name: string
          id: string
          list_type: string
          notes: string | null
          plus_guests: number | null
          promoter: string | null
          status: string
          venue_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          event_date: string
          guest_id?: string | null
          guest_name: string
          id?: string
          list_type?: string
          notes?: string | null
          plus_guests?: number | null
          promoter?: string | null
          status?: string
          venue_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          event_date?: string
          guest_id?: string | null
          guest_name?: string
          id?: string
          list_type?: string
          notes?: string | null
          plus_guests?: number | null
          promoter?: string | null
          status?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_entries_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_list_entries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_types: {
        Row: {
          color: string
          created_at: string
          id: string
          list_id: string | null
          name: string
          sort_order: number | null
          venue_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          list_id?: string | null
          name: string
          sort_order?: number | null
          venue_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          list_id?: string | null
          name?: string
          sort_order?: number | null
          venue_id?: string
        }
        Relationships: []
      }
      guest_ratings: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          notes: string | null
          rated_by: string | null
          rating: number
          venue_id: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          notes?: string | null
          rated_by?: string | null
          rating: number
          venue_id: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          notes?: string | null
          rated_by?: string | null
          rating?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_ratings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_ratings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_visits: {
        Row: {
          guest_id: string
          id: string
          notes: string | null
          spend_amount: number | null
          venue_id: string
          visit_date: string
        }
        Insert: {
          guest_id: string
          id?: string
          notes?: string | null
          spend_amount?: number | null
          venue_id: string
          visit_date?: string
        }
        Update: {
          guest_id?: string
          id?: string
          notes?: string | null
          spend_amount?: number | null
          venue_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_visits_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          about: string | null
          automatic_rating: number | null
          avatar_url: string | null
          avg_spend: number | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          guest_id: string
          id: string
          instagram_handle: string | null
          instagram_photos: string[] | null
          loyalty_level: string | null
          name: string
          personnel_rating: number | null
          phone: string | null
          status: string | null
          total_spend: number | null
          total_visits: number | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          about?: string | null
          automatic_rating?: number | null
          avatar_url?: string | null
          avg_spend?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          guest_id: string
          id?: string
          instagram_handle?: string | null
          instagram_photos?: string[] | null
          loyalty_level?: string | null
          name: string
          personnel_rating?: number | null
          phone?: string | null
          status?: string | null
          total_spend?: number | null
          total_visits?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          about?: string | null
          automatic_rating?: number | null
          avatar_url?: string | null
          avg_spend?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          guest_id?: string
          id?: string
          instagram_handle?: string | null
          instagram_photos?: string[] | null
          loyalty_level?: string | null
          name?: string
          personnel_rating?: number | null
          phone?: string | null
          status?: string | null
          total_spend?: number | null
          total_visits?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      one_day_guest_lists: {
        Row: {
          created_at: string
          event_date: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: []
      }
      one_day_list_guests: {
        Row: {
          added_at: string
          added_by: string | null
          check_in_time: string | null
          checked_in: boolean | null
          checked_in_count: number | null
          guest_name: string
          guest_type: string
          id: string
          list_id: string
          notes: string | null
          paying_guests: number
          plus_guests: number
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          checked_in_count?: number | null
          guest_name: string
          guest_type?: string
          id?: string
          list_id: string
          notes?: string | null
          paying_guests?: number
          plus_guests?: number
        }
        Update: {
          added_at?: string
          added_by?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          checked_in_count?: number | null
          guest_name?: string
          guest_type?: string
          id?: string
          list_id?: string
          notes?: string | null
          paying_guests?: number
          plus_guests?: number
        }
        Relationships: [
          {
            foreignKeyName: "one_day_list_guests_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "one_day_guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_activity_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          status: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_activity_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_guest_lists: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          name: string
          reset_time: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          name: string
          reset_time?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          name?: string
          reset_time?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_guest_lists_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_list_guests: {
        Row: {
          added_at: string
          added_by: string | null
          check_in_time: string | null
          checked_in: boolean | null
          checked_in_count: number | null
          guest_name: string
          guest_type: string
          id: string
          is_sticky: boolean
          notes: string | null
          paying_guests: number | null
          plus_guests: number
          recurring_list_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          checked_in_count?: number | null
          guest_name: string
          guest_type?: string
          id?: string
          is_sticky?: boolean
          notes?: string | null
          paying_guests?: number | null
          plus_guests?: number
          recurring_list_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          checked_in_count?: number | null
          guest_name?: string
          guest_type?: string
          id?: string
          is_sticky?: boolean
          notes?: string | null
          paying_guests?: number | null
          plus_guests?: number
          recurring_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_list_guests_recurring_list_id_fkey"
            columns: ["recurring_list_id"]
            isOneToOne: false
            referencedRelation: "recurring_guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_list_permissions: {
        Row: {
          can_add_aa: boolean
          can_add_standard: boolean
          can_add_vip: boolean
          can_check_in: boolean
          can_delete: boolean
          can_view: boolean
          created_at: string
          id: string
          manager_id: string
          manager_name: string
          recurring_list_id: string
        }
        Insert: {
          can_add_aa?: boolean
          can_add_standard?: boolean
          can_add_vip?: boolean
          can_check_in?: boolean
          can_delete?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          manager_id: string
          manager_name: string
          recurring_list_id: string
        }
        Update: {
          can_add_aa?: boolean
          can_add_standard?: boolean
          can_add_vip?: boolean
          can_check_in?: boolean
          can_delete?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          manager_id?: string
          manager_name?: string
          recurring_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_list_permissions_recurring_list_id_fkey"
            columns: ["recurring_list_id"]
            isOneToOne: false
            referencedRelation: "recurring_guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      special_date_pricing: {
        Row: {
          created_at: string
          date: string
          id: string
          individual_prices: Json | null
          multiplier: number
          tables: string[] | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          individual_prices?: Json | null
          multiplier?: number
          tables?: string[] | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          individual_prices?: Json | null
          multiplier?: number
          tables?: string[] | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_date_pricing_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_name: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          opened_at: string | null
          opened_by: string | null
          priority: string
          status: string
          subject: string
          ticket_id: string
          updated_at: string
          user_email: string | null
          user_name: string
          user_type: string
          venue_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          priority?: string
          status?: string
          subject: string
          ticket_id: string
          updated_at?: string
          user_email?: string | null
          user_name: string
          user_type?: string
          venue_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          priority?: string
          status?: string
          subject?: string
          ticket_id?: string
          updated_at?: string
          user_email?: string | null
          user_name?: string
          user_type?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      table_bookings: {
        Row: {
          booking_date: string
          booking_id: string
          booking_time: string
          created_at: string
          guest_email: string | null
          guest_id: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          party_size: number
          price: number | null
          status: string
          table_number: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          booking_date: string
          booking_id: string
          booking_time: string
          created_at?: string
          guest_email?: string | null
          guest_id?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          price?: number | null
          status?: string
          table_number: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          booking_date?: string
          booking_id?: string
          booking_time?: string
          created_at?: string
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          price?: number | null
          status?: string
          table_number?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      table_pricing_history: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          price: number
          pricing_type: string
          table_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          price: number
          pricing_type?: string
          table_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          price?: number
          pricing_type?: string
          table_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_pricing_history_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "venue_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_pricing_history_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_purchases: {
        Row: {
          created_at: string
          event_date: string
          event_name: string
          guest_email: string | null
          guest_id: string | null
          guest_name: string
          id: string
          price: number
          quantity: number | null
          status: string
          ticket_id: string
          ticket_type: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_name: string
          guest_email?: string | null
          guest_id?: string | null
          guest_name: string
          id?: string
          price: number
          quantity?: number | null
          status?: string
          ticket_id: string
          ticket_type: string
          venue_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_name?: string
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string
          id?: string
          price?: number
          quantity?: number | null
          status?: string
          ticket_id?: string
          ticket_type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_purchases_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_purchases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          country_code: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          gender: string | null
          id: string
          instagram_handle: string | null
          linkedin_url: string | null
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          gender?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_url?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          gender?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_url?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venue_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_documents: {
        Row: {
          category: string | null
          created_at: string
          expiration_date: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_documents_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_tables: {
        Row: {
          base_price: number
          capacity: number
          color: string | null
          created_at: string
          deposit_percent: number
          element_data: Json | null
          floor_plan_id: string | null
          id: string
          label: string
          min_spend: number
          requires_approval: boolean | null
          room_id: string | null
          sort_order: number
          status: string
          table_type: string
          updated_at: string
          venue_id: string
          zone: string | null
        }
        Insert: {
          base_price?: number
          capacity?: number
          color?: string | null
          created_at?: string
          deposit_percent?: number
          element_data?: Json | null
          floor_plan_id?: string | null
          id?: string
          label: string
          min_spend?: number
          requires_approval?: boolean | null
          room_id?: string | null
          sort_order?: number
          status?: string
          table_type?: string
          updated_at?: string
          venue_id: string
          zone?: string | null
        }
        Update: {
          base_price?: number
          capacity?: number
          color?: string | null
          created_at?: string
          deposit_percent?: number
          element_data?: Json | null
          floor_plan_id?: string | null
          id?: string
          label?: string
          min_spend?: number
          requires_approval?: boolean | null
          room_id?: string | null
          sort_order?: number
          status?: string
          table_type?: string
          updated_at?: string
          venue_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_tables_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_tables_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_tables_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          permissions: Json | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
          venue_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_team_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_tickets: {
        Row: {
          active_days: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          quantity: number
          sold: number
          sort_order: number
          specific_dates: string[] | null
          status: string
          type: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          active_days?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          quantity?: number
          sold?: number
          sort_order?: number
          specific_dates?: string[] | null
          status?: string
          type?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          active_days?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          quantity?: number
          sold?: number
          sort_order?: number
          specific_dates?: string[] | null
          status?: string
          type?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_tickets_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string
          updated_at: string
          role: string | null
          venue_id: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
          role?: string | null
          venue_id?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
          role?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          addons: string[] | null
          address: string | null
          age_limit: number | null
          age_requirements: Json | null
          base_package: string
          booking_cutoff_hours: number | null
          cancellation_policy: string | null
          category: string
          city_id: string | null
          created_at: string
          deleted_at: string | null
          deposit_percent: number | null
          description: string | null
          dress_code: string | null
          email: string | null
          entrance_rules: string | null
          gallery_images: string[] | null
          geocoded_at: string | null
          id: string
          instagram_handle: string | null
          latitude: number | null
          longitude: number | null
          max_advance_days: number | null
          menu_url: string | null
          min_spend_tables: number | null
          min_spend_vip: number | null
          music_genre: string | null
          name: string
          opening_days: string | null
          opening_hours: string | null
          phone: string | null
          spotify_link: string | null
          status: string
          timezone: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          addons?: string[] | null
          address?: string | null
          age_limit?: number | null
          age_requirements?: Json | null
          base_package?: string
          booking_cutoff_hours?: number | null
          cancellation_policy?: string | null
          category?: string
          city_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_percent?: number | null
          description?: string | null
          dress_code?: string | null
          email?: string | null
          entrance_rules?: string | null
          gallery_images?: string[] | null
          geocoded_at?: string | null
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          longitude?: number | null
          max_advance_days?: number | null
          menu_url?: string | null
          min_spend_tables?: number | null
          min_spend_vip?: number | null
          music_genre?: string | null
          name: string
          opening_days?: string | null
          opening_hours?: string | null
          phone?: string | null
          spotify_link?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          addons?: string[] | null
          address?: string | null
          age_limit?: number | null
          age_requirements?: Json | null
          base_package?: string
          booking_cutoff_hours?: number | null
          cancellation_policy?: string | null
          category?: string
          city_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_percent?: number | null
          description?: string | null
          dress_code?: string | null
          email?: string | null
          entrance_rules?: string | null
          gallery_images?: string[] | null
          geocoded_at?: string | null
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          longitude?: number | null
          max_advance_days?: number | null
          menu_url?: string | null
          min_spend_tables?: number | null
          min_spend_vip?: number | null
          music_genre?: string | null
          name?: string
          opening_days?: string | null
          opening_hours?: string | null
          phone?: string | null
          spotify_link?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "moderator"
        | "support"
        | "finance"
        | "operations"
        | "viewer"
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
      app_role: [
        "super_admin",
        "admin",
        "moderator",
        "support",
        "finance",
        "operations",
        "viewer",
      ],
    },
  },
} as const
