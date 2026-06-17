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
      applications: {
        Row: {
          brand_note: string | null
          card_id: string
          created_at: string | null
          id: string
          influencer_id: string
          pitch_message: string
          portfolio_links: string[] | null
          proposed_rate: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brand_note?: string | null
          card_id: string
          created_at?: string | null
          id?: string
          influencer_id: string
          pitch_message: string
          portfolio_links?: string[] | null
          proposed_rate?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_note?: string | null
          card_id?: string
          created_at?: string | null
          id?: string
          influencer_id?: string
          pitch_message?: string
          portfolio_links?: string[] | null
          proposed_rate?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_campaigns: {
        Row: {
          brand_id: string | null
          campaign_end: string | null
          campaign_start: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          influencer_ids: string[] | null
          outcome_blurb: string | null
          title: string
        }
        Insert: {
          brand_id?: string | null
          campaign_end?: string | null
          campaign_start?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          influencer_ids?: string[] | null
          outcome_blurb?: string | null
          title: string
        }
        Update: {
          brand_id?: string | null
          campaign_end?: string | null
          campaign_start?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          influencer_ids?: string[] | null
          outcome_blurb?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          application_deadline: string | null
          brand_id: string
          budget_range: string | null
          category: string
          cover_image_url: string | null
          created_at: string | null
          deliverables: string[] | null
          description: string
          id: string
          min_followers: number | null
          niche_tags: string[]
          platform_requirements: string[] | null
          status: string | null
          timeline: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_deadline?: string | null
          brand_id: string
          budget_range?: string | null
          category: string
          cover_image_url?: string | null
          created_at?: string | null
          deliverables?: string[] | null
          description: string
          id?: string
          min_followers?: number | null
          niche_tags: string[]
          platform_requirements?: string[] | null
          status?: string | null
          timeline?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string | null
          brand_id?: string
          budget_range?: string | null
          category?: string
          cover_image_url?: string | null
          created_at?: string | null
          deliverables?: string[] | null
          description?: string
          id?: string
          min_followers?: number | null
          niche_tags?: string[]
          platform_requirements?: string[] | null
          status?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_note: string | null
          created_at: string | null
          description: string | null
          evidence_urls: string[] | null
          id: string
          raised_by: string | null
          reason: string
          resolution: string | null
          resolved_by: string | null
          room_id: string | null
          status: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          raised_by?: string | null
          reason: string
          resolution?: string | null
          resolved_by?: string | null
          room_id?: string | null
          status?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          raised_by?: string | null
          reason?: string
          resolution?: string | null
          resolved_by?: string | null
          room_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_list_items: {
        Row: {
          added_at: string | null
          id: string
          influencer_id: string | null
          list_id: string | null
        }
        Insert: {
          added_at?: string | null
          id?: string
          influencer_id?: string | null
          list_id?: string | null
        }
        Update: {
          added_at?: string | null
          id?: string
          influencer_id?: string | null
          list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_list_items_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "influencer_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_lists: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_lists_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          brand_id: string | null
          card_id: string | null
          created_at: string | null
          id: string
          influencer_id: string | null
          message: string | null
          status: string | null
        }
        Insert: {
          brand_id?: string | null
          card_id?: string | null
          created_at?: string | null
          id?: string
          influencer_id?: string | null
          message?: string | null
          status?: string | null
        }
        Update: {
          brand_id?: string | null
          card_id?: string | null
          created_at?: string | null
          id?: string
          influencer_id?: string | null
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          room_id: string
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          room_id: string
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          room_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          room_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          room_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          caption: string | null
          comments: number | null
          created_at: string | null
          id: string
          likes: number | null
          media_type: string | null
          media_url: string | null
          owner_id: string | null
          owner_role: string | null
          platform: string | null
          post_url: string | null
          sort_order: number | null
          title: string | null
          views: number | null
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          created_at?: string | null
          id?: string
          likes?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_id?: string | null
          owner_role?: string | null
          platform?: string | null
          post_url?: string | null
          sort_order?: number | null
          title?: string | null
          views?: number | null
        }
        Update: {
          caption?: string | null
          comments?: number | null
          created_at?: string | null
          id?: string
          likes?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_id?: string | null
          owner_role?: string | null
          platform?: string | null
          post_url?: string | null
          sort_order?: number | null
          title?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string | null
          viewed_at: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          profile_id?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          profile_id?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          cover_banner_url: string | null
          created_at: string | null
          display_name: string
          follower_count: number | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_verified: boolean | null
          location: string | null
          niche: string[] | null
          notification_prefs: Json | null
          platforms: string[] | null
          role: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          cover_banner_url?: string | null
          created_at?: string | null
          display_name: string
          follower_count?: number | null
          id: string
          industry?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          niche?: string[] | null
          notification_prefs?: Json | null
          platforms?: string[] | null
          role: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          cover_banner_url?: string | null
          created_at?: string | null
          display_name?: string
          follower_count?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          niche?: string[] | null
          notification_prefs?: Json | null
          platforms?: string[] | null
          role?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          card_id: string | null
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          status: string | null
        }
        Insert: {
          admin_note?: string | null
          card_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          status?: string | null
        }
        Update: {
          admin_note?: string | null
          card_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          reply: string | null
          reply_at: string | null
          reviewed_id: string | null
          reviewer_id: string | null
          room_id: string | null
          tags: string[] | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reply?: string | null
          reply_at?: string | null
          reviewed_id?: string | null
          reviewer_id?: string | null
          room_id?: string | null
          tags?: string[] | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reply?: string | null
          reply_at?: string | null
          reviewed_id?: string | null
          reviewer_id?: string | null
          room_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          application_id: string
          brand_id: string
          card_id: string
          created_at: string | null
          id: string
          influencer_id: string
          is_active: boolean | null
          status: string | null
        }
        Insert: {
          application_id: string
          brand_id: string
          card_id: string
          created_at?: string | null
          id?: string
          influencer_id: string
          is_active?: boolean | null
          status?: string | null
        }
        Update: {
          application_id?: string
          brand_id?: string
          card_id?: string
          created_at?: string | null
          id?: string
          influencer_id?: string
          is_active?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_cards: {
        Row: {
          card_id: string | null
          id: string
          influencer_id: string | null
          saved_at: string | null
        }
        Insert: {
          card_id?: string | null
          id?: string
          influencer_id?: string | null
          saved_at?: string | null
        }
        Update: {
          card_id?: string | null
          id?: string
          influencer_id?: string | null
          saved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_cards_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          admin_note: string | null
          created_at: string | null
          id: string
          notes: string | null
          reviewed_by: string | null
          role: string | null
          status: string | null
          submitted_links: string[] | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reviewed_by?: string | null
          role?: string | null
          status?: string | null
          submitted_links?: string[] | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reviewed_by?: string | null
          role?: string | null
          status?: string | null
          submitted_links?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
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
