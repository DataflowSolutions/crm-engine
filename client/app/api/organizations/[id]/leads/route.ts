// Unified API Route for all lead operations
// This replaces: /bulk-delete/route.ts, /bulk-operations/route.ts, and consolidates POST logic
import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Unified request types
type LeadOperation = {
  action: 'bulk_delete' | 'bulk_status_update' | 'search' | 'get_paginated';
  leadIds?: string[];
  newStatus?: string;
  searchTerm?: string;
  statusFilter?: string;
  limit?: number;
  offset?: number;
};

type BulkDeleteResponse = {
  success: boolean;
  deleted_count: number;
  error_message: string;
};

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

// Cache permissions for 5 minutes to avoid redundant checks
type PermissionsCacheEntry = {
  permissions: unknown;
  timestamp: number;
};

const permissionsCache = new Map<string, PermissionsCacheEntry>();

async function getPermissionsWithCache(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  userId: string, 
  orgId: string
) {
  const cacheKey = `${userId}:${orgId}`;
  const cached = permissionsCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < 300000) { // 5 minutes
    return cached.permissions;
  }
  
  const { data: permissions, error } = await supabase
    .rpc('get_user_permissions_fast', {
      p_user_id: userId,
      p_org_id: orgId
    })
    .single();
    
  if (!error && permissions) {
    permissionsCache.set(cacheKey, { permissions, timestamp: now });
  }
  
  return permissions;
}

// Unified GET handler for search and pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const statusFilter = searchParams.get('status') || null;
    const searchTerm = searchParams.get('search')?.trim() || null;

    const supabase = await createClient();

    // Get and cache auth
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions with caching
    const permissions = await getPermissionsWithCache(supabase, auth.user.id, orgId);
    if (!permissions) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let leads: LeadWithFieldsResponse[] = [];
    let totalCount = 0;

    if (searchTerm) {
      // Use client-side filtering for search until database search function is fixed
      const { data: allLeads, error: allLeadsError } = await supabase
        .rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: 1000, // Get more results for filtering
          p_offset: 0,
          p_status_filter: statusFilter
        }) as { data: LeadWithFieldsResponse[] | null; error: unknown };

      if (allLeadsError) {
        console.error('Error fetching leads for search:', allLeadsError);
        return NextResponse.json({ error: "Failed to fetch leads for search" }, { status: 500 });
      }

      // Client-side search filtering
      const searchTermLower = searchTerm.toLowerCase();
      const filteredLeads = (allLeads || []).filter(lead => {
        // Search in status
        if (lead.status?.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        // Search in field data
        if (Array.isArray(lead.field_data)) {
          return lead.field_data.some((field: { value?: string }) => 
            field.value?.toLowerCase().includes(searchTermLower)
          );
        }
        return false;
      });

      // Apply pagination to search results
      const searchStartIndex = offset;
      leads = filteredLeads.slice(searchStartIndex, searchStartIndex + limit);
      totalCount = filteredLeads.length;
    } else {
      // Use optimized pagination function
      const { data: paginatedResults, error: paginationError } = await supabase
        .rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: limit,
          p_offset: offset,
          p_status_filter: statusFilter
        }) as { data: LeadWithFieldsResponse[] | null; error: unknown };

      if (paginationError) {
        console.error('Pagination error:', paginationError);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
      }

      leads = paginatedResults || [];

      // Get total count for pagination
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', statusFilter || leads[0]?.status || 'draft');

      totalCount = count || 0;
    }

    return NextResponse.json({
      leads,
      totalCount,
      hasMore: (offset + limit) < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount
      }
    });

  } catch (error) {
    console.error('GET leads error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Unified POST handler for all lead operations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const body: LeadOperation = await request.json();
    const { action, leadIds, newStatus } = body;

    const supabase = await createClient();

    // Get and cache auth
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions with caching
    const permissions = await getPermissionsWithCache(supabase, auth.user.id, orgId);
    if (!permissions) {
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
            .single() as { data: BulkDeleteResponse | null; error: unknown };

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
          
          // Fallback: Manual deletion with transaction
          await supabase.rpc('begin');
          
          try {
            // Delete field values first
            await supabase
              .from("lead_field_values")
              .delete()
              .in("lead_id", leadIds);

            // Delete leads
            const { error: leadsError } = await supabase
              .from("leads")
              .delete()
              .eq("organization_id", orgId)
              .in("id", leadIds);

            if (leadsError) throw leadsError;

            await supabase.rpc('commit');
            
            return NextResponse.json({
              success: true,
              deletedCount: leadIds.length,
              message: `Successfully deleted ${leadIds.length} lead(s)`
            });
          } catch (fallbackError) {
            await supabase.rpc('rollback');
            throw fallbackError;
          }
        }

      case 'bulk_status_update':
        if (!newStatus || !Array.isArray(leadIds) || leadIds.length === 0) {
          return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // Batch update using optimized function or fallback
        try {
          const updatePromises = leadIds.map(leadId => 
            supabase.rpc('update_lead_status_fast', {
              p_lead_id: leadId,
              p_new_status: newStatus,
              p_org_id: orgId,
              p_user_id: auth.user.id
            })
          );

          const results = await Promise.allSettled(updatePromises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;

          return NextResponse.json({
            success: true,
            updatedCount: successCount,
            message: `Successfully updated ${successCount} lead(s) to ${newStatus}`
          });
        } catch {
          // Fallback: Direct update
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
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('POST leads operation error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of permissionsCache.entries()) {
    if (now - value.timestamp > 300000) { // 5 minutes
      permissionsCache.delete(key);
    }
  }
}, 60000); // Clean every minute
