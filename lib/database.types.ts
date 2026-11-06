// Generated from the live database schema, limited to this app's tables and view. Do not edit by hand.
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          path: unknown;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          path?: unknown;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          path?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      people: {
        Row: {
          id: string;
          full_name: string;
          org_id: string;
        };
        Insert: {
          id: string;
          full_name: string;
          org_id: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          org_id: string;
          body: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          body: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_test: {
        Row: {
          id: string;
          secret: string | null;
        };
        Insert: {
          id?: string;
          secret?: string | null;
        };
        Update: {
          id?: string;
          secret?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      team_directory: {
        Row: {
          full_name: string | null;
          org_name: string | null;
          path: unknown;
        };
        Relationships: [];
      };
    };
    Functions: {
      rls_status: {
        Args: never;
        Returns: { table_name: string; rls_enabled: boolean; rls_forced: boolean }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
