// API Response Types and Interfaces

/**
 * Available module names for API responses
 */
export type ModuleNames = 
  // Core System
  | 'APP'
  | 'SYSTEM'
  | 'CORE'
  | 'API'
  | 'BASE'
  | 'UNKNOWN'
  | 'PUBLIC'
  
  // Authentication & Authorization
  | 'AUTH'
  | 'RBAC'
  | 'USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'RESOURCE'
  
  // User Management
  | 'EMPLOYEE'
  | 'STUDENT'
  
  // Organization & Centers
  | 'ORGANIZATION'
  | 'CENTER'
  
  // Course Management
  | 'COURSE'
  | 'COHORT'
  | 'CLASS'
  
  // Enrollment & Learning
  | 'ENROLLMENT'
  | 'ENQUIRY'
  
  // Feedback & Payments
  | 'FEEDBACK'
  | 'PAYMENT'
  
  // System & Monitoring
  | 'AUDIT_LOG'
  | 'NOTIFICATION'
  | 'WORKER'
  
  // Legacy
  | 'TODO';

/**
 * Error type classifications
 */
export type ErrorTypes = 
  | 'VALIDATION_ERROR'     // Input validation failures
  | 'DATABASE_ERROR'      // Database operation failures
  | 'AUTH_ERROR'          // Authentication failures
  | 'ACCESS_ERROR'        // Authorization failures
  | 'BUSINESS_ERROR'      // Business logic errors
  | 'SYSTEM_ERROR'        // System-level errors
  | 'INTERNAL_ERROR'      // Internal server errors
  | 'TECHNICAL_ERROR';    // Technical/network errors

/**
 * Generic base response interface
 */
export interface BaseResponse<T = unknown> {
  success: boolean;           // true for success, false for errors
  statusCode: number;         // HTTP status code
  message: string;            // Response message
  module: ModuleNames;        // Module that handled the request
  data?: T;                   // Response data (success only)
  error?: {                   // Error details (error only)
    type: ErrorTypes;         // Error type classification
    code: string;             // Specific error code
    details?: unknown;        // Additional error details
  };
  timestamp: string;          // ISO timestamp
  requestId?: string;         // Unique request identifier
}

/**
 * Paginated data structure
 */
export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  page?: number;        // Page number (default: 1, min: 1)
  limit?: number;       // Items per page (default: 10, min: 1)
  searchTerm?: string;  // Search term for filtering
  sortOrder?: 'ASC' | 'DESC';  // Sort order (default: DESC)
}