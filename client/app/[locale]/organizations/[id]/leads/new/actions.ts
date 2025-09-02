"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";

type CreateLeadResponse = {
  success: boolean;
  lead_id: string;
  error_message: string;
};

// Optimized function to create a lead with all field values in one transaction
export async function createLead(formData: FormData) {
  const sb = await createClient();
  
  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  const organizationId = formData.get("organizationId") as string;
  const templateId = formData.get("templateId") as string;
  const locale = formData.get("locale") as string;
  const status = formData.get("status") as string || "draft";

  console.log("🔍 [Create Lead] Template ID received:", templateId);

  try {
    // Get template details to map field values correctly
    // For universal templates, we need to check both the org ID and universal org ID
    const { data: template, error: templateError } = await sb
      .from("lead_templates")
      .select(`
        id,
        name,
        lead_fields!fld_tpl_fk (
          id,
          field_key,
          label,
          field_type
        )
      `)
      .eq("id", templateId)
      .or(`organization_id.eq.${organizationId},organization_id.eq.00000000-0000-0000-0000-000000000000`)
      .single();

    if (templateError) {
      console.log("❌ [Create Lead] Template query failed:", templateError);
      throw templateError;
    }

    console.log("✅ [Create Lead] Template found:", template?.name, "with", template?.lead_fields?.length || 0, "fields");

    // Collect field values from form data
    const fieldValues: Record<string, string> = {};
    if (template?.lead_fields) {
      template.lead_fields.forEach((field: { id: string; field_key: string; label: string }) => {
        const value = formData.get(field.field_key) as string;
        if (value && value.trim()) {
          fieldValues[field.field_key] = value.trim();
        }
      });
    }

    // Debug logging
    console.log('📊 [Create Lead] Field values collected:', Object.keys(fieldValues).length);

    // Try optimized database function first (faster path)
    if (Object.keys(fieldValues).length > 0) {
      console.log('🚀 [Create Lead] Using optimized database function...');
      try {
        const { data: result, error } = await sb
          .rpc('create_lead_with_fields', {
            p_org_id: organizationId,
            p_template_id: templateId,
            p_user_id: auth.user.id,
            p_status: status,
            p_field_values: fieldValues
          })
          .single() as { data: CreateLeadResponse | null; error: unknown };

        if (error || !result?.success) {
          throw new Error(result?.error_message || "Database function failed");
        }

        console.log('✅ [Create Lead] Database function succeeded - redirecting');
        // Fast path success - redirect immediately
        redirect(`/${locale}/organizations/${organizationId}/leads`);
      } catch (dbError) {
        // Re-throw NEXT_REDIRECT errors - these are not actual errors
        if (dbError && typeof dbError === 'object' && 'digest' in dbError && 
            (dbError as { digest?: string }).digest?.includes('NEXT_REDIRECT')) {
          throw dbError;
        }
        console.log('⚠️ [Create Lead] Database function failed, using fallback:', dbError);
      }
    } else {
      console.log('📝 [Create Lead] No field values, using simple insert...');
    }

    // Fallback to manual approach
    console.log('🔄 [Create Lead] Using fallback method');
    
    const { data: lead, error: leadError } = await sb
      .from("leads")
      .insert({
        organization_id: organizationId,
        template_id: templateId,
        created_by: auth.user.id,
        status: status
      })
      .select()
      .single();

    if (leadError) {
      throw leadError;
    }

    // Insert field values if any (in parallel for better performance)
    if (template?.lead_fields && Object.keys(fieldValues).length > 0) {
      const fieldValueInserts = template.lead_fields
        .map((field: { id: string; field_key: string; label: string }) => {
          const value = fieldValues[field.field_key];
          if (value) {
            return {
              lead_id: lead.id,
              field_id: field.id,
              value: value
            };
          }
          return null;
        })
        .filter(Boolean);

      if (fieldValueInserts.length > 0) {
        // Don't await - let it run in background for faster response
        sb.from("lead_field_values")
          .insert(fieldValueInserts)
          .then(({ error }) => {
            if (error) {
              console.error("Error creating field values:", error);
            }
          });
      }
    }

    console.log('✅ [Create Lead] Fallback method completed - redirecting');
    // Immediate redirect for better perceived performance
    redirect(`/${locale}/organizations/${organizationId}/leads`);
    
  } catch (error) {
    // Re-throw NEXT_REDIRECT errors - these are not actual errors
    if (error && typeof error === 'object' && 'digest' in error && 
        (error as { digest?: string }).digest?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    
    console.error("Error in createLead:", error);
    redirect(`/${locale}/organizations/${organizationId}/leads/new?error=failed`);
  }
}

// Optimized function to get template data for form
export async function getTemplateForForm(templateId: string, orgId: string) {
  const sb = await createClient();
  
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    const { data: template, error } = await sb
      .from("lead_templates")
      .select(`
        id,
        name,
        lead_fields!fld_tpl_fk (
          id,
          field_key,
          label,
          field_type,
          is_required,
          options
        )
      `)
      .eq("id", templateId)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return template;
  } catch (error) {
    console.error("Error in getTemplateForForm:", error);
    return null;
  }
}
