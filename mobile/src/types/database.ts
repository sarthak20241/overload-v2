export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      body_measurements: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          chest: number | null;
          shoulders: number | null;
          neck: number | null;
          bicep_l: number | null;
          bicep_r: number | null;
          forearm_l: number | null;
          forearm_r: number | null;
          waist: number | null;
          hips: number | null;
          thigh_l: number | null;
          thigh_r: number | null;
          calf_l: number | null;
          calf_r: number | null;
          created_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['body_measurements']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['body_measurements']['Insert']>;
      };
      bodyfat_log: {
        Row: { id: string; user_id: string; date: string; bodyfat: number; created_at: string | null };
        Insert: { id?: string; user_id: string; date: string; bodyfat: number; created_at?: string | null };
        Update: Partial<Database['public']['Tables']['bodyfat_log']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          weight_unit: string | null;
          height: string | null;
          height_unit: string | null;
          weight: string | null;
          goal_weight: string | null;
          body_fat: string | null;
          gender: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: { id: string } & Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      routine_exercises: {
        Row: {
          id: string;
          routine_id: string;
          name: string;
          muscle_group: string | null;
          target_sets: number;
          target_reps: string;
          rest_seconds: number;
          notes: string | null;
          sort_order: number;
        };
        Insert: Omit<Database['public']['Tables']['routine_exercises']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['routine_exercises']['Insert']>;
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['routines']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['routines']['Insert']>;
      };
      session_exercises: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string | null;
          name: string;
          muscle_group: string | null;
          notes: string | null;
          sort_order: number;
        };
        Insert: Omit<Database['public']['Tables']['session_exercises']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['session_exercises']['Insert']>;
      };
      session_sets: {
        Row: {
          id: string;
          session_exercise_id: string;
          weight: number;
          reps: number;
          completed: boolean;
        };
        Insert: Omit<Database['public']['Tables']['session_sets']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['session_sets']['Insert']>;
      };
      weight_log: {
        Row: { id: string; user_id: string; date: string; weight: number; created_at: string | null };
        Insert: { id?: string; user_id: string; date: string; weight: number; created_at?: string | null };
        Update: Partial<Database['public']['Tables']['weight_log']['Insert']>;
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string | null;
          routine_name: string;
          start_time: string;
          end_time: string;
          duration_seconds: number;
          total_volume: number;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['workout_sessions']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['workout_sessions']['Insert']>;
      };
      xp_data: {
        Row: { user_id: string; total_xp: number; milestones: Json | null; updated_at: string | null };
        Insert: { user_id: string; total_xp?: number; milestones?: Json | null; updated_at?: string | null };
        Update: Partial<Database['public']['Tables']['xp_data']['Insert']>;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
