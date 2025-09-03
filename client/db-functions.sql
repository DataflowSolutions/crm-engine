-- ============================================================================
-- V2 LEADS FUNCTIONS (non-destructive) — keeps legacy funcs, adds improved APIs
-- Author: Dataflow Solutions
-- Notes:
--  - SECURITY DEFINER kept (same as legacy). Ensure the owner role has least privilege.
--  - All v2 functions live in schema public and do NOT drop/alter legacy functions.
--  - v2 focuses on: parameterized filters (no SQL injection), paginate-then-aggregate,
--    consistent JSON envelopes, and fewer overlapping entry points.
-- ============================================================================

-- ============================================================================
-- 1) get_leads_unified_v2
--    One API for list + search + counts. Real pagination with total_count.
--    Filters: status, template, creator, date range. Sort: created_at/relevance.
--    Modes: 'paginated' | 'search'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_leads_unified_v2(
  p_org_id uuid,
  p_user_id uuid,
  p_action text DEFAULT 'paginated',
  p_search_term text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_template_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to   timestamptz DEFAULT NULL,
  p_sort text DEFAULT 'created_at_desc',             -- created_at_desc|created_at_asc|relevance_desc
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
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
AS $function$
DECLARE
  v_has_access boolean := false;
  v_search_pattern text := NULL;
BEGIN
  -- access check
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships m
    WHERE m.user_id = p_user_id
      AND m.organization_id = p_org_id
      AND m.status = 'accepted'
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT '[]'::jsonb, 0::bigint, '{}'::jsonb, false;
    RETURN;
  END IF;

  IF p_search_term IS NOT NULL AND p_search_term <> '' THEN
    v_search_pattern := '%' || lower(p_search_term) || '%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      l.id,
      l.template_id,
      l.created_by,
      l.created_at,
      l.updated_at,
      l.status
    FROM public.leads l
    WHERE l.organization_id = p_org_id
      AND (p_status_filter IS NULL OR l.status = p_status_filter)
      AND (p_template_id  IS NULL OR l.template_id = p_template_id)
      AND (p_created_by   IS NULL OR l.created_by  = p_created_by)
      AND (p_date_from    IS NULL OR l.created_at >= p_date_from)
      AND (p_date_to      IS NULL OR l.created_at <  p_date_to)
      AND (
        p_action <> 'search'
        OR v_search_pattern IS NULL
        OR lower(l.status) LIKE v_search_pattern
        OR EXISTS (
          SELECT 1 FROM public.lead_field_values lfv
          WHERE lfv.lead_id = l.id
            AND lower(lfv.value) LIKE v_search_pattern
        )
      )
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total_count FROM base
  ),
  scored AS (
    SELECT
      b.*,
      CASE
        WHEN p_action = 'search' AND v_search_pattern IS NOT NULL THEN
          (
            (CASE WHEN lower(b.status) LIKE v_search_pattern THEN 0.5 ELSE 0.0 END)
            +
            (CASE WHEN EXISTS (
               SELECT 1 FROM public.lead_field_values lfv2
               WHERE lfv2.lead_id = b.id AND lower(lfv2.value) LIKE v_search_pattern
             ) THEN 1.0 ELSE 0.0 END)
          )
        ELSE 0.0
      END AS relevance
    FROM base b
  ),
  ordered AS (
    SELECT *
    FROM scored
    ORDER BY
      CASE WHEN p_sort = 'relevance_desc' THEN relevance END DESC,
      CASE WHEN p_sort = 'created_at_asc'  THEN created_at END ASC,
      CASE WHEN p_sort = 'created_at_desc' THEN created_at END DESC,
      id -- tie-break
    LIMIT p_limit OFFSET p_offset
  ),
  agg AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'lead_id',       o.id,
          'template_id',   o.template_id,
          'created_by',    o.created_by,
          'created_at',    o.created_at,
          'updated_at',    o.updated_at,
          'status',        o.status,
          'relevance',     o.relevance,
          'field_data',    COALESCE(fd.fields, '[]'::jsonb)
        )
        ORDER BY
          CASE WHEN p_sort = 'relevance_desc' THEN o.relevance END DESC,
          CASE WHEN p_sort = 'created_at_asc'  THEN o.created_at END ASC,
          CASE WHEN p_sort = 'created_at_desc' THEN o.created_at END DESC,
          o.id
      ) AS data
    FROM ordered o
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'value', lfv.value,
                 'label', lf.label,
                 'field_type', lf.field_type
               )
               ORDER BY lf.sort_order
             ) AS fields
      FROM public.lead_field_values lfv
      LEFT JOIN public.lead_fields lf ON lf.id = lfv.field_id
      WHERE lfv.lead_id = o.id
    ) fd ON TRUE
  ),
  status_map AS (
    SELECT
      CASE WHEN p_include_status_counts THEN
        (SELECT jsonb_object_agg(status, cnt)
         FROM (
           SELECT l.status, COUNT(*)::bigint AS cnt
           FROM public.leads l
           WHERE l.organization_id = p_org_id
           GROUP BY l.status
         ) s
        )
      ELSE '{}'::jsonb
      END AS status_counts
  )
  SELECT
    COALESCE(agg.data, '[]'::jsonb)                 AS leads_data,
    (SELECT total_count FROM counted)               AS total_count,
    (SELECT status_counts FROM status_map)          AS status_counts,
    true                                            AS has_access;
END;
$function$;


-- ============================================================================
-- 2) get_lead_with_details_v2
--    Single lead fetch with template name, creator name, field map + template fields
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_lead_with_details_v2(
  p_lead_id uuid,
  p_org_id  uuid,
  p_user_id uuid
)
RETURNS TABLE(
  lead_id uuid,
  template_id uuid,
  template_name text,
  created_by uuid,
  creator_name text,
  created_at timestamp without time zone,
  updated_at timestamp with time zone,
  status text,
  field_values jsonb,
  template_fields jsonb,
  has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_has_access boolean := false;
BEGIN
  -- access
  SELECT EXISTS(
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_user_id
      AND m.organization_id = p_org_id
      AND m.status = 'accepted'
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::uuid, NULL::text, NULL::uuid, NULL::text,
      NULL::timestamp without time zone, NULL::timestamp with time zone,
      NULL::text, '{}'::jsonb, '[]'::jsonb, false;
    RETURN;
  END IF;

  RETURN QUERY
  WITH lead_core AS (
    SELECT
      l.id, l.template_id, l.created_by, l.created_at, l.updated_at, l.status,
      u.full_name AS creator_name
    FROM public.leads l
    LEFT JOIN public.users u ON u.id = l.created_by
    WHERE l.id = p_lead_id
      AND l.organization_id = p_org_id
  ),
  tmpl AS (
    SELECT lt.id, lt.name
    FROM public.lead_templates lt
    JOIN lead_core lc ON lc.template_id = lt.id
  ),
  field_map AS (
    SELECT jsonb_object_agg(lfv.field_id, lfv.value) AS fv
    FROM public.lead_field_values lfv
    WHERE lfv.lead_id = p_lead_id
  ),
  tmpl_fields AS (
    SELECT jsonb_agg(
             jsonb_build_object(
               'id', lf.id,
               'field_key', lf.field_key,
               'label', lf.label,
               'field_type', lf.field_type,
               'is_required', lf.is_required,
               'sort_order', lf.sort_order
             )
             ORDER BY lf.sort_order
           ) AS fields
    FROM public.lead_fields lf
    JOIN lead_core lc ON lc.template_id = lf.template_id
  )
  SELECT
    lc.id,
    lc.template_id,
    t.name,
    lc.created_by,
    lc.creator_name,
    lc.created_at,
    lc.updated_at,
    lc.status,
    COALESCE(field_map.fv, '{}'::jsonb),
    COALESCE(tmpl_fields.fields, '[]'::jsonb),
    true
  FROM lead_core lc
  LEFT JOIN tmpl t ON true
  LEFT JOIN field_map ON true
  LEFT JOIN tmpl_fields ON true;

END;
$function$;


-- ============================================================================
-- 3) update_lead_status_fast_v2
--    Minimal focused write with access guard
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_lead_status_fast_v2(
  p_lead_id uuid,
  p_new_status text,
  p_org_id uuid,
  p_user_id uuid
)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_lead_exists BOOLEAN;
  v_user_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.leads
    WHERE id = p_lead_id AND organization_id = p_org_id
  ) INTO v_lead_exists;

  IF NOT v_lead_exists THEN
    RETURN QUERY SELECT FALSE, 'Lead not found or access denied';
    RETURN;
  END IF;

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

  UPDATE public.leads
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN QUERY SELECT TRUE, 'Success'::text;
END;
$function$;


-- ============================================================================
-- 4) upsert_lead_field_values_v2
--    Bulk upsert of field values with membership & template guard
--    Expects p_field_values as {"<field_uuid>":"value", ...}
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_lead_field_values_v2(
  p_lead_id uuid,
  p_org_id uuid,
  p_user_id uuid,
  p_field_values jsonb
)
RETURNS TABLE(success boolean, error_message text, updated_fields integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_has_access BOOLEAN;
  v_updated_count INTEGER := 0;
  r RECORD;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.leads l
    JOIN public.memberships m ON m.organization_id = l.organization_id
    WHERE l.id = p_lead_id
      AND l.organization_id = p_org_id
      AND m.user_id = p_user_id
      AND m.status = 'accepted'
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT FALSE, 'Access denied'::text, 0;
    RETURN;
  END IF;

  -- iterate JSON map
  FOR r IN
    SELECT key   AS field_id_text,
           value AS field_value_text
    FROM jsonb_each_text(p_field_values)
  LOOP
    -- ensure field belongs to the lead's template
    IF EXISTS (
      SELECT 1
      FROM public.lead_fields lf
      JOIN public.leads l ON l.template_id = lf.template_id
      WHERE l.id = p_lead_id
        AND lf.id::text = r.field_id_text
    ) THEN
      INSERT INTO public.lead_field_values (lead_id, field_id, value)
      VALUES (p_lead_id, r.field_id_text::uuid, r.field_value_text)
      ON CONFLICT (lead_id, field_id)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  UPDATE public.leads
  SET updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN QUERY SELECT TRUE, 'Success'::text, v_updated_count;
END;
$function$;


-- ============================================================================
-- 5) get_new_lead_page_data_v2
--    Preloads org, user permissions, available templates (+fields), and selected template
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_new_lead_page_data_v2(
  p_org_id uuid,
  p_user_id uuid,
  p_selected_template_id uuid DEFAULT NULL
)
RETURNS TABLE(
  org_id uuid,
  org_name text,
  user_permissions jsonb,
  available_templates jsonb,
  selected_template jsonb,
  has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_has_access boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_user_id
      AND m.organization_id = p_org_id
      AND m.status = 'accepted'
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::jsonb, NULL::jsonb, NULL::jsonb, false;
    RETURN;
  END IF;

  RETURN QUERY
  WITH org_core AS (
    SELECT o.id, o.name, o.owner_id
    FROM public.organizations o
    WHERE o.id = p_org_id
  ),
  perms AS (
    SELECT jsonb_build_object(
             'role', COALESCE(m.role, 'viewer'),
             'is_org_creator', (SELECT owner_id FROM org_core) = p_user_id,
             'can_create_leads', ((SELECT owner_id FROM org_core) = p_user_id OR m.role IN ('admin','member'))
           ) AS jp
    FROM public.memberships m
    WHERE m.user_id = p_user_id
      AND m.organization_id = p_org_id
      AND m.status = 'accepted'
    LIMIT 1
  ),
  templ_with_fields AS (
    SELECT jsonb_agg(
             jsonb_build_object(
               'id', lt.id,
               'name', lt.name,
               'organization_id', lt.organization_id,
               'is_default', lt.is_default,
               'is_universal', (lt.organization_id = '00000000-0000-0000-0000-000000000000'::uuid),
               'fields', (
                 SELECT jsonb_agg(
                          jsonb_build_object(
                            'id', lf.id,
                            'label', lf.label,
                            'field_key', lf.field_key,
                            'field_type', lf.field_type,
                            'is_required', lf.is_required,
                            'sort_order', lf.sort_order
                          )
                          ORDER BY lf.sort_order
                        )
                 FROM public.lead_fields lf
                 WHERE lf.template_id = lt.id
               )
             )
             ORDER BY
               lt.is_default DESC,
               CASE WHEN lt.organization_id = p_org_id THEN 0 ELSE 1 END,
               lt.created_at DESC
           ) AS arr
    FROM public.lead_templates lt
    WHERE lt.organization_id = p_org_id
       OR lt.organization_id = '00000000-0000-0000-0000-000000000000'::uuid
  ),
  chosen AS (
    -- explicit chosen template
    SELECT jsonb_build_object(
             'id', lt.id,
             'name', lt.name,
             'organization_id', lt.organization_id,
             'is_default', lt.is_default,
             'fields', (
               SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', lf.id,
                          'label', lf.label,
                          'field_key', lf.field_key,
                          'field_type', lf.field_type,
                          'is_required', lf.is_required,
                          'sort_order', lf.sort_order
                        )
                        ORDER BY lf.sort_order
                      )
               FROM public.lead_fields lf
               WHERE lf.template_id = lt.id
             )
           ) AS jt
    FROM public.lead_templates lt
    WHERE p_selected_template_id IS NOT NULL
      AND lt.id = p_selected_template_id
      AND (lt.organization_id = p_org_id OR lt.organization_id = '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1
  ),
  fallback AS (
    -- fallback priority: org default -> universal default -> any org -> any universal
    SELECT jsonb_build_object(
             'id', lt.id,
             'name', lt.name,
             'organization_id', lt.organization_id,
             'is_default', lt.is_default,
             'fields', (
               SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', lf.id,
                          'label', lf.label,
                          'field_key', lf.field_key,
                          'field_type', lf.field_type,
                          'is_required', lf.is_required,
                          'sort_order', lf.sort_order
                        )
                        ORDER BY lf.sort_order
                      )
               FROM public.lead_fields lf
               WHERE lf.template_id = lt.id
             )
           ) AS jt
    FROM public.lead_templates lt
    WHERE lt.organization_id = p_org_id
       OR lt.organization_id = '00000000-0000-0000-0000-000000000000'::uuid
    ORDER BY
      CASE
        WHEN lt.organization_id = p_org_id AND lt.is_default THEN 1
        WHEN lt.organization_id = '00000000-0000-0000-0000-000000000000'::uuid AND lt.is_default THEN 2
        WHEN lt.organization_id = p_org_id THEN 3
        ELSE 4
      END,
      lt.created_at DESC
    LIMIT 1
  )
  SELECT
    (SELECT id   FROM org_core),
    (SELECT name FROM org_core),
    COALESCE((SELECT jp FROM perms), '{}'::jsonb),
    COALESCE((SELECT arr FROM templ_with_fields), '[]'::jsonb),
    COALESCE((SELECT jt  FROM chosen), (SELECT jt FROM fallback), '{}'::jsonb),
    true;
END;
$function$;

-- ============================================================================
-- END V2
-- ============================================================================

