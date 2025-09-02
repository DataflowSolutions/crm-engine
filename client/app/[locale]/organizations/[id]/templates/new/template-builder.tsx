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

  const moveField = (dragIndex: number, hoverIndex: number) => {
    const draggedField = fields[dragIndex];
    const newFields = [...fields];
    newFields.splice(dragIndex, 1);
    newFields.splice(hoverIndex, 0, draggedField);
    
    // Update sort_order for all fields
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      sort_order: index + 1
    }));
    
    setFields(updatedFields);
  };

    const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    const fieldId = target.getAttribute('data-field-id');
    if (fieldId && fieldId !== draggedField) {
      setDragOverField(fieldId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const fieldId = target.getAttribute('data-field-id');
    if (fieldId === dragOverField) {
      setDragOverField(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    
    if (!draggedField || draggedField === targetFieldId) return;
    
    const dragIndex = fields.findIndex(f => f.id === draggedField);
    const hoverIndex = fields.findIndex(f => f.id === targetFieldId);
    
    if (dragIndex !== -1 && hoverIndex !== -1) {
      moveField(dragIndex, hoverIndex);
    }
    
    setDraggedField(null);
    setDragOverField(null);
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

          {/* Preview Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Preview: How leads will appear</h4>
            <div className="bg-white rounded border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-sm">
                  <span className="text-sm font-medium text-white">
                    {(() => {
                      const displayField = fields.find(f => f.id === displayFieldId);
                      if (displayField) {
                        return displayField.label.charAt(0).toUpperCase();
                      }
                      const autoField = fields.find(f => ['text', 'email'].includes(f.field_type));
                      return autoField ? autoField.label.charAt(0).toUpperCase() : 'L';
                    })()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {(() => {
                      const displayField = fields.find(f => f.id === displayFieldId);
                      if (displayField) {
                        return `${displayField.label} Value`;
                      }
                      const autoField = fields.find(f => ['text', 'email'].includes(f.field_type));
                      return autoField ? `${autoField.label} Value` : 'Lead Name';
                    })()}
                  </div>
                  {(() => {
                    const emailField = fields.find(f => f.field_type === 'email');
                    const currentDisplayField = fields.find(f => f.id === displayFieldId) || 
                                               fields.find(f => ['text', 'email'].includes(f.field_type));
                    
                    // Show email if it exists and isn't the display field
                    if (emailField && emailField.id !== currentDisplayField?.id) {
                      return (
                        <div className="text-sm text-gray-500">
                          {emailField.label}@example.com
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="ml-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The <strong>
              {(() => {
                const displayField = fields.find(f => f.id === displayFieldId);
                return displayField ? displayField.label : 'first suitable field';
              })()}
              </strong> will be the main display name in your lead list.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Fields</h3>
              <p className="text-sm text-gray-500 mt-1">Drag and drop to reorder fields. Order determines field display priority.</p>
            </div>
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
            <div 
              key={field.id} 
              data-field-id={field.id}
              className={`border rounded-lg p-4 transition-all duration-200 relative ${
                draggedField === field.id 
                  ? 'opacity-50 scale-95 bg-gray-50 border-gray-300' 
                  : dragOverField === field.id
                  ? 'border-blue-300 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, field.id)}
            >
              {/* Display Field Indicator */}
              {(displayFieldId === field.id || (!displayFieldId && ['text', 'email'].includes(field.field_type) && fields.findIndex(f => ['text', 'email'].includes(f.field_type)) === fields.indexOf(field))) && (
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                  Display Field
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-2 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
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
