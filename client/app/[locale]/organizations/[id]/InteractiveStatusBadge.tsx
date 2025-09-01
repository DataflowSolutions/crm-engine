"use client";

import { useState, useRef, useEffect } from "react";
import { StatusType } from "@/app/types/status";
import { updateLeadStatus } from "./actions";
import { CheckCircle, Clock, FileText, ChevronDown } from "lucide-react";

type InteractiveStatusBadgeProps = {
  leadId: string;
  currentStatus: StatusType;
  orgId: string;
};

const statusOptions: StatusType[] = ["draft", "approved", "scheduled", "closed"];

// Unified status configuration
const statusConfig: Record<StatusType, {
  style: string;
  icon: React.ComponentType<{ size: number }>;
  label: string;
}> = {
  draft: {
    style: "bg-gray-100 text-gray-600 border-gray-200",
    icon: FileText,
    label: "Draft"
  },
  approved: {
    style: "bg-blue-100 text-blue-600 border-blue-200",
    icon: CheckCircle,
    label: "Approved"
  },
  scheduled: {
    style: "bg-yellow-100 text-yellow-600 border-yellow-200",
    icon: Clock,
    label: "Scheduled"
  },
  closed: {
    style: "bg-gray-100 text-gray-500 border-gray-200",
    icon: FileText,
    label: "Closed"
  },
  // Swedish translations (mapped to English equivalents)
  "Godkänd": {
    style: "bg-blue-100 text-blue-600 border-blue-200",
    icon: CheckCircle,
    label: "Approved"
  },
  "Schemalagd": {
    style: "bg-yellow-100 text-yellow-600 border-yellow-200",
    icon: Clock,
    label: "Scheduled"
  },
  "Stängd": {
    style: "bg-gray-100 text-gray-500 border-gray-200",
    icon: FileText,
    label: "Closed"
  },
};

export default function InteractiveStatusBadge({ 
  leadId, 
  currentStatus, 
  orgId 
}: InteractiveStatusBadgeProps) {
  const [status, setStatus] = useState<StatusType>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'down' | 'up'>('down');
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 150; // Approximate height of dropdown
      
      // If dropdown would extend beyond viewport, show it above the button
      if (buttonRect.bottom + dropdownHeight > viewportHeight) {
        setDropdownPosition('up');
      } else {
        setDropdownPosition('down');
      }
    }
  }, [showDropdown]);

  const handleStatusChange = async (newStatus: StatusType) => {
    if (newStatus === status || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateLeadStatus(leadId, newStatus, orgId);
      setStatus(newStatus);
      setShowDropdown(false);
    } catch (error: unknown) {
      console.error("Failed to update status:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update status";
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = statusConfig[status];
  const StatusIcon = currentConfig.icon;

  return (
    <div className="relative">
      {/* Main Status Badge Button */}
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isUpdating}
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
          transition-all duration-150 hover:shadow-sm
          ${currentConfig.style}
          ${isUpdating ? "opacity-50 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}
        `}
      >
        {isUpdating ? (
          <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <StatusIcon size={14} />
        )}
        {currentConfig.label}
        <ChevronDown size={12} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {showDropdown && !isUpdating && (
        <div className={`
          absolute ${dropdownPosition === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 
          bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-[120px]
        `}>
          {statusOptions.map((option) => {
            const optionConfig = statusConfig[option];
            const OptionIcon = optionConfig.icon;
            return (
              <button
                key={option}
                onClick={() => handleStatusChange(option)}
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors
                  ${option === status ? "bg-gray-100 font-medium" : ""}
                  ${option === statusOptions[0] ? "rounded-t-md" : ""}
                  ${option === statusOptions[statusOptions.length - 1] ? "rounded-b-md" : ""}
                `}
              >
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${optionConfig.style}`}>
                  <OptionIcon size={14} />
                  {optionConfig.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
