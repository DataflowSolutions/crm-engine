"use client";

import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { deleteTemplate } from "./actions";
import { UserPermissions } from "@/utils/permissions";

type Template = {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  is_default: boolean;
  created_at: string;
  lead_fields?: { id: string }[];
};

type TemplateCardProps = {
  template: Template;
  orgId: string;
  permissions: UserPermissions;
};

export default function TemplateCard({ template, orgId, permissions }: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isUniversal = template.organization_id === '00000000-0000-0000-0000-000000000000';
  const canDelete = !template.is_default && !isUniversal && template.organization_id === orgId && permissions.canDeleteTemplates;
  const canEdit = !isUniversal && permissions.canEditTemplates;

  const handleDelete = async () => {
    if (isDeleting || !canDelete) return;
    
    if (confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await deleteTemplate(template.id, orgId);
        // The page will revalidate automatically due to revalidatePath in the action
      } catch (error: unknown) {
        console.error("Failed to delete template:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to delete template. Please try again.";
        alert(errorMessage);
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          {template.is_default && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Default</span>
          )}
        </div>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {canEdit && (
            <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-150 cursor-pointer">
              <Edit className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-150 disabled:opacity-50 cursor-pointer"
              title={!canDelete ? "Cannot delete this template" : "Delete template"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {template.description && (
        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
      )}
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{template.lead_fields?.length || 0} fields</span>
        <span suppressHydrationWarning>
          {new Date(template.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
