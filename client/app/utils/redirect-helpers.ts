/**
 * Utility functions for handling Next.js redirects in Server Actions
 */

/**
 * Checks if an error is a Next.js redirect error that should be re-thrown
 * @param error - The error to check
 * @returns true if this is a redirect error that should bubble up
 */
export function isRedirectError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof (error as { digest?: string }).digest === 'string' &&
    (error as { digest: string }).digest.includes('NEXT_REDIRECT')
  );
}

/**
 * Safely handles errors in Server Actions, re-throwing redirect errors
 * @param error - The error to handle
 * @param fallbackAction - Optional fallback action to perform if not a redirect error
 */
export function handleServerActionError(error: unknown, fallbackAction?: () => void): void {
  if (isRedirectError(error)) {
    throw error; // Re-throw redirect errors to allow them to bubble up
  }
  
  // Handle non-redirect errors
  console.error('Server action error:', error);
  if (fallbackAction) {
    fallbackAction();
  }
}
