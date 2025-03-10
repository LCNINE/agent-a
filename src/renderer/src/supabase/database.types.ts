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
      admins: {
        Row: {
          can_manage_admins: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          can_manage_admins?: boolean
          created_at?: string
          user_id: string
        }
        Update: {
          can_manage_admins?: boolean
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      free_trial_records: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_group_memberships: {
        Row: {
          created_at: string
          group_id: number
          member_id: string
        }
        Insert: {
          created_at?: string
          group_id: number
          member_id: string
        }
        Update: {
          created_at?: string
          group_id?: number
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "member_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_group_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_groups: {
        Row: {
          color: string
          created_at: string
          id: number
          name: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: number
          name?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          email: string
          name: string
          user_id: string
        }
        Insert: {
          email?: string
          name?: string
          user_id: string
        }
        Update: {
          email?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      my_feed_work: {
        Row: {
          created_at: string
          last_check_time: string
          member_id: string
          status: Database["public"]["Enums"]["my_feed_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_check_time?: string
          member_id?: string
          status?: Database["public"]["Enums"]["my_feed_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_check_time?: string
          member_id?: string
          status?: Database["public"]["Enums"]["my_feed_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_feed_work_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      smm_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          name_ko: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          name_ko: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          name_ko?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      smm_orderforms: {
        Row: {
          comment_content: string | null
          created_at: string | null
          id: number
          interval: number | null
          member_id: string | null
          memo: string
          quantity: number
          runs: number | null
          service_id: number | null
          status: Database["public"]["Enums"]["smm_order_status"]
          target_url: string
          updated_at: string | null
        }
        Insert: {
          comment_content?: string | null
          created_at?: string | null
          id?: number
          interval?: number | null
          member_id?: string | null
          memo?: string
          quantity: number
          runs?: number | null
          service_id?: number | null
          status?: Database["public"]["Enums"]["smm_order_status"]
          target_url: string
          updated_at?: string | null
        }
        Update: {
          comment_content?: string | null
          created_at?: string | null
          id?: number
          interval?: number | null
          member_id?: string | null
          memo?: string
          quantity?: number
          runs?: number | null
          service_id?: number | null
          status?: Database["public"]["Enums"]["smm_order_status"]
          target_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orderforms_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orderforms_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "smm_services"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_orders: {
        Row: {
          charge: number | null
          cost: number | null
          created_at: string | null
          currency: string | null
          id: number | null
          last_checked_at: string | null
          order_response: Json | null
          remains: number | null
          smmkings_order_id: string | null
          smmkings_status: string | null
          start_count: number | null
        }
        Insert: {
          charge?: number | null
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          id?: number | null
          last_checked_at?: string | null
          order_response?: Json | null
          remains?: number | null
          smmkings_order_id?: string | null
          smmkings_status?: string | null
          start_count?: number | null
        }
        Update: {
          charge?: number | null
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          id?: number | null
          last_checked_at?: string | null
          order_response?: Json | null
          remains?: number | null
          smmkings_order_id?: string | null
          smmkings_status?: string | null
          start_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smm_orders_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "smm_orderforms"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_services: {
        Row: {
          api_endpoint: string | null
          cancel: boolean | null
          category_id: number | null
          created_at: string | null
          description: string | null
          id: number
          max_quantity: number
          min_quantity: number
          name: string
          name_ko: string
          rate: number
          refill: boolean | null
          selling_rate: number | null
          smmkings_service_id: number
          type: string | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          cancel?: boolean | null
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          max_quantity: number
          min_quantity: number
          name: string
          name_ko: string
          rate: number
          refill?: boolean | null
          selling_rate?: number | null
          smmkings_service_id: number
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          cancel?: boolean | null
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          max_quantity?: number
          min_quantity?: number
          name?: string
          name_ko?: string
          rate?: number
          refill?: boolean | null
          selling_rate?: number | null
          smmkings_service_id?: number
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smm_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "smm_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_accounts: {
        Row: {
          created_at: string
          id: string
          instagram_username: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_username: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_username?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          delta_days: number
          event_type: Database["public"]["Enums"]["subscription_event_type"]
          id: number
          new_end_date: string
          previous_end_date: string
          reason: string | null
          subscription_id: number
        }
        Insert: {
          created_at?: string
          delta_days: number
          event_type: Database["public"]["Enums"]["subscription_event_type"]
          id?: number
          new_end_date: string
          previous_end_date: string
          reason?: string | null
          subscription_id: number
        }
        Update: {
          created_at?: string
          delta_days?: number
          event_type?: Database["public"]["Enums"]["subscription_event_type"]
          id?: number
          new_end_date?: string
          previous_end_date?: string
          reason?: string | null
          subscription_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string
          id: number
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: number
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: number
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          created_at: string
          hashtag: string | null
          id: string
          time: string
          type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          created_at?: string
          hashtag?: string | null
          id?: string
          time: string
          type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          created_at?: string
          hashtag?: string | null
          id?: string
          time?: string
          type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_subscription: {
        Args: {
          p_user_id: string
          p_days: number
        }
        Returns: number
      }
      cancel_subscription: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      get_current_subscription: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_users: {
        Args: {
          page?: number
          page_size?: number
        }
        Returns: {
          id: string
          email: string
          name: string
          created_at: string
        }[]
      }
      is_admin: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      process_free_trial:
        | {
            Args: {
              user_id_param: number
            }
            Returns: undefined
          }
        | {
            Args: {
              user_id_param: string
            }
            Returns: undefined
          }
      reduce_subscription: {
        Args: {
          p_user_id: string
          p_days: number
        }
        Returns: number
      }
      start_free_trial: {
        Args: {
          user_id_param: string
        }
        Returns: undefined
      }
      sync_smmkings_services: {
        Args: {
          services_data: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      my_feed_status: "active" | "paused" | "completed"
      smm_order_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "canceled"
        | "succeeded"
      subscription_event_type: "start" | "extend" | "reduce" | "cancel"
      work_type: "feed" | "hashtag"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
