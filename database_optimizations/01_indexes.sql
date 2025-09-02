-- Performance Optimization: Database Indexes
-- Run this in your Supabase SQL editor

-- 1. Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_user_org_status 
ON public.memberships (user_id, organization_id, status) 
WHERE status = 'accepted';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_created 
ON public.leads (organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_status 
ON public.leads (organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_field_values_lead 
ON public.lead_field_values (lead_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_fields_template 
ON public.lead_fields (template_id, sort_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_templates_org 
ON public.lead_templates (organization_id, is_default);

-- 2. Covering indexes for frequently accessed data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_with_template 
ON public.leads (organization_id, template_id, status, created_at DESC);

-- 3. Index for lead field value lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_field_values_field_value 
ON public.lead_field_values (field_id, value);

-- 4. Index for activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activity_lead_created 
ON public.lead_activity (lead_id, created_at DESC);
