'use client';

import Link from 'next/link';
import { useState } from 'react';

type AccessDeniedProps = {
  locale: string;
  orgId: string;
  orgExists: boolean;
  userEmail?: string;
};

export default function AccessDeniedPage({ locale, orgId, orgExists, userEmail }: AccessDeniedProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRequest = async () => {
    const requestText = `Hi! I would like to request access to the organization with ID: ${orgId}. My email is: ${userEmail || '[Your Email]'}. Could you please add me as a member? Thank you!`;
    
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently fail - user will see copy didn't work
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg 
              className="h-8 w-8 text-red-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {orgExists ? 'Access Denied' : 'Organization Not Found'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {orgExists 
              ? "You don't have permission to access this organization. Contact an administrator to request access."
              : "This organization doesn't exist or has been removed."
            }
          </p>
        </div>

        <div className="space-y-3">
          {orgExists && (
            <button
              onClick={handleCopyRequest}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              {copied ? '✓ Request Copied!' : 'Copy Access Request'}
            </button>
          )}
          
          <Link
            href={`/${locale}/organizations`}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            View My Organizations
          </Link>
          
          <Link
            href={`/${locale}/`}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go Home
          </Link>
        </div>

        {orgExists && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Organization ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{orgId}</code>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click &ldquo;Copy Access Request&rdquo; above to get a message you can send to an administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
