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
          user_id: string | null;
          organization_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          status: 'invited' | 'accepted' | 'suspended' | 'left';
          invited_email: string | null;
          invited_token: string | null;
          invited_at: string | null;
          accepted: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          organization_id: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          status?: 'invited' | 'accepted' | 'suspended' | 'left';
          invited_email?: string | null;
          invited_token?: string | null;
          invited_at?: string | null;
          accepted?: boolean;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          organization_id?: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          status?: 'invited' | 'accepted' | 'suspended' | 'left';
          invited_email?: string | null;
          invited_token?: string | null;
          invited_at?: string | null;
          accepted?: boolean;
          created_at?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
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
    Functions: {
      claim_invitation: {
        Args: {
          invitation_token: string;
          user_email: string;
          user_id_param: string;
        };
        Returns: {
          success: boolean;
          organization_id?: string;
          error?: string;
        };
      };
    };
    Enums: Record<string, never>;
  };
}
