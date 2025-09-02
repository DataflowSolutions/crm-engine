"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { UserPermissions } from '@/utils/permissions';

// Cache permissions for 5 minutes
const permissionsCache = new Map<string, { data: UserPermissions; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function usePermissions(): UserPermissions | null {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const params = useParams();
  const orgId = params?.id as string;
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!orgId || orgId === 'new' || isFetchingRef.current) return;

    // Check cache first
    const cached = permissionsCache.get(orgId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setPermissions(cached.data);
      return;
    }

    async function fetchPermissions() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      
      try {
        const response = await fetch(`/api/organizations/${orgId}/permissions`);
        if (response.ok) {
          const data = await response.json();
          setPermissions(data);
          
          // Cache the result
          permissionsCache.set(orgId, {
            data,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        isFetchingRef.current = false;
      }
    }

    fetchPermissions();
  }, [orgId]);

  return permissions;
}
