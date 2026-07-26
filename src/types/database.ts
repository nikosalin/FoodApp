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
      businesses: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          country_code: "DE";
          currency: "EUR";
          stripe_account_id: string | null;
          paypal_merchant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          country_code?: "DE";
          currency?: "EUR";
          stripe_account_id?: string | null;
          paypal_merchant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      business_admins: {
        Row: {
          business_id: string;
          user_id: string;
          role: "owner" | "admin";
          created_at: string;
        };
        Insert: {
          business_id: string;
          user_id: string;
          role?: "owner" | "admin";
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["business_admins"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "business_admins_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["restaurant_status"];
          phone: string | null;
          email: string | null;
          address_line: string;
          postal_code: string;
          city: string;
          country_code: "DE";
          timezone: "Europe/Berlin";
          accepts_table: boolean;
          accepts_takeaway: boolean;
          accepts_delivery: boolean;
          accepts_cash_on_delivery: boolean;
          ordering_override_mode: "open" | "closed" | null;
          ordering_override_until: string | null;
          ordering_override_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["restaurant_status"];
          phone?: string | null;
          email?: string | null;
          address_line: string;
          postal_code: string;
          city: string;
          country_code?: "DE";
          timezone?: "Europe/Berlin";
          accepts_table?: boolean;
          accepts_takeaway?: boolean;
          accepts_delivery?: boolean;
          accepts_cash_on_delivery?: boolean;
          ordering_override_mode?: "open" | "closed" | null;
          ordering_override_until?: string | null;
          ordering_override_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "restaurants_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_opening_hours: {
        Row: {
          id: string;
          restaurant_id: string;
          day_of_week: number;
          opens_at: string;
          closes_at: string;
          closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          day_of_week: number;
          opens_at: string;
          closes_at: string;
          closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["restaurant_opening_hours"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "restaurant_opening_hours_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_categories"]["Insert"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          code: string;
          name: string;
          description: string;
          price_minor: number;
          active: boolean;
          sold_out: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          code: string;
          name: string;
          description?: string;
          price_minor: number;
          active?: boolean;
          sold_out?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          business_id: string;
          order_number: string;
          source: Database["public"]["Enums"]["order_source"];
          order_type: Database["public"]["Enums"]["order_type"];
          table_number: string | null;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          delivery_address: Json | null;
          customer_notes: string | null;
          status: Database["public"]["Enums"]["order_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          total_minor: number;
          currency: "EUR";
          tracking_token_hash: string;
          contact_verified: boolean;
          accepted_at: string | null;
          closed_at: string | null;
          rejection_reason: string | null;
          created_by: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          business_id: string;
          order_number?: string;
          source?: Database["public"]["Enums"]["order_source"];
          order_type: Database["public"]["Enums"]["order_type"];
          table_number?: string | null;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          delivery_address?: Json | null;
          customer_notes?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          total_minor: number;
          currency?: "EUR";
          tracking_token_hash: string;
          contact_verified?: boolean;
          accepted_at?: string | null;
          closed_at?: string | null;
          rejection_reason?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          menu_item_code: string;
          name_snapshot: string;
          unit_price_minor: number;
          quantity: number;
          line_total_minor: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          menu_item_code: string;
          name_snapshot: string;
          unit_price_minor: number;
          quantity: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          business_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          method: Database["public"]["Enums"]["payment_method"];
          status: Database["public"]["Enums"]["payment_status"];
          amount_minor: number;
          currency: "EUR";
          provider_payment_id: string | null;
          provider_authorization_id: string | null;
          idempotency_key: string;
          authorized_at: string | null;
          captured_at: string | null;
          cancelled_at: string | null;
          refunded_at: string | null;
          failure_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          business_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          method: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["payment_status"];
          amount_minor: number;
          currency?: "EUR";
          provider_payment_id?: string | null;
          provider_authorization_id?: string | null;
          idempotency_key: string;
          authorized_at?: string | null;
          captured_at?: string | null;
          cancelled_at?: string | null;
          refunded_at?: string | null;
          failure_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          payment_id: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          event_type: string;
          status: Database["public"]["Enums"]["payment_status"] | null;
          received_at: string;
          processed_at: string | null;
          failure_code: string | null;
        };
        Insert: {
          id?: string;
          payment_id?: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          event_type: string;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          received_at?: string;
          processed_at?: string | null;
          failure_code?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["payment_events"]["Insert"]
        >;
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          id: string;
          order_id: string | null;
          event_type: string;
          channel: "email";
          recipient: string;
          template_data: Json;
          status: Database["public"]["Enums"]["notification_status"];
          provider_message_id: string | null;
          attempt_count: number;
          next_attempt_at: string;
          last_error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          event_type: string;
          channel?: "email";
          recipient: string;
          template_data?: Json;
          status?: Database["public"]["Enums"]["notification_status"];
          provider_message_id?: string | null;
          attempt_count?: number;
          next_attempt_at?: string;
          last_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_outbox"]["Insert"]
        >;
        Relationships: [];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string;
          business_id: string;
          restaurant_id: string;
          actor_user_id: string | null;
          event_type: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"] | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          business_id: string;
          restaurant_id: string;
          actor_user_id?: string | null;
          event_type: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status?: Database["public"]["Enums"]["order_status"] | null;
          details?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          business_id: string | null;
          restaurant_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          reason: string | null;
          safe_changes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          restaurant_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          reason?: string | null;
          safe_changes?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["audit_events"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_from_menu: {
        Args: {
          p_restaurant_id: string;
          p_order_type: Database["public"]["Enums"]["order_type"];
          p_table_number: string | null;
          p_customer_name: string;
          p_customer_email: string | null;
          p_customer_phone: string | null;
          p_delivery_address: Json | null;
          p_customer_notes: string | null;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_items: Json;
          p_idempotency_key: string;
          p_request_hash: string;
          p_source?: Database["public"]["Enums"]["order_source"];
          p_created_by?: string | null;
        };
        Returns: Json;
      };
      update_order_from_menu: {
        Args: {
          p_order_id: string;
          p_restaurant_id: string;
          p_order_type: Database["public"]["Enums"]["order_type"];
          p_table_number: string | null;
          p_customer_name: string;
          p_customer_email: string | null;
          p_customer_phone: string | null;
          p_delivery_address: Json | null;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_items: Json;
          p_actor_user_id: string;
        };
        Returns: string;
      };
      claim_notification_jobs: {
        Args: {
          p_limit?: number;
        };
        Returns: Database["public"]["Tables"]["notification_outbox"]["Row"][];
      };
      transition_order_status: {
        Args: {
          p_order_id: string;
          p_restaurant_id: string;
          p_status: Database["public"]["Enums"]["order_status"];
          p_rejection_reason: string | null;
          p_actor_user_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      restaurant_status: "active" | "trial" | "blocked";
      order_status:
        | "pending"
        | "accepted"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
        | "rejected";
      order_type: "table" | "takeaway" | "delivery";
      order_source: "guest" | "admin" | "phone" | "walk_in" | "daily_summary";
      payment_provider: "stripe" | "paypal" | "offline";
      payment_method:
        | "card"
        | "apple_pay"
        | "google_pay"
        | "paypal"
        | "cash_on_site"
        | "cash_on_delivery"
        | "external_card"
        | "other";
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "cancelled"
        | "refunded"
        | "failed";
      notification_status:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "bounced"
        | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"];
