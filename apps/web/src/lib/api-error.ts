import { AxiosError } from 'axios';
import type { ApiError, ValidationErrorDetail } from '@/types/api';

/**
 * Frontend API error parser.
 * Extracts user-friendly messages from various API error formats.
 */

/** Parsed error result for display in the UI */
export interface ParsedApiError {
  /** HTTP status code */
  statusCode: number;
  /** User-friendly error message */
  message: string;
  /** Machine-readable error type */
  errorType: string;
  /** Individual field validation errors, if any */
  fieldErrors: Record<string, string>;
  /** Whether this is a validation error with field-level details */
  isValidation: boolean;
  /** Whether this is a network/connectivity error */
  isNetworkError: boolean;
  /** Whether the user's session has expired */
  isAuthError: boolean;
  /** The raw error for debugging */
  raw: unknown;
}

/**
 * Parse an API error (typically from Axios) into a structured, user-friendly format.
 *
 * @param error - The caught error from an API call
 * @returns Parsed error with user-friendly message and field-level details
 *
 * @example
 * ```ts
 * try {
 *   await api.post('/items', data);
 * } catch (err) {
 *   const parsed = parseApiError(err);
 *   if (parsed.isValidation) {
 *     // Show field errors on form
 *     Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
 *       form.setFields([{ name: field, errors: [msg] }]);
 *     });
 *   } else {
 *     message.error(parsed.message);
 *   }
 * }
 * ```
 */
export function parseApiError(error: unknown): ParsedApiError {
  // Default error state
  const result: ParsedApiError = {
    statusCode: 500,
    message: 'An unexpected error occurred. Please try again.',
    errorType: 'UNKNOWN',
    fieldErrors: {},
    isValidation: false,
    isNetworkError: false,
    isAuthError: false,
    raw: error,
  };

  // Network errors (no response received)
  if (error instanceof AxiosError && !error.response) {
    result.isNetworkError = true;
    result.errorType = 'NETWORK_ERROR';

    if (error.code === 'ECONNABORTED') {
      result.message = 'The request timed out. Please check your connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      result.message = 'Unable to connect to the server. Please check your internet connection.';
    } else {
      result.message = 'A network error occurred. Please check your connection and try again.';
    }

    return result;
  }

  // HTTP errors (response received)
  if (error instanceof AxiosError && error.response) {
    const { status, data } = error.response;
    result.statusCode = status;

    // Try to parse as our standard API error format
    const apiError = data as Partial<ApiError>;

    if (apiError && typeof apiError === 'object') {
      result.message = apiError.message || getDefaultMessage(status);
      result.errorType = apiError.error || 'ERROR';

      // Parse validation details
      if (apiError.details && Array.isArray(apiError.details)) {
        result.isValidation = true;
        const details = apiError.details as ValidationErrorDetail[];
        details.forEach((detail) => {
          if (detail.field) {
            result.fieldErrors[detail.field] = detail.message;
          }
        });
        if (Object.keys(result.fieldErrors).length === 0) {
          // If no field-level errors could be extracted, use the messages as a combined message
          result.message = details.map((d) => d.message).join('. ');
        }
      }
    } else if (typeof data === 'string') {
      result.message = data || getDefaultMessage(status);
    } else {
      result.message = getDefaultMessage(status);
    }

    // Auth errors
    if (status === 401 || status === 403) {
      result.isAuthError = true;
      if (status === 401) {
        result.message = 'Your session has expired. Please log in again.';
      } else {
        result.message = 'You do not have permission to perform this action.';
      }
    }

    // Rate limiting
    if (status === 429) {
      result.message = 'Too many requests. Please wait a moment and try again.';
    }

    return result;
  }

  // Standard JavaScript Error
  if (error instanceof Error) {
    result.message = error.message;
  }

  return result;
}

/**
 * Get a user-friendly error message string from an error.
 * Convenience wrapper around parseApiError for simple use cases.
 *
 * @param error - The caught error
 * @returns A user-friendly message string
 */
export function getErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}

/**
 * Get default user-friendly message for common HTTP status codes.
 */
function getDefaultMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'The request was invalid. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred. The resource may already exist.';
    case 422:
      return 'The submitted data could not be processed. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'An internal server error occurred. Please try again later.';
    case 502:
      return 'The server is temporarily unavailable. Please try again later.';
    case 503:
      return 'The service is temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
