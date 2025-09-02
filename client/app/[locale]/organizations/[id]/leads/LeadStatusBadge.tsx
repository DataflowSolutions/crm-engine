"use client";

import InteractiveStatusBadge from "../InteractiveStatusBadge";
import { StatusType } from "@/app/types/status";
import { updateLeadStatus } from "../actions";

interface LeadStatusBadgeProps {
  leadId: string;
  orgId: string;
  status: StatusType;
}

export default function LeadStatusBadge({ leadId, orgId, status }: LeadStatusBadgeProps) {
  const handleStatusUpdate = async (newStatus: StatusType) => {
    try {
      console.log(`Updating lead ${leadId} to status ${newStatus}`);
      await updateLeadStatus(leadId, newStatus, orgId);
      console.log('Status update successful');
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  return (
    <InteractiveStatusBadge 
      status={status}
      onStatusChange={handleStatusUpdate}
      isUpdating={false}
    />
  );
}
