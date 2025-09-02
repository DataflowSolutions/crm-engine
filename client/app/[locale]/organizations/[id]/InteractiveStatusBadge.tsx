'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { StatusType } from '../../../types/status';

// Add custom CSS for the color flow animation
const colorFlowStyles = `
  @keyframes colorFlow {
    0% {
      transform: translateX(-120%) skewX(-25deg) scale(1.2);
      opacity: 0;
    }
    20% {
      opacity: 0.3;
    }
    60% {
      opacity: 0.8;
    }
    100% {
      transform: translateX(0%) skewX(0deg) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes colorFlowReverse {
    0% {
      transform: translateX(120%) skewX(25deg) scale(1.2);
      opacity: 0;
    }
    20% {
      opacity: 0.3;
    }
    60% {
      opacity: 0.8;
    }
    100% {
      transform: translateX(0%) skewX(0deg) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes textFade {
    0% { opacity: 1; transform: translateY(0px); }
    30% { opacity: 0; transform: translateY(-5px); }
    70% { opacity: 0; transform: translateY(5px); }
    100% { opacity: 1; transform: translateY(0px); }
  }
  
  .color-flow {
    animation: colorFlow 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }
  
  .color-flow-reverse {
    animation: colorFlowReverse 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }
  
  .text-transition {
    animation: textFade 600ms ease-out forwards;
  }
  
  .width-transition {
    transition: width 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .width-transition-grow {
    transition: width 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: left center;
  }
  
  .width-transition-shrink {
    transition: width 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: right center;
  }
`;

// Inject styles into the page
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('color-flow-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'color-flow-styles';
    style.textContent = colorFlowStyles;
    document.head.appendChild(style);
  }
}

interface InteractiveStatusBadgeProps {
  status: StatusType;
  onStatusChange: (newStatus: StatusType) => void | Promise<void>;
  isUpdating?: boolean;
}

const statusOrder: StatusType[] = ['draft', 'approved', 'scheduled', 'closed'];

const getStatusColor = (status: StatusType) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'closed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function InteractiveStatusBadge({ 
  status, 
  onStatusChange, 
  isUpdating = false 
}: InteractiveStatusBadgeProps) {
  const t = useTranslations('Orgs.leads.badges');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionToStatus, setTransitionToStatus] = useState<StatusType | null>(null);

  // Fallback function to handle translation errors
  const getStatusLabel = (statusType: StatusType) => {
    try {
      // First normalize the status to lowercase English
      let normalizedStatus = statusType.toLowerCase();
      
      // Handle Swedish status values by converting to English keys
      if (statusType === 'Godkänd') normalizedStatus = 'approved';
      else if (statusType === 'Schemalagd') normalizedStatus = 'scheduled';
      else if (statusType === 'Stängd') normalizedStatus = 'closed';
      else if (statusType === 'Utkast') normalizedStatus = 'draft';
      
      return t(normalizedStatus);
    } catch {
      // Fallback to handle both English and Swedish status values
      const fallbacks: Record<string, string> = {
        draft: 'Draft',
        approved: 'Approved', 
        scheduled: 'Scheduled',
        closed: 'Closed',
        'Godkänd': 'Approved',
        'Schemalagd': 'Scheduled',
        'Stängd': 'Closed',
        'Utkast': 'Draft'
      };
      return fallbacks[statusType] || statusType;
    }
  };

  // Calculate approximate width for different status labels (in pixels)
  const getStatusWidth = (statusType: StatusType): number => {
    const label = getStatusLabel(statusType);
    // Approximate character width + padding (24px left/right padding + ~6.5px per character)
    return Math.max(60, 24 + (label.length * 6.5));
  };

  const currentWidth = getStatusWidth(status);
  const targetWidth = isTransitioning && transitionToStatus ? getStatusWidth(transitionToStatus) : currentWidth;
  const isShrinking = isTransitioning && transitionToStatus && getStatusWidth(transitionToStatus) < currentWidth;

  const handleClick = () => {
    if (isUpdating || isAnimating || isTransitioning) return;
    
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleStatusSelect = async (newStatus: StatusType) => {
    if (newStatus === status || isUpdating || isTransitioning) return;
    
    console.log('Status change from', status, 'to', newStatus);
    
    // Start the color transition animation
    setTransitionToStatus(newStatus);
    setIsTransitioning(true);
    setIsExpanded(false);
    setIsAnimating(false);
    
    // Wait for the animation to complete before updating the status
    setTimeout(async () => {
      try {
        await onStatusChange(newStatus);
        console.log('onStatusChange completed successfully');
      } catch (error) {
        console.error('Error in onStatusChange:', error);
      }
      
      // Clear the transition state after status update
      setIsTransitioning(false);
      setTransitionToStatus(null);
      console.log('Animation complete, status should now be:', newStatus);
    }, 600);
  };

  return (
    <div className="relative inline-block">
      {/* Main Badge */}
      <div
        className={`
          relative text-xs font-medium rounded-full border cursor-pointer
          transition-all duration-400 ease-out overflow-hidden width-transition
          ${getStatusColor(status)}
          ${isUpdating || isTransitioning ? 'cursor-not-allowed' : 'hover:opacity-80'}
          ${isExpanded ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
        style={{
          width: `${targetWidth}px`,
          height: '28px',
          paddingLeft: '12px',
          paddingRight: '12px',
          textAlign: 'center',
          transition: 'width 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 400ms ease-out, opacity 400ms ease-out, transform 400ms ease-out'
        }}
        onClick={handleClick}
      >
        {/* Color Transition Overlay */}
        {isTransitioning && transitionToStatus && (
          <>
            <div
              className={`absolute inset-0 rounded-full ${isShrinking ? 'color-flow-reverse' : 'color-flow'}`}
              style={{
                background: `linear-gradient(135deg, 
                  ${transitionToStatus === 'approved' ? 'rgba(34, 197, 94, 0.1)' :
                    transitionToStatus === 'scheduled' ? 'rgba(59, 130, 246, 0.1)' :
                    transitionToStatus === 'closed' ? 'rgba(239, 68, 68, 0.1)' :
                    'rgba(107, 114, 128, 0.1)'} 0%, 
                  ${transitionToStatus === 'approved' ? 'rgba(34, 197, 94, 0.9)' :
                    transitionToStatus === 'scheduled' ? 'rgba(59, 130, 246, 0.9)' :
                    transitionToStatus === 'closed' ? 'rgba(239, 68, 68, 0.9)' :
                    'rgba(107, 114, 128, 0.9)'} 100%)`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `${
                  transitionToStatus === 'approved' ? '#dcfce7' :
                  transitionToStatus === 'scheduled' ? '#dbeafe' :
                  transitionToStatus === 'closed' ? '#fee2e2' :
                  '#f3f4f6'
                }`,
                opacity: 0.8,
                animation: `${isShrinking ? 'colorFlowReverse' : 'colorFlow'} 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              }}
            />
          </>
        )}
        
        {/* Text - transitions smoothly to new text during animation */}
        <span className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300"
              style={{ 
                opacity: isTransitioning ? 0.8 : 1,
                transitionDelay: isTransitioning ? '200ms' : '0ms'
              }}>
          {isTransitioning && transitionToStatus ? getStatusLabel(transitionToStatus) : getStatusLabel(status)}
        </span>
      </div>

      {/* Expanded Status Options */}
      <div
        className={`
          absolute top-0 left-1/2 transform -translate-x-1/2
          flex items-center gap-2
          transition-all duration-400 ease-out
          ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
        style={{
          transitionDelay: isExpanded ? '80ms' : '0ms'
        }}
      >
        {statusOrder.map((statusOption, index) => (
          <div
            key={statusOption}
            className={`
              px-3 py-1 text-xs font-medium rounded-full border cursor-pointer
              transition-all duration-400 ease-out
              ${getStatusColor(statusOption)}
              ${statusOption === status ? 'ring-2 ring-blue-500' : ''}
              hover:opacity-80
            `}
            style={{
              transitionDelay: isExpanded ? `${index * 80}ms` : '0ms'
            }}
            onClick={() => handleStatusSelect(statusOption)}
          >
            {getStatusLabel(statusOption)}
          </div>
        ))}
      </div>
    </div>
  );
}
