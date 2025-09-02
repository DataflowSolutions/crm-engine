"use client";

import React, { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { createTemplate } from "./actions";

type FieldType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'multiselect' | 'url' | 'textarea';

type Field = {
  id: string;
  label: string;
  field_key: string;
  field_type: FieldType;
  is_required: boolean;
  sort_order: number;
};

type TemplateBuilderProps = {
  orgId: string;
  locale: string;
  isDefault: boolean;
};

export default function TemplateBuilder({ orgId, locale, isDefault }: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(isDefault ? "Default Lead Template" : "");
  const [displayFieldId, setDisplayFieldId] = useState<string>("");
  const [fields, setFields] = useState<Field[]>([
    {
      id: crypto.randomUUID(),
      label: "Full Name",
      field_key: "full_name",
      field_type: "text",
      is_required: true,
      sort_order: 1
    },
    {
      id: crypto.randomUUID(),
      label: "Email",
      field_key: "email",
      field_type: "email",
      is_required: true,
      sort_order: 2
    }
  ]);

  // Set the first field as default display field
  React.useEffect(() => {
    if (fields.length > 0 && !displayFieldId) {
      setDisplayFieldId(fields[0].id);
    }
  }, [fields, displayFieldId]);

  const fieldTypes: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'URL' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'select', label: 'Dropdown' },
    { value: 'multiselect', label: 'Multi-select' }
  ];

  const addField = () => {
    const newField: Field = {
      id: crypto.randomUUID(),
      label: "",
      field_key: "",
      field_type: "text",
      is_required: false,
      sort_order: fields.length + 1
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const generateFieldKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleLabelChange = (id: string, label: string) => {
    const field_key = generateFieldKey(label);
    updateField(id, { label, field_key });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (fields.some(f => !f.label.trim())) {
      alert("Please fill in all field labels");
      return;
    }

    // Check for duplicate field keys
    const fieldKeys = fields.map(f => f.field_key);
    const duplicates = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      alert("Field names must be unique");
      return;
    }

    const formData = new FormData();
    formData.append('organizationId', orgId);
    formData.append('locale', locale);
    formData.append('templateName', templateName);
    formData.append('isDefault', isDefault.toString());
    formData.append('fields', JSON.stringify(fields));
    formData.append('displayFieldId', displayFieldId);

    await createTemplate(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <form onSubmit={handleSubmit}>
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Sales Lead Template"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="displayField" className="block text-sm font-medium text-gray-700 mb-2">
              Display Field <span className="text-gray-500">(What shows as the lead name)</span>
            </label>
            <select
              id="displayField"
              value={displayFieldId}
              onChange={(e) => setDisplayFieldId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Auto-detect (recommended)</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label || field.field_key}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Choose which field will be shown as the lead name in lists and tables
            </p>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Fields</h3>
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Label
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleLabelChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Company Name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Type
                    </label>
                    <select
                      value={field.field_type}
                      onChange={(e) => updateField(field.id, { field_type: e.target.value as FieldType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {fieldTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.is_required}
                        onChange={(e) => updateField(field.id, { is_required: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Required</span>
                    </label>
                    
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Field key: <code className="bg-gray-100 px-1 rounded">{field.field_key || 'auto-generated'}</code>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Create Template
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
