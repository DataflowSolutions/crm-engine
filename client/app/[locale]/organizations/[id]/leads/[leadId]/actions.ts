"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Type definitions for optimized responses
type LeadDetailResponse = {
  lead_id: string;
  template_id: string;
  template_name: string;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  status: string;
  field_values: Record<string, string>;
  template_fields: Array<{
    id: string;
    field_key: string;
    label: string;
    field_type: string;
    is_required: boolean;
    sort_order: number;
  }>;
  has_access: boolean;
};

type UpsertFieldValuesResponse = {
  success: boolean;
  error_message: string;
  updated_fields: number;
};

// Optimized function to get lead details with all field data in one query
export async function getLeadWithDetails(leadId: string, orgId: string) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Use optimized database function
    const { data: leadDetail, error } = await sb
      .rpc('get_lead_with_details', {
        p_lead_id: leadId,
        p_org_id: orgId,
        p_user_id: auth.user.id
      })
      .single() as { data: LeadDetailResponse | null; error: unknown };

    if (error || !leadDetail) {
      throw new Error("Lead not found or access denied");
    }

    if (!leadDetail.has_access) {
      throw new Error("Access denied");
    }

    return {
      success: true,
      data: {
        id: leadDetail.lead_id,
        template_id: leadDetail.template_id,
        template_name: leadDetail.template_name,
        created_by: leadDetail.created_by,
        creator_name: leadDetail.creator_name,
        created_at: leadDetail.created_at,
        updated_at: leadDetail.updated_at,
        status: leadDetail.status,
        field_values: leadDetail.field_values,
        template_fields: leadDetail.template_fields
      }
    };
  } catch (error) {
    console.error('Error fetching lead details:', error);
    throw new Error("Failed to fetch lead details");
  }
}

// Optimized function to update multiple field values at once
export async function updateLeadFieldValue(
  leadId: string,
  orgId: string,
  fieldId: string,
  value: string
) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Use optimized upsert function for single field
    const fieldValues = { [fieldId]: value };
    
    const { data: result, error } = await sb
      .rpc('upsert_lead_field_values', {
        p_lead_id: leadId,
        p_org_id: orgId,
        p_user_id: auth.user.id,
        p_field_values: fieldValues
      })
      .single() as { data: UpsertFieldValuesResponse | null; error: unknown };

    if (error || !result?.success) {
      throw new Error(result?.error_message || "Failed to update field value");
    }

    // Revalidate pages
    revalidatePath(`/organizations/${orgId}/leads/${leadId}`);
    revalidatePath(`/organizations/${orgId}/leads`);
    
    return { success: true };
  } catch (dbError) {
    console.log('Database function not available, using fallback:', dbError);
    
    // Fallback to original method
    const { data: lead } = await sb
      .from("leads")
      .select("id, organization_id")
      .eq("id", leadId)
      .eq("organization_id", orgId)
      .single();

    if (!lead) {
      throw new Error("Lead not found or access denied");
    }

    // Check if field value already exists
    const { data: existingValue } = await sb
      .from("lead_field_values")
      .select("id")
      .eq("lead_id", leadId)
      .eq("field_id", fieldId)
      .single();

    if (existingValue) {
      // Update existing value
      const { error } = await sb
        .from("lead_field_values")
        .update({ value })
        .eq("id", existingValue.id);

      if (error) {
        throw new Error(`Failed to update field value: ${error.message}`);
      }
    } else {
      // Insert new value
      const { error } = await sb
        .from("lead_field_values")
        .insert({
          lead_id: leadId,
          field_id: fieldId,
          value
        });

      if (error) {
        throw new Error(`Failed to add field value: ${error.message}`);
      }
    }

    // Update lead's updated_at timestamp
    await sb
      .from("leads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", leadId);

    // Revalidate pages
    revalidatePath(`/organizations/${orgId}/leads/${leadId}`);
    revalidatePath(`/organizations/${orgId}/leads`);
    
    return { success: true };
  }
}

// Optimized function to add multiple missing template fields at once
export async function addMissingTemplateFields(
  leadId: string,
  orgId: string,
  locale: string,
  fieldValues: Record<string, string>
) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Filter out empty values
    const filteredValues = Object.fromEntries(
      Object.entries(fieldValues).filter(([, value]) => value.trim() !== '')
    );

    if (Object.keys(filteredValues).length === 0) {
      return { success: true };
    }

    // Use optimized upsert function
    const { data: result, error } = await sb
      .rpc('upsert_lead_field_values', {
        p_lead_id: leadId,
        p_org_id: orgId,
        p_user_id: auth.user.id,
        p_field_values: filteredValues
      })
      .single() as { data: UpsertFieldValuesResponse | null; error: unknown };

    if (error || !result?.success) {
      throw new Error(result?.error_message || "Failed to add field values");
    }

    // Revalidate pages
    revalidatePath(`/organizations/${orgId}/leads/${leadId}`);
    revalidatePath(`/organizations/${orgId}/leads`);
    
    return { 
      success: true, 
      updatedFields: result.updated_fields 
    };
  } catch (dbError) {
    console.log('Database function not available, using fallback:', dbError);
    
    // Fallback to original method
    const { data: lead } = await sb
      .from("leads")
      .select("id, organization_id, template_id")
      .eq("id", leadId)
      .eq("organization_id", orgId)
      .single();

    if (!lead) {
      throw new Error("Lead not found or access denied");
    }

    // Insert multiple field values
    const insertData = Object.entries(fieldValues)
      .filter(([, value]) => value.trim() !== '')
      .map(([fieldId, value]) => ({
        lead_id: leadId,
        field_id: fieldId,
        value: value.trim()
      }));

    if (insertData.length > 0) {
      const { error } = await sb
        .from("lead_field_values")
        .insert(insertData);

      if (error) {
        throw new Error(`Failed to add field values: ${error.message}`);
      }

      // Update lead's updated_at timestamp
      await sb
        .from("leads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", leadId);
    }

    // Revalidate pages
    revalidatePath(`/organizations/${orgId}/leads/${leadId}`);
    revalidatePath(`/organizations/${orgId}/leads`);
    
    return { success: true };
  }
}
