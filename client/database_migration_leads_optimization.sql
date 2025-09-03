-- Database Migration: Lead Functions Optimization
-- Based on analysis of existing functions, this migration consolidates and optimizes lead-related functions

-- 1. DROP REDUNDANT FUNCTIONS
-- We have multiple search functions that overlap. Keep only the production-safe version.
DROP FUNCTION IF EXISTS public.search_leads(uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.search_leads_optimized(uuid, text, text, integer, integer);

-- 2. UPDATE get_leads_unified TO BE THE MAIN FUNCTION
-- This function already handles multiple use cases. Let's optimize it further.
CREATE OR REPLACE FUNCTION public.get_leads_unified_v2(
  p_org_id uuid, 
  p_user_id uuid, 
  p_action text DEFAULT 'paginated'::text, 
  p_search_term text DEFAULT NULL::text, 
  p_status_filter text DEFAULT NULL::text, 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0, 
  p_include_status_counts boolean DEFAULT false
)
RETURNS TABLE(
  leads_data jsonb, 
  total_count bigint, 
  status_counts jsonb, 
  has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_access boolean := false;
  v_leads_result jsonb := '[]'::jsonb;
  v_total_count bigint := 0;
  v_status_counts jsonb := '{}'::jsonb;
  v_where_clause text := '';
  v_query text;
BEGIN
  -- Check permissions once (optimized)
  SELECT EXISTS(
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_user_id 
      AND m.organization_id = p_org_id 
      AND m.accepted = true 
      AND m.status = 'accepted'
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RETURN QUERY SELECT '[]'::jsonb, 0::bigint, '{}'::jsonb, false;
    RETURN;
  END IF;
  
  -- Build optimized WHERE clause
  v_where_clause := 'WHERE l.organization_id = $1';
  
  IF p_status_filter IS NOT NULL AND p_status_filter != '' AND p_status_filter != 'all' THEN
    v_where_clause := v_where_clause || ' AND l.status = ''' || p_status_filter || '''';
  END IF;
  
  -- Handle search vs pagination
  IF p_search_term IS NOT NULL AND p_search_term != '' THEN
    -- Search mode: get all results, no pagination
    v_query := '
      WITH search_base AS (
        SELECT l.*, 
          CASE 
            WHEN l.status ILIKE ''%' || p_search_term || '%'' THEN 2.0
            WHEN EXISTS(SELECT 1 FROM public.lead_field_values lfv_s 
                       WHERE lfv_s.lead_id = l.id 
                         AND lfv_s.value ILIKE ''%' || p_search_term || '%'') THEN 1.0
            ELSE 0.0
          END as relevance
        FROM public.leads l
        ' || v_where_clause || '
          AND (l.status ILIKE ''%' || p_search_term || '%''
               OR EXISTS(SELECT 1 FROM public.lead_field_values lfv_search
                        WHERE lfv_search.lead_id = l.id 
                          AND lfv_search.value ILIKE ''%' || p_search_term || '%''))
      )
      SELECT jsonb_agg(
        jsonb_build_object(
          ''lead_id'', sb.id,
          ''template_id'', sb.template_id,
          ''created_by'', sb.created_by,
          ''created_at'', sb.created_at,
          ''updated_at'', sb.updated_at,
          ''status'', sb.status,
          ''field_data'', COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ''value'', lfv.value,
                ''label'', lf.label,
                ''field_type'', lf.field_type
              ) ORDER BY lf.sort_order
            ) FILTER (WHERE lfv.id IS NOT NULL),
            ''[]''::jsonb
          ),
          ''relevance_score'', sb.relevance
        ) ORDER BY sb.relevance DESC, sb.created_at DESC
      )
      FROM search_base sb
      LEFT JOIN public.lead_field_values lfv ON lfv.lead_id = sb.id
      LEFT JOIN public.lead_fields lf ON lf.id = lfv.field_id
      GROUP BY sb.id, sb.template_id, sb.created_by, sb.created_at, sb.updated_at, sb.status, sb.relevance';
  ELSE
    -- Pagination mode: efficient pagination with limits
    v_query := '
      SELECT jsonb_agg(
        jsonb_build_object(
          ''lead_id'', l.id,
          ''template_id'', l.template_id,
          ''created_by'', l.created_by,
          ''created_at'', l.created_at,
          ''updated_at'', l.updated_at,
          ''status'', l.status,
          ''field_data'', COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ''value'', lfv.value,
                ''label'', lf.label,
                ''field_type'', lf.field_type
              ) ORDER BY lf.sort_order
            ) FILTER (WHERE lfv.id IS NOT NULL),
            ''[]''::jsonb
          )
        ) ORDER BY l.created_at DESC
        LIMIT ' || p_limit || ' OFFSET ' || p_offset || '
      )
      FROM public.leads l
      LEFT JOIN public.lead_field_values lfv ON lfv.lead_id = l.id
      LEFT JOIN public.lead_fields lf ON lf.id = lfv.field_id
      ' || v_where_clause || '
      GROUP BY l.id, l.template_id, l.created_by, l.created_at, l.updated_at, l.status';
  END IF;
  
  -- Execute query
  EXECUTE v_query USING p_org_id INTO v_leads_result;
  
  -- Get total count for pagination info
  EXECUTE 'SELECT COUNT(*) FROM public.leads l ' || v_where_clause 
  USING p_org_id INTO v_total_count;
  
  -- Get status counts if requested
  IF p_include_status_counts THEN
    SELECT jsonb_object_agg(status, count)
    INTO v_status_counts
    FROM (
      SELECT status, COUNT(*) as count
      FROM public.leads 
      WHERE organization_id = p_org_id
      GROUP BY status
    ) status_counts;
  END IF;
  
  RETURN QUERY SELECT 
    COALESCE(v_leads_result, '[]'::jsonb),
    v_total_count,
    COALESCE(v_status_counts, '{}'::jsonb),
    true;
END;
$$;

-- 3. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_leads_org_status_created ON public.leads(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_field_values_search ON public.lead_field_values USING gin(to_tsvector('english', value));
CREATE INDEX IF NOT EXISTS idx_memberships_user_org_status ON public.memberships(user_id, organization_id, status) WHERE accepted = true;

-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_leads_unified_v2 TO authenticated;

-- 5. OPTIONAL: Drop old unified function after testing
-- DROP FUNCTION IF EXISTS public.get_leads_unified(uuid, uuid, text, text, text, integer, integer, boolean);

-- 6. COMMENT FOR DOCUMENTATION
COMMENT ON FUNCTION public.get_leads_unified_v2 IS 'Unified function for lead operations: pagination, search, dashboard. Optimized for performance with proper indexing.';
