// Optimized API Route for bulk operations
// /app/api/organizations/[id]/leads/bulk-operations/route.ts

import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type BulkOperationRequest = {
  operation: 'delete' | 'update_status';
  leadIds: string[];
  newStatus?: string;
};

type BulkDeleteResponse = {
  success: boolean;
  deleted_count: number;
  error_message: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const body: BulkOperationRequest = await request.json();
    const { operation, leadIds, newStatus } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "Invalid lead IDs provided" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (operation === 'delete') {
      // Use optimized bulk delete function
      const { data: result, error } = await supabase
        .rpc('bulk_delete_leads', {
          p_lead_ids: leadIds,
          p_org_id: orgId,
          p_user_id: auth.user.id
        })
        .single() as { data: BulkDeleteResponse | null; error: unknown };

      if (error || !result?.success) {
        return NextResponse.json({ 
          error: result?.error_message || "Failed to delete leads" 
        }, { status: 500 });
      }

      return NextResponse.json({
        message: `Successfully deleted ${result.deleted_count} lead(s)`,
        deletedCount: result.deleted_count
      });

    } else if (operation === 'update_status' && newStatus) {
      // For status updates, we can use a batch approach
      const results = await Promise.allSettled(
        leadIds.map(leadId => 
          supabase.rpc('update_lead_status_fast', {
            p_lead_id: leadId,
            p_new_status: newStatus,
            p_org_id: orgId,
            p_user_id: auth.user.id
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason);

      if (errors.length > 0) {
        console.error('Bulk status update errors:', errors);
      }

      return NextResponse.json({
        message: `Successfully updated ${successCount} lead(s)`,
        updatedCount: successCount,
        errors: errors.length > 0 ? `${errors.length} operations failed` : undefined
      });

    } else {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
