'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, User, Mail, Phone, Building, FileText, Edit3, Save, X, Plus } from "lucide-react";
import Link from "next/link";
import { StatusType } from "@/app/types/status";
import { getLeadDisplayName } from "@/utils/leadHelpers";
import LeadStatusBadge from "../LeadStatusBadge";
import { updateLeadFieldValue, addMissingTemplateFields } from './actions';

type LeadField = {
  id: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
  value?: string;
};

type TemplateField = {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
};

type Lead = {
  id: string;
  template_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values: Array<{
    value: string;
    lead_fields: Array<{
      id: string;
      label: string;
      field_type: string;
      is_required: boolean;
      sort_order: number;
    }>;
  }>;
};

type Template = {
  id: string;
  name: string;
  description?: string;
  lead_fields: TemplateField[];
} | null;

type Props = {
  lead: Lead;
  template: Template;
  fieldsByType: Record<string, LeadField[]>;
  missingFields: TemplateField[];
  orgId: string;
  locale: string;
};

export default function LeadDetailClient({ 
  lead, 
  template, 
  fieldsByType, 
  missingFields, 
  orgId, 
  locale 
}: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddMissing, setShowAddMissing] = useState(false);
  const [newFieldValues, setNewFieldValues] = useState<Record<string, string>>({});

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType.toLowerCase()) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'company': return Building;
      case 'text':
      case 'textarea': return FileText;
      default: return User;
    }
  };

  const handleStartEdit = (fieldId: string, currentValue: string) => {
    setEditingField(fieldId);
    setEditingValue(currentValue || '');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleSaveEdit = async (fieldId: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateLeadFieldValue(lead.id, orgId, fieldId, editingValue);
      setEditingField(null);
      setEditingValue('');
      // The page will refresh due to revalidatePath in the action
    } catch (error) {
      console.error('Error updating field:', error);
      alert('Failed to update field. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMissingFields = async () => {
    if (isUpdating) return;
    
    const filledFields = Object.fromEntries(
      Object.entries(newFieldValues).filter(([, value]) => value.trim() !== '')
    );
    
    if (Object.keys(filledFields).length === 0) {
      alert('Please fill in at least one field.');
      return;
    }

    setIsUpdating(true);
    try {
      await addMissingTemplateFields(lead.id, orgId, locale, filledFields);
      setShowAddMissing(false);
      setNewFieldValues({});
      // The page will refresh due to revalidatePath in the action
    } catch (error) {
      console.error('Error adding fields:', error);
      alert('Failed to add fields. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderFieldValue = (field: LeadField) => {
    if (editingField === field.id) {
      return (
        <div className="flex items-center gap-2">
          {field.field_type === 'textarea' ? (
            <textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              disabled={isUpdating}
            />
          ) : (
            <input
              type={field.field_type === 'text' ? 'text' : field.field_type}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isUpdating}
            />
          )}
          <button
            onClick={() => handleSaveEdit(field.id)}
            disabled={isUpdating}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={isUpdating}
            className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <div className="flex-1 bg-gray-50 rounded-md p-3">
          {field.value ? (
            <p className="text-gray-900 break-words">
              {field.field_type === 'email' && field.value ? (
                <a 
                  href={`mailto:${field.value}`} 
                  className="text-blue-600 hover:text-blue-900"
                >
                  {field.value}
                </a>
              ) : field.field_type === 'phone' && field.value ? (
                <a 
                  href={`tel:${field.value}`} 
                  className="text-blue-600 hover:text-blue-900"
                >
                  {field.value}
                </a>
              ) : (
                field.value
              )}
            </p>
          ) : (
            <p className="text-gray-500 italic">No value provided</p>
          )}
        </div>
        <button
          onClick={() => handleStartEdit(field.id, field.value || '')}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/organizations/${orgId}/leads`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getLeadDisplayName(lead)}
              </h1>
              <p className="text-gray-600">{template?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LeadStatusBadge 
              leadId={lead.id}
              orgId={orgId}
              status={lead.status as StatusType}
            />
          </div>
        </div>

        {/* Lead Information Cards */}
        <div className="space-y-6">
          {/* Template Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Template</label>
                <p className="text-gray-900">{template?.name}</p>
              </div>
              {template?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{template.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Missing Fields Section */}
          {missingFields.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Missing Template Fields</h2>
                  <p className="text-sm text-gray-500">Add values for fields that are missing from this lead</p>
                </div>
                <button
                  onClick={() => setShowAddMissing(!showAddMissing)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Missing Fields
                </button>
              </div>
              
              {showAddMissing && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">Add Missing Field Values</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {missingFields.map((field) => {
                      const Icon = getFieldIcon(field.field_type);
                      return (
                        <div key={field.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-500" />
                            <label className="text-sm font-medium text-gray-700">
                              {field.label}
                              {field.is_required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                          </div>
                          {field.field_type === 'textarea' ? (
                            <textarea
                              value={newFieldValues[field.id] || ''}
                              onChange={(e) => setNewFieldValues(prev => ({
                                ...prev,
                                [field.id]: e.target.value
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          ) : (
                            <input
                              type={field.field_type === 'text' ? 'text' : field.field_type}
                              value={newFieldValues[field.id] || ''}
                              onChange={(e) => setNewFieldValues(prev => ({
                                ...prev,
                                [field.id]: e.target.value
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAddMissing(false);
                        setNewFieldValues({});
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMissingFields}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? 'Adding...' : 'Add Fields'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lead Fields */}
          {fieldsByType && Object.keys(fieldsByType).length > 0 ? (
            Object.entries(fieldsByType).map(([fieldType, fields]) => (
              <div key={fieldType} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                  {fieldType} Fields
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.map((field) => {
                    const Icon = getFieldIcon(field.field_type);
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <label className="text-sm font-medium text-gray-500">
                            {field.label}
                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                        {renderFieldValue(field)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-center">No field data available for this lead.</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900" suppressHydrationWarning>
                    {new Date(lead.created_at).toLocaleDateString()} at{' '}
                    {new Date(lead.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900" suppressHydrationWarning>
                    {new Date(lead.updated_at).toLocaleDateString()} at{' '}
                    {new Date(lead.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Lead ID</label>
                  <p className="text-gray-900 font-mono text-sm">{lead.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
