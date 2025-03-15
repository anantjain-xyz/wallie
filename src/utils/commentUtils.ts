/**
 * Utility functions for working with comments
 */

/**
 * Detects if a comment indicates an intent to retry an issue
 * 
 * @param commentText The text of the comment to analyze
 * @returns boolean indicating if retry intent was detected
 */
export function detectRetryIntent(commentText: string): boolean {
  if (!commentText) return false;
  
  // Convert to lowercase for case-insensitive matching
  const text = commentText.toLowerCase();
  
  // Define patterns that indicate retry intent
  const retryPatterns = [
    /\bretry\b/,
    /\btry again\b/,
    /\breopen\b/,
    /\blet's try\b/,
    /\blet us try\b/,
    /\bstart over\b/,
    /\bredo\b/,
    /\battempt again\b/,
    /\bgive it another shot\b/,
    /\bgive it another try\b/,
    /\blet's restart\b/
  ];
  
  // Check if any pattern matches
  return retryPatterns.some(pattern => pattern.test(text));
}

/**
 * Extracts retry details from a comment
 * This could be extended to parse specific instructions about how to retry
 * 
 * @param commentText The text of the comment to analyze
 * @returns Object with retry details or null if no details found
 */
export function extractRetryDetails(commentText: string): { reason?: string } | null {
  if (!detectRetryIntent(commentText)) return null;
  
  // For now, just return a simple object
  // This could be enhanced to extract specific retry instructions
  return {
    reason: "User requested retry via comment"
  };
}