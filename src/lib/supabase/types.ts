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
      restaurants: {
        Row: {
          id: string
          slug: string
          name: string
          logo_url: string | null
          staff_pin_hash: string
          ghl_location_id: string | null
          ghl_api_key_encrypted: string | null
          coupon_expiry_days: number
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          logo_url?: string | null
          staff_pin_hash: string
          ghl_location_id?: string | null
          ghl_api_key_encrypted?: string | null
          coupon_expiry_days?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          logo_url?: string | null
          staff_pin_hash?: string
          ghl_location_id?: string | null
          ghl_api_key_encrypted?: string | null
          coupon_expiry_days?: number
          created_at?: string
        }
        Relationships: []
      }
      spins: {
        Row: {
          id: string
          restaurant_id: string
          session_token: string
          prize_percent: number
          claimed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          session_token: string
          prize_percent: number
          claimed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          session_token?: string
          prize_percent?: number
          claimed?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spins_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      coupons: {
        Row: {
          id: string
          spin_id: string
          restaurant_id: string
          guest_name: string
          guest_phone: string
          sms_consent: boolean
          consent_timestamp: string | null
          consent_wording_version: string
          prize_percent: number
          status: string
          expires_at: string
          redeemed_at: string | null
          redeemed_by: string | null
          ghl_contact_id: string | null
          pass_serial: string
          created_at: string
        }
        Insert: {
          id?: string
          spin_id: string
          restaurant_id: string
          guest_name: string
          guest_phone: string
          sms_consent: boolean
          consent_timestamp?: string | null
          consent_wording_version?: string
          prize_percent: number
          status?: string
          expires_at: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          ghl_contact_id?: string | null
          pass_serial: string
          created_at?: string
        }
        Update: {
          id?: string
          spin_id?: string
          restaurant_id?: string
          guest_name?: string
          guest_phone?: string
          sms_consent?: boolean
          consent_timestamp?: string | null
          consent_wording_version?: string
          prize_percent?: number
          status?: string
          expires_at?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          ghl_contact_id?: string | null
          pass_serial?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_spin_id_fkey"
            columns: ["spin_id"]
            isOneToOne: true
            referencedRelation: "spins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
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

// Helper types
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Spin = Database['public']['Tables']['spins']['Row']
export type Coupon = Database['public']['Tables']['coupons']['Row']
