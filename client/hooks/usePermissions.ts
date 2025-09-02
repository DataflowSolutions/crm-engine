"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserPermissions } from '@/utils/permissions';

export function usePermissions(): UserPermissions | null {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const params = useParams();
  const orgId = params?.id as string;

  useEffect(() => {
    if (!orgId || orgId === 'new') return;

    async function fetchPermissions() {
      try {
        const response = await fetch(`/api/organizations/${orgId}/permissions`);
        if (response.ok) {
          const data = await response.json();
          setPermissions(data);
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      }
    }

    fetchPermissions();
  }, [orgId]);

  return permissions;
}
