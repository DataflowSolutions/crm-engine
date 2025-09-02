"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User, Mail, Lock, X } from "lucide-react";
import { updateProfile } from "@/app/[locale]/organizations/[id]/settings/actions";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    email?: string;
    user_metadata?: {
      display_name?: string;
    };
  };
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const t = useTranslations();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (formData: FormData) => {
    setIsUpdating(true);
    setMessage(null);
    
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setMessage({ type: 'success', text: t('profile.updateSuccess') });
        setTimeout(() => {
          onClose();
          window.location.reload(); // Refresh to show updated data
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || t('profile.updateError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('profile.updateError') });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("profile.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Message display */}
          {message && (
            <div className={`p-3 rounded-lg mb-4 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form action={handleUpdateProfile} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("profile.displayName")}
              </label>
              <input
                type="text"
                name="displayName"
                defaultValue={user.user_metadata?.display_name || ""}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder={t("profile.displayNamePlaceholder")}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("profile.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  defaultValue={user.email || ""}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={t("profile.emailPlaceholder")}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium cursor-pointer"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('profile.updating')}
                </div>
              ) : (
                t("profile.saveProfile")
              )}
            </button>
          </form>

          {/* Password Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">{t("profile.changePassword")}</h3>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                placeholder={t("profile.currentPassword")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <input
                type="password"
                placeholder={t("profile.newPassword")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <input
                type="password"
                placeholder={t("profile.confirmPassword")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <button
                type="button"
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium cursor-pointer"
              >
                {t("profile.updatePassword")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
