/**
 * Utility function to format error messages for better user experience
 * Converts technical error messages into user-friendly, concise messages
 */
export const formatErrorMessage = (errorMessage: string): string => {
  if (!errorMessage) return "An error occurred";
  
  // Convert to lowercase for easier matching
  const lowerMessage = errorMessage.toLowerCase();
  
  // Handle email sending limit errors
  if (lowerMessage.includes("daily user sending limit exceeded") || 
      lowerMessage.includes("smtpsendfailedexception") ||
      lowerMessage.includes("550-5.4.5")) {
    return "Email notification failed: Daily sending limit exceeded. Please try again later.";
  }
  
  // Handle email-related errors
  if (lowerMessage.includes("email") && lowerMessage.includes("already exists")) {
    return "Email address is already registered. Please use a different email.";
  }
  
  // Handle validation errors
  if (lowerMessage.includes("validation") || lowerMessage.includes("invalid")) {
    return "Please check your input and try again.";
  }
  
  // Handle network/connection errors
  if (lowerMessage.includes("network") || lowerMessage.includes("connection") || 
      lowerMessage.includes("timeout") || lowerMessage.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  
  // Handle server errors
  if (lowerMessage.includes("500") || lowerMessage.includes("internal server error")) {
    return "Server error. Please try again later.";
  }
  
  // Handle authentication errors
  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
    return "Authentication error. Please log in again.";
  }
  
  // Handle forbidden errors
  if (lowerMessage.includes("forbidden") || lowerMessage.includes("403")) {
    return "You don't have permission to perform this action.";
  }
  
  // Handle not found errors
  if (lowerMessage.includes("not found") || lowerMessage.includes("404")) {
    return "The requested resource was not found.";
  }
  
  // Handle generic error patterns
  if (lowerMessage.includes("failed") || lowerMessage.includes("error")) {
    // Extract the main part of the error (before any technical details)
    const mainPart = errorMessage.split('\n')[0].split('550')[0].split('org.')[0];
    if (mainPart.length > 0 && mainPart.length < 100) {
      return mainPart.trim();
    }
  }
  
  // If the message is too long, truncate it
  if (errorMessage.length > 100) {
    const truncated = errorMessage.substring(0, 100).trim();
    return truncated + (truncated.endsWith('.') ? '' : '...');
  }
  
  return errorMessage;
};

/**
 * Extract the main error message from a complex error object
 */
export const extractErrorMessage = (error: any): string => {
  if (!error) return "An error occurred";
  
  // Handle different error formats
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  if (error.error) {
    return error.error;
  }
  
  return "An unexpected error occurred";
};

/**
 * Format error message with fallback
 */
export const formatErrorWithFallback = (error: any, fallbackMessage: string): string => {
  const errorMessage = extractErrorMessage(error);
  return formatErrorMessage(errorMessage || fallbackMessage);
};
