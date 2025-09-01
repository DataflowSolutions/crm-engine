import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type BulkDeleteRequest = {
  leadIds: string[];
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const body: BulkDeleteRequest = await request.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "Invalid lead IDs provided" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to the organization
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", auth.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify that all leads belong to this organization
    const { data: leadsToDelete } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", orgId)
      .in("id", leadIds);

    if (!leadsToDelete || leadsToDelete.length !== leadIds.length) {
      return NextResponse.json({ 
        error: "Some leads do not exist or do not belong to this organization" 
      }, { status: 400 });
    }

    // Delete lead field values first (due to foreign key constraints)
    const { error: valuesError } = await supabase
      .from("lead_field_values")
      .delete()
      .in("lead_id", leadIds);

    if (valuesError) {
      console.error('Error deleting lead field values:', valuesError);
      return NextResponse.json({ 
        error: "Failed to delete lead field values" 
      }, { status: 500 });
    }

    // Delete the leads
    const { error: leadsError } = await supabase
      .from("leads")
      .delete()
      .in("id", leadIds);

    if (leadsError) {
      console.error('Error deleting leads:', leadsError);
      return NextResponse.json({ 
        error: "Failed to delete leads" 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully deleted ${leadIds.length} lead(s)`,
      deletedCount: leadIds.length
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
