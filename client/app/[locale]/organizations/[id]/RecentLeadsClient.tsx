'use client';

import { useState } from 'react';
import Link from 'next/link';
import InteractiveStatusBadge from './InteractiveStatusBadge';
import { StatusType } from '@/app/types/status';
import { updateLeadStatus } from './actions';
import { getLeadDisplayName } from '@/utils/leadHelpers';

type Lead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  created_by_name: string;
  template_name: string;
  lead_field_values: Array<{
    value: string;
    lead_fields: {
      label: string;
      field_type: string;
    } | null;
  }>;
};

type Props = {
  leads: Lead[];
  orgId: string;
  locale: string;
  permissions: {
    canEditLeads: boolean;
  };
};

export default function RecentLeadsClient({ leads, orgId, locale, permissions }: Props) {
  const [updatingLeads, setUpdatingLeads] = useState<Set<string>>(new Set());
  const [localLeads, setLocalLeads] = useState(leads);

  const handleStatusUpdate = async (leadId: string, newStatus: StatusType) => {
    if (!permissions.canEditLeads) {
      return;
    }
    
    setUpdatingLeads(prev => new Set([...prev, leadId]));
    
    try {
      await updateLeadStatus(leadId, newStatus, orgId);
      
      // Update local state
      setLocalLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, status: newStatus }
            : lead
        )
      );
    } catch (error) {
      console.error('Failed to update lead status:', error);
    } finally {
      setUpdatingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  if (localLeads.length === 0) {
    return <p className="text-gray-500 text-sm">No recent leads</p>;
  }

  return (
    <div className="space-y-4">
      {localLeads.slice(0, 5).map((lead) => (
        <div key={lead.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-sm font-medium text-white">
                  {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <InteractiveStatusBadge 
                    status={lead.status as StatusType}
                    onStatusChange={(newStatus) => handleStatusUpdate(lead.id, newStatus)}
                    isUpdating={updatingLeads.has(lead.id)}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {getLeadDisplayName(lead)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Created by {lead.created_by_name || 'Unknown'} • {new Date(lead.created_at).toISOString().split('T')[0]}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/organizations/${orgId}/leads/${lead.id}`}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              View
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
