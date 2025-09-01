export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string | null;
          slug: string | null;
          owner_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          slug?: string | null;
          owner_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          slug?: string | null;
          owner_id?: string;
          created_at?: string | null;
        };
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: 'owner' | 'admin' | 'member';
          accepted: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: 'owner' | 'admin' | 'member';
          accepted?: boolean;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          role?: 'owner' | 'admin' | 'member';
          accepted?: boolean;
          created_at?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          name: string | null;
          status: 'approved' | 'scheduled' | 'closed';
          created_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name?: string | null;
          status?: 'approved' | 'scheduled' | 'closed';
          created_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string | null;
          status?: 'approved' | 'scheduled' | 'closed';
          created_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
