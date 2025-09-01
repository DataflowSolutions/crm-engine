// Shared types and utilities for lead data

export type LeadFieldValue = {
  value: string;
  lead_fields: {
    label: string;
    field_type: string;
  } | null;
};

export type Lead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values: LeadFieldValue[];
};

// Type for raw Supabase query result which might have arrays
type RawLeadFieldValue = {
  value: string;
  lead_fields: {
    label: string;
    field_type: string;
  }[] | {
    label: string;
    field_type: string;
  } | null;
};

type RawLead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values: RawLeadFieldValue[];
};

// Helper function to get a meaningful display name from lead field values
export function getLeadDisplayName(lead: RawLead | Lead): string {
  if (!lead.lead_field_values || lead.lead_field_values.length === 0) {
    return `Lead #${lead.id.slice(0, 8)}`;
  }

  // Try to find common name fields in order of preference
  const nameFields = ['name', 'full_name', 'first_name', 'company', 'email', 'title'];
  
  for (const fieldKey of nameFields) {
    const field = lead.lead_field_values.find((fv: RawLeadFieldValue | LeadFieldValue) => {
      // Handle the case where lead_fields might be an array or a single object
      const leadField = Array.isArray(fv.lead_fields) ? fv.lead_fields[0] : fv.lead_fields;
      const fieldLabel = leadField?.label || '';
      return fieldLabel.toLowerCase().includes(fieldKey);
    });
    
    if (field && field.value && field.value.trim()) {
      return field.value.trim();
    }
  }

  // If no name-like field found, use the first non-empty field value
  const firstField = lead.lead_field_values.find((fv: RawLeadFieldValue | LeadFieldValue) => fv.value && fv.value.trim());
  if (firstField) {
    return firstField.value.trim();
  }

  // Fallback to ID
  return `Lead #${lead.id.slice(0, 8)}`;
}

// Helper function to get a specific field value from lead
export function getLeadFieldValue(lead: RawLead | Lead, fieldKey: string): string | null {
  if (!lead.lead_field_values || lead.lead_field_values.length === 0) {
    return null;
  }

  const field = lead.lead_field_values.find((fv: RawLeadFieldValue | LeadFieldValue) => {
    // Handle the case where lead_fields might be an array or a single object
    const leadField = Array.isArray(fv.lead_fields) ? fv.lead_fields[0] : fv.lead_fields;
    const fieldLabel = leadField?.label || '';
    return fieldLabel.toLowerCase().includes(fieldKey.toLowerCase());
  });

  return field?.value || null;
}
