export enum ApiResponseStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ModuleNames {
  APP = 'APP',
  AUTH = 'AUTH',
  UNKNOWN = 'UNKNOWN',
  SYSTEM = 'SYSTEM',
  CORE = 'CORE',
  PUBLIC = 'PUBLIC',
  API = 'API',
  BASE = 'BASE',
  TODO = 'TODO',
  RBAC = 'RBAC',
  USER = 'USER',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION',
  RESOURCE = 'RESOURCE',
  ORGANIZATION = 'ORGANIZATION',
  EMPLOYEE = 'EMPLOYEE',
  STUDENT = 'STUDENT',
  COURSE = 'COURSE',
  COHORT = 'COHORT',
  CLASS = 'CLASS',
  ENROLLMENT = 'ENROLLMENT',
  ENQUIRY = 'ENQUIRY',
  FEEDBACK = 'FEEDBACK',
  PAYMENT = 'PAYMENT',
  EXPENSE = 'EXPENSE',
  AUDIT_LOG = 'AUDITLOG',
  NOTIFICATION = 'NOTIFICATION',
  ANALYTICS = 'ANALYTICS',
  WS = 'WS',
  WORKER = 'WORKER',
}

export enum ApiResponseMessage {
  SUCCESS = 'Operation completed successfully',
  ERROR = 'Operation failed',
  NOT_FOUND = 'Resource not found',
  INVALID_REQUEST = 'Invalid request',

  CREATE_SUCCESS = '{module} created successfully',
  CREATE_ERROR = 'Failed to create {module}',

  FETCH_SUCCESS = '{module} fetched successfully',
  FETCH_ERROR = 'Failed to fetch {module}',
  FETCH_ALL_SUCCESS = 'All {module}s fetched successfully',
  FETCH_ALL_ERROR = 'Failed to fetch {module}s',

  UPDATE_SUCCESS = '{module} updated successfully',
  UPDATE_ERROR = 'Failed to update {module}',

  DELETE_SUCCESS = '{module} deleted successfully',
  DELETE_ERROR = 'Failed to delete {module}',

  ENABLE_SUCCESS = '{module} enabled successfully',
  DISABLE_SUCCESS = '{module} disabled successfully',

  NOT_FOUND_ERROR = '{module} not found',
  ALREADY_EXISTS = '{module} already exists',
  INVALID_DATA = 'Invalid {module} data',

  AUTH_SUCCESS = 'Authentication successful',
  AUTH_FAILED = 'Authentication failed',
  TOKEN_INVALID = 'Invalid token',
  TOKEN_EXPIRED = 'Token expired',

  VALIDATION_ERROR = 'Validation failed',
  INVALID_INPUT = 'Invalid input provided',
  REQUIRED_FIELD = 'Required field missing',
  INVALID_FORMAT = 'Invalid data format',

  DB_ERROR = 'Database operation failed',
  DUPLICATE_ENTRY = 'Record already exists',
  FOREIGN_KEY_ERROR = 'Invalid reference',

  BAD_REQUEST = 'Bad request',
  UNAUTHORIZED = 'Unauthorized access',
  FORBIDDEN = 'Access forbidden',
  SERVER_ERROR = 'Internal server error',
  INTERNAL_ERROR = 'Internal server error',
}

export enum ErrorTypes {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  AUTHENTICATION = 'AUTH_ERROR',
  AUTHORIZATION = 'ACCESS_ERROR',
  BUSINESS = 'BUSINESS_ERROR',
  SYSTEM = 'SYSTEM_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  TECHNICAL = 'TECHNICAL_ERROR',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export enum ValidationRules {
  REQUIRED = 'Field is required',
  MIN_LENGTH = 'Minimum length not met',
  MAX_LENGTH = 'Maximum length exceeded',
  PATTERN = 'Invalid pattern',
  EMAIL = 'Invalid email format',
  PHONE = 'Invalid phone number',
  PASSWORD = 'Password does not meet security requirements',
  DATE = 'Invalid date format',
}
