'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft, Upload, Trash2 } from 'lucide-react';
import InteractiveStatusBadge from '../InteractiveStatusBadge';
import { StatusType } from "@/app/types/status";
import { getLeadDisplayName, getLeadFieldValue } from "@/utils/leadHelpers";

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

interface Props {
  leads: RawLead[];
  orgId: string;
  orgName: string;
  locale: string;
}

export default function LeadsClient({ leads: initialLeads, orgId, orgName, locale }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    }
  };

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedLeads.size} lead(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${orgId}/leads/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete leads');
      }

      // Remove deleted leads from state
      setLeads(prev => prev.filter(lead => !selectedLeads.has(lead.id)));
      setSelectedLeads(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete leads');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/organizations/${orgId}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
              <p className="text-gray-600">{orgName}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {selectedLeads.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : `Delete ${selectedLeads.size}`}
              </button>
            )}
            <Link 
              href={`/${locale}/organizations/${orgId}/templates/import`}
              className="inline-flex items-center px-4 py-2 border border-purple-600 text-purple-600 font-medium rounded-md hover:bg-purple-50 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Leads
            </Link>
            <Link 
              href={`/${locale}/organizations/${orgId}/leads/new`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Lead
            </Link>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Leads List */}
        {!leads || leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first lead to start managing your prospects, or import leads from a spreadsheet.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  href={`/${locale}/organizations/${orgId}/templates/import`}
                  className="inline-flex items-center px-4 py-2 border border-purple-600 text-purple-600 font-medium rounded-md hover:bg-purple-50 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import from Spreadsheet
                </Link>
                <Link 
                  href={`/${locale}/organizations/${orgId}/leads/new`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lead
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
                {selectedLeads.size > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({selectedLeads.size} selected)
                  </span>
                )}
              </h3>
              {leads.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedLeads.size === leads.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === leads.length && leads.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => {
                    const isSelected = selectedLeads.has(lead.id);
                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectLead(lead.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getLeadDisplayName(lead)}
                            </div>
                            {getLeadFieldValue(lead, 'email') && (
                              <div className="text-sm text-gray-500">
                                {getLeadFieldValue(lead, 'email')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 relative">
                          <InteractiveStatusBadge 
                            leadId={lead.id} 
                            currentStatus={lead.status as StatusType} 
                            orgId={orgId}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link 
                            href={`/${locale}/organizations/${orgId}/leads/${lead.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
