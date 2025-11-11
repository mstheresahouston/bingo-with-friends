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
      bingo_cards: {
        Row: {
          card_data: Json
          created_at: string
          id: string
          marked_cells: Json
          player_id: string | null
        }
        Insert: {
          card_data: Json
          created_at?: string
          id?: string
          marked_cells?: Json
          player_id?: string | null
        }
        Update: {
          card_data?: Json
          created_at?: string
          id?: string
          marked_cells?: Json
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_cards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_calls: {
        Row: {
          call_number: number
          call_value: string
          created_at: string
          id: string
          room_id: string | null
        }
        Insert: {
          call_number: number
          call_value: string
          created_at?: string
          id?: string
          room_id?: string | null
        }
        Update: {
          call_number?: number
          call_value?: string
          created_at?: string
          id?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_calls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          diagonal_winner_id: string | null
          four_corners_winner_id: string | null
          game_type: string
          host_id: string | null
          id: string
          multi_game_progress: Json | null
          praise_dollar_value: number
          room_code: string
          status: string
          straight_winner_id: string | null
          updated_at: string
          win_condition: string
          winner_announced_at: string | null
          winner_player_id: string | null
        }
        Insert: {
          created_at?: string
          diagonal_winner_id?: string | null
          four_corners_winner_id?: string | null
          game_type?: string
          host_id?: string | null
          id?: string
          multi_game_progress?: Json | null
          praise_dollar_value?: number
          room_code: string
          status?: string
          straight_winner_id?: string | null
          updated_at?: string
          win_condition?: string
          winner_announced_at?: string | null
          winner_player_id?: string | null
        }
        Update: {
          created_at?: string
          diagonal_winner_id?: string | null
          four_corners_winner_id?: string | null
          game_type?: string
          host_id?: string | null
          id?: string
          multi_game_progress?: Json | null
          praise_dollar_value?: number
          room_code?: string
          status?: string
          straight_winner_id?: string | null
          updated_at?: string
          win_condition?: string
          winner_announced_at?: string | null
          winner_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_winners: {
        Row: {
          claimed_at: string
          id: string
          player_id: string
          prize_amount: number
          room_id: string
          win_type: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          player_id: string
          prize_amount?: number
          room_id: string
          win_type: string
        }
        Update: {
          claimed_at?: string
          id?: string
          player_id?: string
          prize_amount?: number
          room_id?: string
          win_type?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message: string
          player_name: string
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          player_name: string
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          player_name?: string
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          card_count: number
          created_at: string
          id: string
          player_name: string
          room_id: string | null
          score: number
          total_praise_dollars: number
          user_id: string | null
        }
        Insert: {
          card_count?: number
          created_at?: string
          id?: string
          player_name: string
          room_id?: string | null
          score?: number
          total_praise_dollars?: number
          user_id?: string | null
        }
        Update: {
          card_count?: number
          created_at?: string
          id?: string
          player_name?: string
          room_id?: string | null
          score?: number
          total_praise_dollars?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_room: { Args: { _user_id: string }; Returns: boolean }
      can_view_player: {
        Args: { _player_id: string; _user_id: string }
        Returns: boolean
      }
      get_prize_value_for_condition: {
        Args: { condition: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "host" | "vip" | "user"
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
      app_role: ["host", "vip", "user"],
    },
  },
} as const
