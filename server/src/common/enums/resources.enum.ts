/**
 * Enum for all available resources in the RBAC system
 */
export enum ResourceName {
  USERS = 'USERS',
  ROLES = 'ROLES',
  RBAC = 'RBAC',
  ACTIONS = 'ACTIONS',
  RESOURCES = 'RESOURCES',
  PROFILES = 'PROFILES',
  SETTINGS = 'SETTINGS',
  TODOS = 'TODOS',
  ORGANIZATIONS = 'ORGANIZATIONS',
  EMPLOYEES = 'EMPLOYEES',
  STUDENTS = 'STUDENTS',
  COURSES = 'COURSES',
  COHORTS = 'COHORTS',
  CLASSES = 'CLASSES',
  ENROLLMENTS = 'ENROLLMENTS',
  ENQUIRIES = 'ENQUIRIES',
  FEEDBACKS = 'FEEDBACKS',
  PAYMENTS = 'PAYMENTS',
  EXPENSES = 'EXPENSES',
  CONTACTS = 'CONTACTS',
  CONTACTLISTS = 'CONTACTLISTS',
  TEMPLATES = 'TEMPLATES',
  ASSETS = 'ASSETS',
  CAMPAIGNS = 'CAMPAIGNS',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  INVOICES = 'INVOICES',
  AUDIT_LOGS = 'AUDITLOGS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  ANALYTICS = 'ANALYTICS',
  OVERVIEW = 'OVERVIEW',
  ALL = 'ALL', // Special resource that grants access to all resources
}

/**
 * Array of all resource names for validation and iteration
 */
export const ALL_RESOURCES = Object.values(ResourceName);

/**
 * Array of specific resource names (excluding ALL)
 */
export const SPECIFIC_RESOURCES = Object.values(ResourceName).filter(
  (resource) => resource !== ResourceName.ALL,
);

/**
 * Check if a string is a valid resource name
 * @param resource - The resource string to validate
 * @returns true if resource exists, false otherwise
 */
export function isValidResource(resource: string): resource is ResourceName {
  return Object.values(ResourceName).includes(resource as ResourceName);
}
