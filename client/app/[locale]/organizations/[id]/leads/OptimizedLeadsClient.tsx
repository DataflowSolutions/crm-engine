'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft, Upload, Trash2, FileText, Search, Filter, X } from 'lucide-react';
import InteractiveStatusBadge from '../InteractiveStatusBadge';
import { StatusType } from "@/app/types/status";
import { getLeadDisplayName, getLeadFieldValue } from "@/utils/leadHelpers";
import { UserPermissions } from "@/utils/permissions";
import { useTranslations } from 'next-intl';
import { updateLeadStatus } from '../actions';

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
  permissions: UserPermissions;
  initialPage?: number;
  totalCount?: number;
  initialSearch?: string;
  initialStatus?: string;
  isSearch?: boolean;
}

export default function OptimizedLeadsClient({ 
  leads: initialLeads, 
  orgId, 
  orgName, 
  locale, 
  permissions,
  initialPage = 1,
  totalCount = 0,
  initialSearch = '',
  initialStatus = '',
  isSearch = false
}: Props) {
  const t = useTranslations('Orgs.leads');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingLeads, setUpdatingLeads] = useState<Set<string>>(new Set());
  
  // Local search state (separate from URL state)
  const [localSearchTerm, setLocalSearchTerm] = useState(initialSearch);
  const [isSearching, setIsSearching] = useState(false);
  
  // Update leads when initialLeads prop changes (for pagination/filtering)
  useEffect(() => {
    setLeads(initialLeads);
    setSelectedLeads(new Set()); // Clear selection when data changes
    setIsSearching(false); // Reset searching state when new data comes in
  }, [initialLeads]);
  
  // Update local search term when URL search changes
  useEffect(() => {
    setLocalSearchTerm(initialSearch);
  }, [initialSearch]);
  
  // Use URL state for filters and pagination
  const currentPage = initialPage;
  const searchTerm = initialSearch;
  const statusFilter = initialStatus || 'all';
  
  // Helper function to update URL parameters
  const updateURL = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    
    // Always reset to page 1 when changing filters
    if ('search' in updates || 'status' in updates) {
      newParams.delete('page');
    }
    
    const newUrl = `/${locale}/organizations/${orgId}/leads${newParams.toString() ? `?${newParams.toString()}` : ''}`;
    
    startTransition(() => {
      router.push(newUrl);
    });
  };
  
  // Helper function for pagination
  // Manual search handler with loading state
  const handleSearchSubmit = () => {
    if (localSearchTerm.trim() === searchTerm) {
      return; // No change, don't search again
    }
    
    setIsSearching(true);
    updateURL({ search: localSearchTerm.trim() });
  };
  
  // Clear search handler
  const handleClearSearch = () => {
    setLocalSearchTerm('');
    if (searchTerm) {
      setIsSearching(true);
      updateURL({ search: '' });
    }
  };
  
  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };
  
  // Status filter handler
  const handleStatusChange = (value: string) => {
    updateURL({ status: value });
  };
  
  // Pagination handler
  const goToPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (page > 1) {
      newParams.set('page', page.toString());
    } else {
      newParams.delete('page');
    }
    
    const newUrl = `/${locale}/organizations/${orgId}/leads${newParams.toString() ? `?${newParams.toString()}` : ''}`;
    
    startTransition(() => {
      router.push(newUrl);
    });
  };

  // Handle status update
  const handleStatusUpdate = async (leadId: string, newStatus: StatusType) => {
    if (!permissions.canEditLeads) {
      return;
    }
    
    setUpdatingLeads(prev => new Set([...prev, leadId]));
    
    try {
      await updateLeadStatus(leadId, newStatus, orgId);
      
      // Update local state
      setLeads(prevLeads => {
        const updatedLeads = prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
            : lead
        );
        return updatedLeads;
      });
    } catch (error) {
      console.error('Failed to update lead status:', error);
      setError('Failed to update lead status');
    } finally {
      setUpdatingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  // For server-side pagination, we use the leads as-is since they're already filtered
  const filteredLeads = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    // Server already filtered based on search and status, so return as-is
    return leads;
  }, [leads]);
  
  // Calculate server-side pagination info
  const itemsPerPage = 10; // Should match server limit
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  
  // For search results, show all results; for pagination, show current page
  const currentLeads = filteredLeads;

  const handleSelectAll = () => {
    if (selectedLeads.size === currentLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(currentLeads.map(lead => lead.id)));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/organizations/${orgId}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-all duration-200 cursor-pointer hover:translate-x-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">{t('cards.all')}</h1>
              <p className="text-gray-600 font-medium">{orgName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedLeads.size > 0 && permissions.canDeleteLeads && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">{t('delete')}...</span>
                    <span className="sm:hidden">{t('delete')}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{`${t('delete')} ${selectedLeads.size}`}</span>
                    <span className="sm:hidden">{`${t('delete')} (${selectedLeads.size})`}</span>
                  </>
                )}
              </button>
            )}
            {permissions.canImportLeads && (
              <Link 
                href={`/${locale}/organizations/${orgId}/templates/import`}
                className="inline-flex items-center px-4 py-2.5 border-2 border-purple-500 text-purple-600 font-medium rounded-xl hover:bg-purple-50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('import')}</span>
                <span className="sm:hidden">{t('import')}</span>
              </Link>
            )}
            {permissions.canCreateLeads && (
              <Link 
                href={`/${locale}/organizations/${orgId}/leads/new`}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('create')}</span>
                <span className="sm:hidden">{t('create')}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input with Button */}
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {localSearchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Search Button */}
              <button
                onClick={handleSearchSubmit}
                disabled={isSearching || localSearchTerm.trim() === searchTerm}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span className="text-sm">Search</span>
                  </>
                )}
              </button>
              
              {/* Clear Results Button (shown when there's an active search) */}
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm">Clear</span>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  handleStatusChange(e.target.value);
                }}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white cursor-pointer"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="draft">{t('badges.draft')}</option>
                <option value="approved">{t('badges.approved')}</option>
                <option value="scheduled">{t('badges.scheduled')}</option>
                <option value="should_call">{t('badges.should_call')}</option>
                <option value="closed">{t('badges.closed')}</option>
              </select>
            </div>
          </div>

          {/* Filter Results Summary */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>
              Showing {isSearch ? filteredLeads.length : `${startIndex + 1}-${endIndex}`} of {totalCount} leads
            </span>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setLocalSearchTerm('');
                  updateURL({ search: '', status: '' });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Leads List */}
        {!leads || leads.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No leads yet</h3>
              <p className="text-gray-600 mb-8 text-lg">
                Create your first lead to start managing your prospects, or import leads from a spreadsheet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {permissions.canImportLeads && (
                  <Link 
                    href={`/${locale}/organizations/${orgId}/templates/import`}
                    className="inline-flex items-center px-6 py-3 border-2 border-purple-500 text-purple-600 font-medium rounded-xl hover:bg-purple-50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Upload className="w-5 h-5 mr-3" />
                    {t('import')}
                  </Link>
                )}
                {permissions.canCreateLeads && (
                  <Link 
                    href={`/${locale}/organizations/${orgId}/leads/new`}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    {t('create')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No leads found</h3>
              <p className="text-gray-600 mb-8 text-lg">
                No leads match your current search and filter criteria. Try adjusting your filters.
              </p>
              <button
                onClick={() => {
                  updateURL({ search: '', status: '' });
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <X className="w-5 h-5 mr-3" />
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200/50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50">
              <h3 className="text-xl font-bold text-gray-900">
                {filteredLeads.length} {filteredLeads.length === 1 ? 'Lead' : 'Leads'}
                {filteredLeads.length !== leads.length && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (filtered from {leads.length} total)
                  </span>
                )}
                {selectedLeads.size > 0 && (
                  <span className="text-sm text-blue-600 ml-2 font-medium">
                    ({selectedLeads.size} selected)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  Manage your prospects
                </div>
                {filteredLeads.length > 0 && permissions.canDeleteLeads && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-150 cursor-pointer font-medium"
                  >
                    {selectedLeads.size === currentLeads.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full relative">
                <thead className="bg-gray-50/50">
                  <tr>
                    {permissions.canDeleteLeads && (
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLeads.size === currentLeads.length && currentLeads.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentLeads.map((lead, index) => {
                    const isSelected = selectedLeads.has(lead.id);
                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-gray-50/50 transition-all duration-200 ${isSelected ? 'bg-blue-50/50' : ''}`}
                        style={{ 
                          animationName: 'fadeInUp',
                          animationDuration: '0.4s',
                          animationTimingFunction: 'ease-out',
                          animationFillMode: 'forwards',
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        {permissions.canDeleteLeads && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectLead(lead.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-colors duration-200"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-sm">
                              <span className="text-sm font-medium text-white">
                                {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {getLeadDisplayName(lead)}
                              </div>
                              {getLeadFieldValue(lead, 'email') && (
                                <div className="text-sm text-gray-500">
                                  {getLeadFieldValue(lead, 'email')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center lg:justify-start relative overflow-visible">
                            <InteractiveStatusBadge 
                              status={lead.status as StatusType}
                              onStatusChange={(newStatus) => handleStatusUpdate(lead.id, newStatus)}
                              isUpdating={updatingLeads.has(lead.id)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            {new Date(lead.created_at).toISOString().split('T')[0]}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link 
                            href={`/${locale}/organizations/${orgId}/leads/${lead.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-600 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group border border-blue-200/50"
                          >
                            <span>View</span>
                            <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} leads
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}