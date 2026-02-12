// API Module Exports

// Main API Service
export { ApiService, apiService } from "./apiService";

// Auth Service
export { AuthService, authService, AuthHelpers } from "./authService";
export type { LoginRequest, LoginResponse, User } from "./authService";

// Organization Service
export {
  organizationService,
  OrganizationHelpers,
} from "./organizationService";
export type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
  GetOrganizationsResponse,
  OrganizationStatus,
  OrganizationSettings,
} from "./organizationTypes";
export {
  OrganizationStatusLabels,
  OrganizationStatusColors,
  CommonTimezones,
} from "./organizationTypes";
export type { SubscriptionStatus as OrgSubscriptionStatus } from "./organizationTypes";
export { SubscriptionStatusLabels as OrgSubscriptionStatusLabels, SubscriptionStatusColors as OrgSubscriptionStatusColors } from "./organizationTypes";

// Employee Service
export { employeeService } from "./employeeService";
export type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GetEmployeesParams,
  GetEmployeesResponse,
  EmployeeRole,
  EmployeeStatus,
} from "./employeeTypes";
export {
  EmployeeRoleLabels,
  EmployeeStatusLabels,
  EmployeeStatusColors,
  EmployeeHelpers,
} from "./employeeTypes";

// Platform Employee Service
export { platformEmployeeService } from "./platformEmployeeService";
export type {
  PlatformEmployee,
  CreatePlatformEmployeeRequest,
  UpdatePlatformEmployeeRequest,
  GetPlatformEmployeesParams,
} from "./platformEmployeeTypes";
export {
  PlatformEmployeeRole,
  PlatformEmployeeStatus,
  PlatformEmployeeRoleLabels,
  PlatformEmployeeStatusLabels,
  PlatformEmployeeStatusColors,
} from "./platformEmployeeTypes";

// User Service
export { userService } from "./userService";
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  GetUsersParams,
  GetUsersResponse,
  UserRole,
  UserStatus,
} from "./userTypes";
export {
  UserRoleLabels,
  UserStatusLabels,
  UserStatusColors,
  UserHelpers,
} from "./userTypes";

// Role Service (RBAC)
export { roleService } from "./roleService";
export type {
  Role,
  RoleAction,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  GetRolesParams,
  ModuleActionsResponse,
} from "./roleTypes";
export { ActionType, ModuleName } from "./roleTypes";

// Audit Log Service
export { auditLogService } from "./auditService";
export type {
  AuditLog,
  AuditLogFilters,
  PaginatedAuditLogs,
  AuditAction,
  AuditModule,
  AuditStatus,
} from "./auditTypes";
export {
  AuditActionLabels,
  AuditModuleLabels,
  AuditStatusLabels,
  AuditStatusColors,
  AuditActionColors,
  AuditLogHelpers,
} from "./auditTypes";

// Course Service
export { courseService } from "./courseService";
export type {
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
  GetCoursesParams,
  GetCoursesResponse,
  CourseStatus,
} from "./courseTypes";
export {
  CourseStatusLabels,
  CourseStatusColors,
  CourseHelpers,
} from "./courseTypes";

// Cohort Service
export { cohortService } from "./cohortService";
export type {
  Cohort,
  CreateCohortRequest,
  UpdateCohortRequest,
  GetCohortsParams,
  GetCohortsResponse,
  CohortStatus,
} from "./cohortTypes";
export {
  CohortStatusLabels,
  CohortStatusColors,
  CohortHelpers,
} from "./cohortTypes";

// Student Service
export { studentService } from "./studentService";
export type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  GetStudentsParams,
  GetStudentsResponse,
  StudentStatus,
} from "./studentTypes";
export {
  StudentStatusLabels,
  StudentStatusColors,
  StudentHelpers,
} from "./studentTypes";

// Contact Service
export { contactService } from "./contactService";
export type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  GetContactsParams,
  GetContactsResponse,
  ContactStatus,
} from "./contactTypes";
export {
  ContactStatusLabels,
  ContactStatusColors,
  ContactSourceLabels,
  ContactHelpers,
} from "./contactTypes";

// Contact List Service
export { contactListService } from "./contactListService";
export type {
  ContactList,
  CreateContactListRequest,
  UpdateContactListRequest,
  GetContactListsParams,
  AddContactsToListRequest,
  RemoveContactsFromListRequest,
  AddContactsResponse,
  RemoveContactsResponse,
  GetListContactsResponse,
} from "./contactListTypes";

// Email Template Service
export { emailTemplateService } from "./emailTemplateService";

// Upload Service
export { uploadImage } from "./uploadService";
export type { UploadedImage, UploadImageResponse } from "./uploadService";

// Asset Service
export { assetService } from "./assetService";
export type { Asset, CreateAssetRequest, GetAssetsParams } from "./assetTypes";
export type {
  EmailTemplate,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
  DuplicateEmailTemplateDto,
  EmailTemplatePreviewDto,
  EmailTemplatePreviewResponse,
  EmailTemplateVariablesResponse,
  PaginatedEmailTemplatesResponse,
} from "./emailTemplateTypes";

// Subscription Service
export { subscriptionService } from "./subscriptionService";
// Re-export all subscription types and values
export * from "./subscriptionTypes";

// Invoice Service
export { invoiceService } from "./invoiceService";
export type {
  Invoice,
  InvoiceLineItem,
  GetInvoicesParams,
  GetInvoicesResponse,
  InvoiceStatus,
} from "./invoiceTypes";
export {
  InvoiceStatusLabels,
  InvoiceStatusColors,
} from "./invoiceTypes";

// Payment Service
export { paymentService } from "./paymentService";
export type {
  BillingCycle,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  CancelSubscriptionRequest,
} from "./paymentService";

// Analytics Service
export { analyticsService } from "./analyticsService";
export type {
  KpiStats,
  UserWiseAnalytics,
  AnalyticsQueryParams,
  CampaignAnalytics,
  EmailStatusBreakdown,
  CampaignStatusDistribution,
} from "./analyticsTypes";

// Notification Service
export { notificationService } from "./notificationService";
export type {
  Notification,
  NotificationResponse,
  UnreadCountResponse,
  GetNotificationsParams,
  NotificationType,
} from "./notificationTypes";

// Types and Interfaces
export * from "./types";

// Default export
export { apiService as default } from "./apiService";
