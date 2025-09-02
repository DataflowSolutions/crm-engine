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
  const nameFields = ['name', 'full_name', 'first_name', 'company', 'title', 'email'];
  
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

  // Filter out values that look like URLs, long text, or are not suitable for display names
  const suitableFields = lead.lead_field_values.filter((fv: RawLeadFieldValue | LeadFieldValue) => {
    if (!fv.value || !fv.value.trim()) return false;
    
    const value = fv.value.trim();
    
    // Skip URLs
    if (value.startsWith('http') || value.includes('://')) return false;
    
    // Skip very long values (probably descriptions or content)
    if (value.length > 50) return false;
    
    // Skip values that look like file paths
    if (value.includes('/') && value.includes('.')) return false;
    
    // Skip values that are just numbers (probably IDs)
    if (/^\d+$/.test(value)) return false;
    
    return true;
  });

  // Use the first suitable field
  if (suitableFields.length > 0) {
    return suitableFields[0].value.trim();
  }

  // If still no suitable field, try to extract something meaningful from URLs
  const urlField = lead.lead_field_values.find((fv: RawLeadFieldValue | LeadFieldValue) => {
    const value = fv.value?.trim() || '';
    return value.startsWith('http') || value.includes('://');
  });

  if (urlField) {
    try {
      const url = new URL(urlField.value);
      // Try to extract a meaningful name from the domain
      const domain = url.hostname.replace('www.', '');
      return domain.split('.')[0] || domain;
    } catch {
      // If URL parsing fails, use a truncated version
      return urlField.value.length > 30 ? `${urlField.value.substring(0, 30)}...` : urlField.value;
    }
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
