export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      members: {
        Row: {
          name: string
          user_id: string
        }
        Insert: {
          name?: string
          user_id: string
        }
        Update: {
          name?: string
          user_id?: string
        }
        Relationships: []
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
          event_type: Database['public']['Enums']['subscription_event_type']
          id: number
          new_end_date: string
          previous_end_date: string
          reason: string | null
          subscription_id: number
        }
        Insert: {
          created_at?: string
          delta_days: number
          event_type: Database['public']['Enums']['subscription_event_type']
          id?: number
          new_end_date: string
          previous_end_date: string
          reason?: string | null
          subscription_id: number
        }
        Update: {
          created_at?: string
          delta_days?: number
          event_type?: Database['public']['Enums']['subscription_event_type']
          id?: number
          new_end_date?: string
          previous_end_date?: string
          reason?: string | null
          subscription_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'subscription_events_subscription_id_fkey'
            columns: ['subscription_id']
            isOneToOne: false
            referencedRelation: 'subscriptions'
            referencedColumns: ['id']
          }
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
          type: Database['public']['Enums']['work_type']
        }
        Insert: {
          created_at?: string
          hashtag?: string | null
          id?: string
          time: string
          type: Database['public']['Enums']['work_type']
        }
        Update: {
          created_at?: string
          hashtag?: string | null
          id?: string
          time?: string
          type?: Database['public']['Enums']['work_type']
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
    }
    Enums: {
      subscription_event_type: 'start' | 'extend' | 'reduce' | 'cancel'
      work_type: 'feed' | 'hashtag'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never
