"use client";

import { useState } from "react";
import { FileText, Plus, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, Users, Upload } from "lucide-react";
import Link from "next/link";
import TemplateCard from "./TemplateCard";

type Template = {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  is_default: boolean;
  created_at: string;
  lead_fields?: { id: string }[];
};

type SortField = 'name' | 'created_at' | 'field_count';
type SortDirection = 'asc' | 'desc';

type TemplatesListProps = {
  orgTemplates: Template[];
  universalTemplates: Template[];
  orgId: string;
  locale: string;
  orgName: string;
};

export default function TemplatesList({ 
  orgTemplates, 
  universalTemplates, 
  orgId, 
  locale, 
  orgName 
}: TemplatesListProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOrgTemplates = [...orgTemplates].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'field_count':
        aValue = a.lead_fields?.length || 0;
        bValue = b.lead_fields?.length || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/${locale}/organizations/${orgId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Templates</h1>
              <p className="text-gray-600">{orgName}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/${locale}/organizations/${orgId}/templates/import`}
                className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from Spreadsheet
              </Link>
              <Link
                href={`/${locale}/organizations/${orgId}/templates/new`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Link>
            </div>
          </div>
        </div>

        {/* Organization Templates */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Organization Templates</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{orgTemplates.length} template{orgTemplates.length !== 1 ? 's' : ''}</span>
              
              {/* Sort Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <button
                  onClick={() => handleSort('name')}
                  className={`inline-flex items-center px-2 py-1 text-xs rounded transition-colors ${
                    sortField === 'name' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Name {getSortIcon('name')}
                </button>
                <button
                  onClick={() => handleSort('created_at')}
                  className={`inline-flex items-center px-2 py-1 text-xs rounded transition-colors ${
                    sortField === 'created_at' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Date {getSortIcon('created_at')}
                </button>
                <button
                  onClick={() => handleSort('field_count')}
                  className={`inline-flex items-center px-2 py-1 text-xs rounded transition-colors ${
                    sortField === 'field_count' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Fields {getSortIcon('field_count')}
                </button>
              </div>
            </div>
          </div>
          
          {orgTemplates.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No custom templates yet</h3>
              <p className="text-gray-600 mb-4">Create your first template to define custom fields for your leads.</p>
              <Link
                href={`/${locale}/organizations/${orgId}/templates/new`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedOrgTemplates.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  orgId={orgId} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Universal Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Universal Templates</h2>
            <span className="text-sm text-gray-500">Available to all organizations</span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {universalTemplates.map((template) => (
              <div key={template.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Universal</span>
                  </div>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                
                {template.description && (
                  <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{template.lead_fields?.length || 0} fields</span>
                  <span>Global</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
