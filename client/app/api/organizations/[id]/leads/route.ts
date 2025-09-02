// Optimized API Route for leads
// /app/api/organizations/[id]/leads/route.ts

import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type LeadWithFieldsResponse = {
  lead_id: string;
  template_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  field_data: Array<{
    value: string;
    label: string;
    field_type: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const statusFilter = searchParams.get('status') || null;

    const supabase = await createClient();

    // Get the current user
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user access using optimized function
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_permissions_fast', {
        p_user_id: auth.user.id,
        p_org_id: orgId
      })
      .single();

    if (permError || !permissions) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Use optimized leads function
    const { data: leads, error: leadsError } = await supabase
      .rpc('get_leads_with_fields', {
        p_org_id: orgId,
        p_limit: limit,
        p_offset: offset,
        p_status_filter: statusFilter
      }) as { data: LeadWithFieldsResponse[] | null; error: unknown };

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq(statusFilter ? 'status' : 'id', statusFilter || 'id'); // Clever way to conditionally filter

    if (countError) {
      console.error('Error counting leads:', countError);
    }

    return NextResponse.json({
      leads: leads || [],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0),
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
