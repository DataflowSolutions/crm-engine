import { createClient } from "@/app/utils/supabase/server";
import { getUserPermissions } from "@/utils/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const sb = await createClient();

    // Check auth
    const { data: auth } = await sb.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user permissions
    const permissions = await getUserPermissions(orgId, auth.user.id);

    // Cache for 5 minutes
    return NextResponse.json(permissions, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
