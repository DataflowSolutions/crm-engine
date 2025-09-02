// Optimized API Route for leads with search and pagination
// /app/api/organizations/[id]/leads/route-optimized.ts

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
  relevance_score?: number;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
    const offset = parseInt(searchParams.get('offset') || '0');
    const statusFilter = searchParams.get('status') || null;
    const searchTerm = searchParams.get('search')?.trim() || null;

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

    let leads: LeadWithFieldsResponse[] = [];
    let totalCount = 0;

    try {
      if (searchTerm) {
        // Use search function for text searches
        const { data: searchResults, error: searchError } = await supabase
          .rpc('search_leads', {
            p_org_id: orgId,
            p_search_term: searchTerm,
            p_status_filter: statusFilter,
            p_limit: limit,
            p_offset: offset
          }) as { data: LeadWithFieldsResponse[] | null; error: unknown };

        if (searchError) {
          throw new Error("Search function failed");
        }

        leads = searchResults || [];

        // Get total count for search (for pagination)
        const { data: countResults } = await supabase
          .rpc('search_leads', {
            p_org_id: orgId,
            p_search_term: searchTerm,
            p_status_filter: statusFilter,
            p_limit: 10000, // Large number to get all results for count
            p_offset: 0
          }) as { data: LeadWithFieldsResponse[] | null; error: unknown };

        totalCount = countResults?.length || 0;
      } else {
        // Use regular optimized leads function
        const { data: leadsResults, error: leadsError } = await supabase
          .rpc('get_leads_with_fields', {
            p_org_id: orgId,
            p_limit: limit,
            p_offset: offset,
            p_status_filter: statusFilter
          }) as { data: LeadWithFieldsResponse[] | null; error: unknown };

        if (leadsError) {
          throw new Error("Leads function failed");
        }

        leads = leadsResults || [];

        // Get total count for pagination
        const { count, error: countError } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq(statusFilter ? 'status' : 'organization_id', statusFilter || orgId);

        if (!countError) {
          totalCount = count || 0;
        }
      }
    } catch (dbFunctionError) {
      console.log('Database functions not available, using fallback method:', dbFunctionError);
      
      // Fallback to original query method
      let query = supabase
        .from('leads')
        .select(`
          id,
          template_id,
          created_by,
          created_at,
          updated_at,
          status,
          lead_field_values (
            value,
            lead_fields (
              label,
              field_type
            )
          )
        `)
        .eq('organization_id', orgId);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        // Basic search in field values using EXISTS subquery
        query = query.filter('id', 'in', `(
          SELECT DISTINCT lead_id 
          FROM lead_field_values 
          WHERE value ILIKE '%${searchTerm}%'
        )`);
      }

      const { data: fallbackLeads, error: fallbackError, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
      }

      // Transform fallback data to expected format
      leads = (fallbackLeads || []).map(lead => ({
        lead_id: lead.id,
        template_id: lead.template_id || '',
        created_by: lead.created_by,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        status: lead.status,
        field_data: (lead.lead_field_values || []).map((lfv: { value: string; lead_fields: { label: string; field_type: string }[] }) => ({
          value: lfv.value,
          label: lfv.lead_fields?.[0]?.label || 'Unknown',
          field_type: lfv.lead_fields?.[0]?.field_type || 'text'
        }))
      }));

      totalCount = count || 0;
    }

    const hasMore = (offset + limit) < totalCount;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);

    // Add cache headers for better performance
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute
    headers.set('X-Total-Count', totalCount.toString());
    headers.set('X-Page', currentPage.toString());
    headers.set('X-Per-Page', limit.toString());

    return NextResponse.json({
      success: true,
      leads: leads,
      pagination: {
        totalCount,
        currentPage,
        totalPages,
        hasMore,
        limit,
        offset
      },
      meta: {
        searchTerm,
        statusFilter,
        resultCount: leads.length
      }
    }, { headers });

  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optimized POST endpoint for bulk operations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const body = await request.json();
    const { action, leadIds } = body;

    const supabase = await createClient();

    // Get the current user
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user permissions
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_permissions_fast', {
        p_user_id: auth.user.id,
        p_org_id: orgId
      })
      .single();

    if (permError || !permissions) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    switch (action) {
      case 'bulk_delete':
        if (!Array.isArray(leadIds) || leadIds.length === 0) {
          return NextResponse.json({ error: "Invalid lead IDs" }, { status: 400 });
        }

        try {
          // Use optimized bulk delete function
          const { data: result, error } = await supabase
            .rpc('bulk_delete_leads', {
              p_lead_ids: leadIds,
              p_org_id: orgId,
              p_user_id: auth.user.id
            })
            .single() as { data: { success: boolean; deleted_count: number; error_message: string } | null; error: unknown };

          if (error || !result?.success) {
            throw new Error(result?.error_message || "Bulk delete function failed");
          }

          return NextResponse.json({
            success: true,
            deletedCount: result.deleted_count,
            message: `Successfully deleted ${result.deleted_count} lead(s)`
          });
        } catch (error) {
          console.log('Bulk delete function not available, using fallback', error);
          
          // Fallback method would go here
          return NextResponse.json({ error: "Bulk delete not available" }, { status: 503 });
        }

      case 'bulk_status_update':
        const { newStatus } = body;
        if (!newStatus || !Array.isArray(leadIds) || leadIds.length === 0) {
          return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // Update multiple leads status
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', orgId)
          .in('id', leadIds);

        if (updateError) {
          return NextResponse.json({ error: "Failed to update leads" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          updatedCount: leadIds.length,
          message: `Successfully updated ${leadIds.length} lead(s) to ${newStatus}`
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('Leads POST API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
