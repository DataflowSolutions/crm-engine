"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Users, Shield, Mail, Globe, Trash2, Download } from "lucide-react";
import { updateOrganization, exportOrganizationData } from "./actions";

interface SettingsClientProps {
  organization: {
    id: string;
    name: string;
  };
}

export default function SettingsClient({ organization }: SettingsClientProps) {
  const t = useTranslations();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateOrganization = async (formData: FormData) => {
    setIsUpdating(true);
    setMessage(null);
    
    try {
      const result = await updateOrganization(formData);
      if (result.success) {
        setMessage({ type: 'success', text: t('settings.updateSuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('settings.updateError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('settings.updateError') });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setMessage(null);
    
    try {
      const result = await exportOrganizationData(organization.id);
      if (result.success && result.data) {
        // Create and download JSON file
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${organization.name}-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setMessage({ type: 'success', text: t('settings.exportSuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('settings.exportError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('settings.exportError') });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      {/* Message display */}
      {message && (
        <div className={`p-4 rounded-xl border animate-in slide-in-from-top duration-300 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Organization Details */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {t("settings.organizationDetails")}
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <form action={handleUpdateOrganization}>
            <input type="hidden" name="orgId" value={organization.id} />
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("settings.organizationName")}
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={organization.name}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={t("settings.organizationNamePlaceholder")}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                type="submit"
                disabled={isUpdating}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isUpdating ? t('settings.updating') : t("settings.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Members Management */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {t("settings.membersManagement")}
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
              <div>
                <p className="font-medium text-gray-900">
                  {t("settings.inviteMembers")}
                </p>
                <p className="text-sm text-gray-600">
                  {t("settings.inviteMembersDescription")}
                </p>
              </div>
              <button className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                <Mail className="h-4 w-4 inline mr-2" />
                {t("settings.sendInvite")}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
              <div>
                <p className="font-medium text-gray-900">
                  {t("settings.manageRoles")}
                </p>
                <p className="text-sm text-gray-600">
                  {t("settings.manageRolesDescription")}
                </p>
              </div>
              <button className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                <Shield className="h-4 w-4 inline mr-2" />
                {t("settings.managePermissions")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {t("settings.advanced")}
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
              <div>
                <p className="font-medium text-gray-900">
                  {t("settings.dataExport")}
                </p>
                <p className="text-sm text-gray-600">
                  {t("settings.dataExportDescription")}
                </p>
              </div>
              <button 
                onClick={handleExportData}
                disabled={isExporting}
                className="px-4 py-2.5 bg-gradient-to-r from-gray-500 to-slate-500 text-white font-medium rounded-xl hover:from-gray-600 hover:to-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Download className="h-4 w-4 inline mr-2" />
                {isExporting ? t('settings.exporting') : t("settings.exportData")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-red-200/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-red-200/50 bg-gradient-to-r from-red-50 to-red-50">
          <div className="flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">
              {t("settings.dangerZone")}
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-red-50/50 rounded-xl border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">
                  {t("settings.deleteOrganization")}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {t("settings.deleteOrganizationWarning")}
                </p>
              </div>
              <button className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                {t("settings.deleteButton")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
