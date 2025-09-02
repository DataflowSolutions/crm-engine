'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet, X, GripVertical } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  orgId: string;
  orgName: string;
  userId: string;
  locale: string;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  columnIndex: number;
  columnName: string;
  leadField: string;
  customFieldName?: string;
  fieldType: string;
}

interface ImportResults {
  leadsCreated: number;
  leadsSkipped: number;
  templateCreated: boolean;
  errors: string[];
}

export default function ImportWizard({ orgId, orgName, userId, locale }: Props) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [excludedColumns, setExcludedColumns] = useState<Set<number>>(new Set());
  const [draggedMapping, setDraggedMapping] = useState<number | null>(null);
  const [dragOverMapping, setDragOverMapping] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const leadFieldOptions = [
    { value: 'name', label: 'Name', type: 'text' },
    { value: 'email', label: 'Email', type: 'email' },
    { value: 'phone', label: 'Phone', type: 'phone' },
    { value: 'company', label: 'Company', type: 'text' },
    { value: 'notes', label: 'Notes', type: 'textarea' },
    { value: 'website', label: 'Website', type: 'url' },
    { value: 'address', label: 'Address', type: 'textarea' },
    { value: 'title', label: 'Job Title', type: 'text' },
    { value: 'custom', label: 'Custom Field', type: 'text' }
  ];

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      
      let data: ParsedData;
      
      if (isCSV) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) throw new Error('File is empty');
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );
        
        // Filter out empty rows
        const nonEmptyRows = rows.filter(row => row.some(cell => cell.trim()));
        
        data = { headers, rows: nonEmptyRows };
      } else {
        // Excel file
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length === 0) throw new Error('File is empty');
        
        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows = jsonData.slice(1)
          .filter(row => row.some(cell => String(cell || '').trim()))
          .map(row => row.map(cell => String(cell || '').trim()));
        
        data = { headers, rows };
      }
      
      if (data.headers.length === 0) throw new Error('No headers found');
      if (data.rows.length === 0) throw new Error('No data rows found');
      
      setParsedData(data);
      
      // Auto-create column mappings
      const mappings: ColumnMapping[] = data.headers.map((header, index) => {
        const lowerHeader = header.toLowerCase();
        let leadField = 'custom';
        let fieldType = 'text';
        
        if (lowerHeader.includes('name')) {
          leadField = 'name';
          fieldType = 'text';
        } else if (lowerHeader.includes('email')) {
          leadField = 'email';
          fieldType = 'email';
        } else if (lowerHeader.includes('phone')) {
          leadField = 'phone';
          fieldType = 'phone';
        } else if (lowerHeader.includes('company')) {
          leadField = 'company';
          fieldType = 'text';
        } else if (lowerHeader.includes('note')) {
          leadField = 'notes';
          fieldType = 'textarea';
        } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
          leadField = 'website';
          fieldType = 'url';
        } else if (lowerHeader.includes('address')) {
          leadField = 'address';
          fieldType = 'textarea';
        } else if (lowerHeader.includes('title') || lowerHeader.includes('position')) {
          leadField = 'title';
          fieldType = 'text';
        }
        
        return {
          columnIndex: index,
          columnName: header,
          leadField,
          fieldType,
          customFieldName: leadField === 'custom' ? header : undefined
        };
      });
      
      setColumnMappings(mappings);
      console.log('Parsed data headers:', data.headers);
      console.log('Auto-created mappings:', mappings);
      console.log('Email mappings:', mappings.filter(m => m.leadField === 'email'));
      setTemplateName(`${file.name.split('.')[0]} Template`);
      setCurrentStep('mapping');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    } else {
      setError('Please upload a CSV or Excel file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const updateColumnMapping = (columnIndex: number, updates: Partial<ColumnMapping>) => {
    setColumnMappings(prev => 
      prev.map((mapping) => (mapping && mapping.columnIndex === columnIndex) ? { ...mapping, ...updates } : mapping)
    );
  };

  const removeColumn = (columnIndex: number) => {
    setColumnMappings(prev => prev.filter(mapping => mapping && mapping.columnIndex !== columnIndex));
    setExcludedColumns(prev => {
      const newSet = new Set(prev);
      newSet.delete(columnIndex);
      return newSet;
    });
  };

  const toggleColumnExclusion = (columnIndex: number) => {
    setExcludedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnIndex)) {
        newSet.delete(columnIndex);
      } else {
        newSet.add(columnIndex);
      }
      return newSet;
    });
  };

  const moveMapping = (dragIndex: number, hoverIndex: number) => {
    setColumnMappings(prev => {
      const newMappings = [...prev];
      const draggedItem = newMappings[dragIndex];
      
      // Safety check - ensure we have a valid item to move
      if (!draggedItem) return newMappings;
      
      // Remove the dragged item
      newMappings.splice(dragIndex, 1);
      // Insert it at the new position
      newMappings.splice(hoverIndex, 0, draggedItem);
      
      return newMappings;
    });
  };

  const handleMappingDragStart = (e: React.DragEvent, columnIndex: number) => {
    setDraggedMapping(columnIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMappingDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    const mappingIndex = target.getAttribute('data-mapping-index');
    if (mappingIndex && parseInt(mappingIndex) !== draggedMapping) {
      setDragOverMapping(parseInt(mappingIndex));
    }
  };

  const handleMappingDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const mappingIndex = target.getAttribute('data-mapping-index');
    if (mappingIndex && parseInt(mappingIndex) === dragOverMapping) {
      setDragOverMapping(null);
    }
  };

  const handleMappingDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    const targetIndexStr = target.getAttribute('data-mapping-index');
    const targetIndex = targetIndexStr ? parseInt(targetIndexStr) : null;
    
    if (draggedMapping === null || targetIndex === null || draggedMapping === targetIndex) return;
    
    // Safety checks for valid indices
    if (draggedMapping < 0 || draggedMapping >= columnMappings.length || 
        targetIndex < 0 || targetIndex >= columnMappings.length) {
      setDraggedMapping(null);
      setDragOverMapping(null);
      return;
    }
    
    const dragIndex = draggedMapping;
    const hoverIndex = targetIndex;
    
    moveMapping(dragIndex, hoverIndex);
    
    setDraggedMapping(null);
    setDragOverMapping(null);
  };

  const handleCreateTemplate = async () => {
    if (!parsedData || !templateName.trim()) return;

    const activeColumnMappings = columnMappings.filter(mapping => mapping && mapping.columnIndex !== undefined && !excludedColumns.has(mapping.columnIndex));
    console.log('Total column mappings:', columnMappings.length);
    console.log('Excluded columns:', Array.from(excludedColumns));
    console.log('Active column mappings:', activeColumnMappings);
    console.log('Email mappings in active:', activeColumnMappings.filter(m => m.leadField === 'email'));
    
    if (activeColumnMappings.length === 0) {
      setError('Please include at least one column to import');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${orgId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: templateName.trim(),
          columnMappings: activeColumnMappings,
          data: parsedData.rows,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import data');
      }

      const result = await response.json();
      setImportResults(result);
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Name,Email,Phone,Company,Notes\nJohn Doe,john@example.com,+1234567890,Acme Corp,Sample lead\nJane Smith,jane@example.com,+0987654321,Beta Inc,Another sample`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-leads-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/${locale}/organizations/${orgId}/templates`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Leads from Spreadsheet</h1>
            <p className="text-gray-600">{orgName}</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-medium">Import Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Spreadsheet</h2>
              <p className="text-gray-600">
                Upload a CSV or Excel file containing your leads data
              </p>
            </div>

            {/* Upload Area with Drag & Drop */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-gray-600">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>
                <p className="text-sm text-gray-500">
                  Supports CSV and Excel files (.csv, .xlsx, .xls)
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Sample Template */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Need a template?</h3>
                  <p className="text-blue-700 text-sm">
                    Download our sample template to see the expected format
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {currentStep === 'mapping' && parsedData && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Map Your Columns</h2>
              <p className="text-gray-600">
                Configure how each column maps to lead fields. You can exclude columns, remove them completely, or create custom fields with specific data types.
              </p>
            </div>

            {/* Template Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter template name..."
              />
            </div>

            {/* Preview Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Preview: How leads will appear</h4>
              <div className="bg-white rounded border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-sm">
                    <span className="text-sm font-medium text-white">
                      {(() => {
                        const activeColumns = columnMappings.filter(m => m && m.columnIndex !== undefined && !excludedColumns.has(m.columnIndex));
                        const nameField = activeColumns.find(m => m.leadField === 'name' || (m.leadField === 'custom' && m.customFieldName?.toLowerCase().includes('name')));
                        const firstField = activeColumns[0];
                        
                        if (nameField && parsedData) {
                          const sampleValue = parsedData.rows
                            .map(row => row[nameField.columnIndex])
                            .find(value => value && value.trim());
                          return sampleValue ? sampleValue.charAt(0).toUpperCase() : 'L';
                        } else if (firstField && parsedData) {
                          const sampleValue = parsedData.rows
                            .map(row => row[firstField.columnIndex])
                            .find(value => value && value.trim());
                          return sampleValue ? sampleValue.charAt(0).toUpperCase() : 'L';
                        }
                        return 'L';
                      })()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const activeColumns = columnMappings.filter(m => m && m.columnIndex !== undefined && !excludedColumns.has(m.columnIndex));
                        const nameField = activeColumns.find(m => m.leadField === 'name' || (m.leadField === 'custom' && m.customFieldName?.toLowerCase().includes('name')));
                        const firstField = activeColumns[0];
                        
                        if (nameField && parsedData) {
                          const sampleValue = parsedData.rows
                            .map(row => row[nameField.columnIndex])
                            .find(value => value && value.trim());
                          return sampleValue || 'Sample Name';
                        } else if (firstField && parsedData) {
                          const sampleValue = parsedData.rows
                            .map(row => row[firstField.columnIndex])
                            .find(value => value && value.trim());
                          return sampleValue || 'Sample Value';
                        }
                        return 'Lead Name';
                      })()}
                    </div>
                    {(() => {
                      const activeColumns = columnMappings.filter(m => m && m.columnIndex !== undefined && !excludedColumns.has(m.columnIndex));
                      const emailField = activeColumns.find(m => m.leadField === 'email');
                      const displayField = activeColumns.find(m => m.leadField === 'name') || activeColumns[0];
                      
                      if (emailField && emailField !== displayField && parsedData) {
                        const sampleEmail = parsedData.rows
                          .map(row => row[emailField.columnIndex])
                          .find(value => value && value.trim() && value.includes('@'));
                        return (
                          <div className="text-sm text-gray-500">
                            {sampleEmail || 'sample@email.com'}
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
                  const activeColumns = columnMappings.filter(m => m && m.columnIndex !== undefined && !excludedColumns.has(m.columnIndex));
                  const displayField = activeColumns.find(m => m.leadField === 'name') || activeColumns[0];
                  if (displayField) {
                    return displayField.leadField === 'custom' ? displayField.customFieldName : 
                           leadFieldOptions.find(opt => opt.value === displayField.leadField)?.label;
                  }
                  return 'first column';
                })()}
                </strong> will be the main display name in your lead list.
              </p>
            </div>

            {/* Column Mappings with Remove Feature */}
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-500 mb-3">Drag and drop to reorder columns. Order affects how leads are displayed and organized.</p>
              {columnMappings
                .filter(mapping => {
                  // Skip undefined mappings
                  if (!mapping || mapping.columnIndex === undefined) return false;
                  
                  // Skip if parsedData is not available
                  if (!parsedData || !parsedData.rows) return false;
                  
                  // Only show columns that have actual data
                  const hasData = parsedData.rows
                    .some(row => row && row[mapping.columnIndex] && row[mapping.columnIndex].trim());
                  return hasData;
                })
                .map((mapping, index) => {
                const isExcluded = excludedColumns.has(mapping.columnIndex);
                return (
                  <div 
                    key={mapping.columnIndex} 
                    data-mapping-index={index}
                    className={`p-4 border rounded-lg transition-all relative ${
                      draggedMapping === index 
                        ? 'opacity-50 scale-95 bg-gray-50 border-gray-300' 
                        : dragOverMapping === index
                        ? 'border-blue-300 bg-blue-50 shadow-md'
                        : isExcluded 
                        ? 'border-gray-200 bg-gray-50 opacity-50' 
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    draggable={!isExcluded}
                    onDragStart={(e) => handleMappingDragStart(e, index)}
                    onDragOver={handleMappingDragOver}
                    onDragLeave={handleMappingDragLeave}
                    onDrop={handleMappingDrop}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {!isExcluded && (
                        <div className="flex-shrink-0 mr-3 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            Column {mapping.columnIndex + 1}: {mapping.columnName}
                          </span>
                          {/* Display Field Indicator */}
                          {(() => {
                            const activeColumns = columnMappings.filter(m => m && m.columnIndex !== undefined && !excludedColumns.has(m.columnIndex));
                            const isDisplayField = mapping.leadField === 'name' || 
                                                  (activeColumns.findIndex(m => m.leadField === 'name') === -1 && activeColumns[0] === mapping);
                            return isDisplayField ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Display Field
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {/* Data Preview */}
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Sample data: </span>
                          <span className="italic">
                            {(() => {
                              // Find first non-empty value in this column
                              const sampleValue = parsedData.rows
                                .map(row => row[mapping.columnIndex])
                                .find(value => value && value.trim());
                              return sampleValue 
                                ? `"${sampleValue.length > 50 ? sampleValue.substring(0, 50) + '...' : sampleValue}"`
                                : '';
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleColumnExclusion(mapping.columnIndex)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            isExcluded
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                          title={isExcluded ? 'Include column' : 'Exclude column'}
                        >
                          {isExcluded ? 'Include' : 'Exclude'}
                        </button>
                        <button
                          onClick={() => removeColumn(mapping.columnIndex)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove column completely"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {!isExcluded && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Maps to lead field:
                          </label>
                          <select
                            value={mapping.leadField}
                            onChange={(e) => updateColumnMapping(mapping.columnIndex, { 
                              leadField: e.target.value,
                              fieldType: leadFieldOptions.find(opt => opt.value === e.target.value)?.type || 'text'
                            })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {leadFieldOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {mapping.leadField === 'custom' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Custom field name:
                            </label>
                            <input
                              type="text"
                              value={mapping.customFieldName || ''}
                              onChange={(e) => updateColumnMapping(mapping.columnIndex, { customFieldName: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter custom field name..."
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Field type:
                          </label>
                          <select
                            value={mapping.fieldType}
                            onChange={(e) => updateColumnMapping(mapping.columnIndex, { fieldType: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="url">URL/Website</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>



            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={isProcessing || !templateName.trim() || columnMappings.filter(m => m && m.columnIndex !== undefined && !excludedColumns.has(m.columnIndex)).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Creating...' : `Create Template & Import ${parsedData.rows.length} Leads (${columnMappings.length - excludedColumns.size} columns)`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && importResults && (
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
            <p className="text-gray-600 mb-6">
              Successfully created template and imported your leads.
            </p>
            
            {/* Detailed Import Results */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Template Created:</span>
                  <div className="text-gray-900 font-semibold">{templateName}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Leads Imported:</span>
                  <div className="text-green-600 font-semibold text-xl">{importResults.leadsCreated}</div>
                </div>
                {importResults.leadsSkipped > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Leads Skipped:</span>
                    <div className="text-yellow-600 font-semibold">{importResults.leadsSkipped}</div>
                    <div className="text-xs text-gray-500">Empty rows</div>
                  </div>
                )}
              </div>
              
              {/* Error Display */}
              {importResults.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    ⚠️ {importResults.errors.length} Error{importResults.errors.length !== 1 ? 's' : ''}:
                  </h4>
                  <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {importResults.leadsCreated > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="text-sm font-medium text-green-800">
                    🎉 Successfully imported {importResults.leadsCreated} lead{importResults.leadsCreated !== 1 ? 's' : ''}!
                  </h4>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/organizations/${orgId}/leads`}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Leads
              </Link>
              <Link
                href={`/${locale}/organizations/${orgId}/templates`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Templates
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
