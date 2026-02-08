/**
 * Standard API response types shared between frontend and backend.
 * Mirrors the response format used by the NestJS API.
 */

/** Successful API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

/** Pagination metadata returned with list endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

/** Standard API error response */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
  timestamp: string;
}

/** Individual field validation error */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraints?: Record<string, string>;
}

/** Query parameters for paginated list requests */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Filter parameters for list endpoints */
export interface ListFilters extends PaginationQuery {
  status?: string;
  startDate?: string;
  endDate?: string;
}
