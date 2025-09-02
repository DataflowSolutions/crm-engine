-- Performance Optimization: SQL Functions
-- Run this in your Supabase SQL editor

-- 1. Function to get user permissions with organization info in one call
CREATE OR REPLACE FUNCTION get_user_permissions_fast(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS TABLE (
  role TEXT,
  is_org_creator BOOLEAN,
  org_name TEXT,
  org_slug TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.role::TEXT,
    (o.owner_id = p_user_id) AS is_org_creator,
    o.name AS org_name,
    o.slug AS org_slug
  FROM public.organizations o
  LEFT JOIN public.memberships m ON m.organization_id = o.id 
    AND m.user_id = p_user_id 
    AND m.status = 'accepted'
  WHERE o.id = p_org_id;
END;
$$;

-- 2. Function to get leads with all related data in one optimized query
CREATE OR REPLACE FUNCTION get_leads_with_fields(
  p_org_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  lead_id UUID,
  template_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  field_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS lead_id,
    l.template_id,
    l.created_by,
    l.created_at,
    l.updated_at,
    l.status,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'value', lfv.value,
          'label', lf.label,
          'field_type', lf.field_type
        ) ORDER BY lf.sort_order
      ) FILTER (WHERE lfv.id IS NOT NULL),
      '[]'::jsonb
    ) AS field_data
  FROM public.leads l
  LEFT JOIN public.lead_field_values lfv ON lfv.lead_id = l.id
  LEFT JOIN public.lead_fields lf ON lf.id = lfv.field_id
  WHERE l.organization_id = p_org_id
    AND (p_status_filter IS NULL OR l.status = p_status_filter)
  GROUP BY l.id, l.template_id, l.created_by, l.created_at, l.updated_at, l.status
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. Function to update lead status with validation
CREATE OR REPLACE FUNCTION update_lead_status_fast(
  p_lead_id UUID,
  p_new_status TEXT,
  p_org_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_exists BOOLEAN;
  v_user_has_permission BOOLEAN;
BEGIN
  -- Check if lead exists and belongs to organization
  SELECT EXISTS(
    SELECT 1 FROM public.leads 
    WHERE id = p_lead_id AND organization_id = p_org_id
  ) INTO v_lead_exists;
  
  IF NOT v_lead_exists THEN
    RETURN QUERY SELECT FALSE, 'Lead not found or access denied';
    RETURN;
  END IF;
  
  -- Check if user has permission (member of organization)
  SELECT EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE user_id = p_user_id 
      AND organization_id = p_org_id 
      AND status = 'accepted'
  ) INTO v_user_has_permission;
  
  IF NOT v_user_has_permission THEN
    RETURN QUERY SELECT FALSE, 'Access denied';
    RETURN;
  END IF;
  
  -- Update the lead
  UPDATE public.leads 
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_lead_id;
  
  RETURN QUERY SELECT TRUE, 'Success'::TEXT;
END;
$$;

-- 4. Function to get templates with field counts
CREATE OR REPLACE FUNCTION get_templates_with_counts(
  p_org_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  organization_id UUID,
  is_default BOOLEAN,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  field_count BIGINT,
  lead_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lt.id,
    lt.name,
    lt.description,
    lt.organization_id,
    lt.is_default,
    lt.created_at,
    COALESCE(field_counts.field_count, 0) AS field_count,
    COALESCE(lead_counts.lead_count, 0) AS lead_count
  FROM public.lead_templates lt
  LEFT JOIN (
    SELECT template_id, COUNT(*) as field_count
    FROM public.lead_fields
    GROUP BY template_id
  ) field_counts ON field_counts.template_id = lt.id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as lead_count
    FROM public.leads
    GROUP BY template_id
  ) lead_counts ON lead_counts.template_id = lt.id
  WHERE lt.organization_id = p_org_id 
     OR lt.organization_id = '00000000-0000-0000-0000-000000000000'
  ORDER BY lt.is_default DESC, lt.created_at DESC;
END;
$$;

-- 5. Function for bulk operations
CREATE OR REPLACE FUNCTION bulk_delete_leads(
  p_lead_ids UUID[],
  p_org_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  deleted_count INTEGER,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_has_permission BOOLEAN;
  v_valid_leads UUID[];
  v_deleted_count INTEGER;
BEGIN
  -- Check if user has permission
  SELECT EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE user_id = p_user_id 
      AND organization_id = p_org_id 
      AND status = 'accepted'
  ) INTO v_user_has_permission;
  
  IF NOT v_user_has_permission THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied';
    RETURN;
  END IF;
  
  -- Get valid lead IDs that belong to the organization
  SELECT array_agg(id) INTO v_valid_leads
  FROM public.leads 
  WHERE id = ANY(p_lead_ids) 
    AND organization_id = p_org_id;
  
  IF v_valid_leads IS NULL OR array_length(v_valid_leads, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'No valid leads found';
    RETURN;
  END IF;
  
  -- Delete lead field values first
  DELETE FROM public.lead_field_values 
  WHERE lead_id = ANY(v_valid_leads);
  
  -- Delete lead activity
  DELETE FROM public.lead_activity 
  WHERE lead_id = ANY(v_valid_leads);
  
  -- Delete leads and get count
  DELETE FROM public.leads 
  WHERE id = ANY(v_valid_leads);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT TRUE, v_deleted_count, 'Success';
END;
$$;
