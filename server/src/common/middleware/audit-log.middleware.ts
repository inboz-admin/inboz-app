import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogsService } from 'src/resources/audit-logs/audit-logs.service';
import { UserContextService } from '../services/user-context.service';
import { AuditAction } from 'src/resources/audit-logs/entities/audit-log.entity';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';

interface AuditLogRequest extends Request {
  user?: JwtPayload;
  id?: string;
  startTime?: number;
  auditData?: {
    module: string;
    action: AuditAction;
    recordId?: string;
    details?: any;
    description?: string;
  };
}

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditLogMiddleware.name);

  // Routes that should be excluded from audit logging
  private readonly excludedRoutes = [
    '/health',
    '/metrics',
    '/api/v1/audit-logs', // Prevent recursive logging
    '/api/v1/auth/me', // GET current user - no need to log
    '/api/v1/auth/google', // OAuth initiation - no need to log
    '/api/v1/auth/logout', // Logout - no need to log
    '/api/v1/auth/forgot-password', // Password reset - sensitive, don't log
    '/api/v1/auth/verify-reset-otp', // OTP verification - sensitive, don't log
    '/api/v1/auth/reset-password', // Password reset - sensitive, don't log
    '/api/v1/auth/employee/login', // Employee login - no need to log
    '/api/v1/subscriptions/calculate-pricing', // Pricing calculation - helper endpoint
    '/api/v1/subscriptions/calculate-upgrade-pricing', // Upgrade pricing calculation - helper endpoint
    '/api/v1/subscriptions/initiate-payment', // Payment initiation - intermediate step
    '/favicon.ico',
  ];


  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly userContextService: UserContextService,
  ) {}

  async use(req: AuditLogRequest, res: Response, next: NextFunction) {
    // Skip audit logging for excluded routes
    if (this.shouldSkipAudit(req.path)) {
      return next();
    }

    // Extract audit information from request
    const auditData = this.extractAuditData(req);

    // Skip logging if action is null (e.g., GET requests)
    if (!auditData.action) {
      return next();
    }

    // Record start time for performance tracking
    req.startTime = Date.now();
    req.auditData = auditData;

    // Override res.end to capture response and log audit
    const originalEnd = res.end;
    let responseBody: any = null;

    res.end = (chunk?: any, encoding?: any) => {
      // Try to parse response body for CREATE operations
      if (auditData.action === 'CREATE' && chunk) {
        try {
          // Handle Buffer or string
          const responseText = Buffer.isBuffer(chunk) 
            ? chunk.toString('utf8') 
            : chunk?.toString();
          
          if (responseText && responseText.trim()) {
            // Try to parse as JSON
            const parsed = JSON.parse(responseText);
            // Extract data from BaseResponse format if present
            responseBody = parsed?.data || parsed;
          }
        } catch (error) {
          // Response might not be JSON, ignore parsing errors
          this.logger.debug('Could not parse response body for audit log:', error);
        }
      }

      // Log audit event asynchronously without blocking response
      this.logAuditEvent(req, res, auditData, responseBody).catch((error) => {
        this.logger.error('Failed to log audit event:', error);
      });
      return originalEnd.call(res, chunk, encoding);
    };

    next();
  }

  private shouldSkipAudit(path: string): boolean {
    return this.excludedRoutes.some((route) => path.startsWith(route));
  }

  private extractAuditData(req: AuditLogRequest) {
    const { method, path, body, params, query } = req;
    const user = req.user || this.userContextService.getCurrentUser();

    // Determine module from path
    const module = this.extractModuleFromPath(path);

    // Determine action from HTTP method and path
    const action = this.determineAction(method, path);

    // Extract record ID from params or body
    const recordId = this.extractRecordId(params, body, path);

    // Create details object
    const details = this.createDetailsObject(method, body, params, query, path);

    // Create description
    const description = this.createDescription(
      method,
      path,
      user,
      recordId,
      body,
    );

    return {
      module,
      action,
      recordId,
      details,
      description,
    };
  }

  private extractModuleFromPath(path: string): string {
    // Extract module from API path
    const pathParts = path.split('/').filter((part) => part);

    if (
      pathParts.length >= 3 &&
      pathParts[0] === 'api' &&
      pathParts[1] === 'v1'
    ) {
      // Get the resource name (could be kebab-case like 'contact-lists')
      const resourceName = pathParts[2];
      // Convert kebab-case to UPPER_SNAKE_CASE for module name
      return resourceName
        .split('-')
        .map((word) => word.toUpperCase())
        .join('_');
    }

    // Handle special cases
    if (path.includes('/auth')) return 'AUTHENTICATION';
    if (path.includes('/rbac')) return 'RBAC';
    if (path.includes('/worker')) return 'WORKER';

    return 'UNKNOWN';
  }

  private determineAction(method: string, path: string): AuditAction {
    // Handle special conversion endpoint
    if (path.includes('/convert-to-student-with-enrollment')) {
      return AuditAction.CONVERSION;
    }

    // Handle HTTP methods
    switch (method.toUpperCase()) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      case 'GET':
        // Skip logging READ operations
        return null;
      default:
        return AuditAction.SYSTEM;
    }
  }


  private extractRecordId(
    params: any,
    body: any,
    path: string,
  ): string | undefined {
    // Try to extract ID from URL params first (UUID format)
    if (params?.id) {
      return typeof params.id === 'string' ? params.id : String(params.id);
    }

    // Try to extract from body (check common ID fields)
    if (body?.id) {
      return typeof body.id === 'string' ? body.id : String(body.id);
    }

    // Try to extract from path segments (for UPDATE/DELETE operations)
    // Check for UUID format (36 chars with hyphens) or numeric IDs
    const pathParts = path.split('/');
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i];
      // Match UUID format (8-4-4-4-12 hex characters)
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
        return part;
      }
      // Match numeric IDs (for backward compatibility)
      if (/^\d+$/.test(part)) {
        return part;
      }
    }

    // Try to extract from body using common field names
    const commonIdFields = [
      'student_id',
      'course_id',
      'cohort_id',
      'enrollment_id',
      'enquiry_id',
      'feedback_id',
      'payment_id',
      'organization_id',
      'employee_id',
      'class_id',
      'contact_id',
      'contact_list_id',
      'email_template_id',
      'campaign_id',
      'subscription_id',
      'user_id',
    ];
    for (const field of commonIdFields) {
      if (body?.[field]) {
        return typeof body[field] === 'string' ? body[field] : String(body[field]);
      }
    }

    return undefined;
  }

  private createDetailsObject(
    method: string,
    body: any,
    params: any,
    query: any,
    path: string,
  ): any {
    const details: any = {
      method,
      path,
      timestamp: new Date().toISOString(),
    };

    // Add relevant data based on method
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      // Include request body (excluding sensitive fields)
      details.requestBody = this.sanitizeRequestBody(body);
    }

    if (Object.keys(params).length > 0) {
      details.params = params;
    }

    if (Object.keys(query).length > 0) {
      details.query = query;
    }

    return details;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];
    const sanitized = { ...body };

    // Remove sensitive fields
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
      }
    });

    return sanitized;
  }

  private createDescription(
    method: string,
    path: string,
    user: JwtPayload | undefined,
    recordId?: string,
    body?: any,
  ): string {
    const resource = this.extractResourceFromPath(path);
    const action = method.toUpperCase();

    // Create meaningful descriptions based on resource and action
    const meaningfulDescription = this.createMeaningfulDescription(
      resource,
      action,
      body,
      recordId,
    );

    if (meaningfulDescription) {
      return meaningfulDescription;
    }

    // Fallback to generic description
    const resourceName = this.getResourceDisplayName(resource);
    if (recordId) {
      return `${resourceName} with ID ${recordId} ${action.toLowerCase()} successfully`;
    }

    return `${resourceName} ${action.toLowerCase()} successfully`;
  }

  private createMeaningfulDescription(
    resource: string,
    action: string,
    body?: any,
    recordId?: string,
  ): string {
    const resourceName = resource.replace(/-/g, ' ').toLowerCase();

    switch (action) {
      case 'POST':
        return this.getCreateDescription(resourceName, body);
      case 'PUT':
      case 'PATCH':
        return this.getUpdateDescription(resourceName, body, recordId);
      case 'DELETE':
        return this.getDeleteDescription(resourceName, recordId);
      case 'CONVERSION':
        return this.getConversionDescription(resourceName, body, recordId);
      default:
        return '';
    }
  }

  private getCreateDescription(resourceName: string, body?: any): string {
    const recordName = this.getRecordName(resourceName, body);

    switch (resourceName) {
      case 'enquiry':
        return `Enquiry ${recordName} created successfully`;
      case 'feedback':
        return `Feedback ${recordName} created successfully with rating ${body?.rating || 'N/A'}`;
      case 'enrollment':
        return `Enrollment ${recordName} created successfully`;
      case 'payment':
        return `Payment ${recordName} created successfully for $${body?.amount || 'N/A'}`;
      case 'student':
        return `Student ${recordName} created successfully`;
      case 'course':
        return `Course ${recordName} created successfully`;
      case 'cohort':
        return `Cohort ${recordName} created successfully`;
      case 'class':
        return `Class ${recordName} created successfully`;
      case 'organization':
        return `Organization ${recordName} created successfully`;
      case 'employee':
        return `Employee ${recordName} created successfully`;
      default:
        return `${this.getResourceDisplayName(resourceName)} ${recordName} created successfully`;
    }
  }

  private getUpdateDescription(
    resourceName: string,
    body?: any,
    recordId?: string,
  ): string {
    const recordName = this.getRecordName(resourceName, body);

    switch (resourceName) {
      case 'enquiry':
        if (body?.status === 'FOLLOW_UP')
          return `Enquiry ${recordName} status updated to Follow-up successfully`;
        if (body?.status === 'CONVERTED')
          return `Enquiry ${recordName} status updated to Converted successfully`;
        if (body?.status === 'REJECTED')
          return `Enquiry ${recordName} status updated to Rejected successfully`;
        return `Enquiry ${recordName} updated successfully`;
      case 'student':
        if (body?.status === 'GRADUATED')
          return `Student ${recordName} status updated to Graduated successfully`;
        if (body?.status === 'ACTIVE')
          return `Student ${recordName} status updated to Active successfully`;
        if (body?.status === 'INACTIVE')
          return `Student ${recordName} status updated to Inactive successfully`;
        return `Student ${recordName} updated successfully`;
      case 'enrollment':
        if (body?.status === 'COMPLETED')
          return `Enrollment ${recordName} status updated to Completed successfully`;
        if (body?.status === 'ACTIVE')
          return `Enrollment ${recordName} status updated to Active successfully`;
        if (body?.status === 'CANCELLED')
          return `Enrollment ${recordName} status updated to Cancelled successfully`;
        return `Enrollment ${recordName} updated successfully`;
      case 'feedback':
        return `Feedback ${recordName} updated successfully`;
      case 'payment':
        if (body?.status === 'COMPLETED')
          return `Payment ${recordName} status updated to Completed successfully`;
        if (body?.status === 'FAILED')
          return `Payment ${recordName} status updated to Failed successfully`;
        return `Payment ${recordName} updated successfully`;
      case 'course':
        return `Course ${recordName} updated successfully`;
      case 'cohort':
        return `Cohort ${recordName} updated successfully`;
      case 'class':
        return `Class ${recordName} updated successfully`;
      case 'organization':
        return `Organization ${recordName} updated successfully`;
      case 'employee':
        return `Employee ${recordName} updated successfully`;
      default:
        return `${this.getResourceDisplayName(resourceName)} ${recordName} updated successfully`;
    }
  }

  private getDeleteDescription(
    resourceName: string,
    recordId?: string,
  ): string {
    const recordName = this.getRecordName(resourceName, null);

    switch (resourceName) {
      case 'enquiry':
        return `Enquiry ${recordName} deleted successfully`;
      case 'student':
        return `Student ${recordName} deleted successfully`;
      case 'enrollment':
        return `Enrollment ${recordName} deleted successfully`;
      case 'feedback':
        return `Feedback ${recordName} deleted successfully`;
      case 'payment':
        return `Payment ${recordName} deleted successfully`;
      case 'course':
        return `Course ${recordName} deleted successfully`;
      case 'cohort':
        return `Cohort ${recordName} deleted successfully`;
      case 'class':
        return `Class ${recordName} deleted successfully`;
      case 'organization':
        return `Organization ${recordName} deleted successfully`;
      case 'employee':
        return `Employee ${recordName} deleted successfully`;
      default:
        return `${this.getResourceDisplayName(resourceName)} ${recordName} deleted successfully`;
    }
  }

  private getConversionDescription(
    resourceName: string,
    body?: any,
    recordId?: string,
  ): string {
    switch (resourceName) {
      case 'enquiry':
        return `Enquiry #${recordId} conversion to student with enrollment initiated`;
      default:
        return `${this.getResourceDisplayName(resourceName)} conversion initiated`;
    }
  }

  private getResourceDisplayName(resource: string): string {
    const resourceMap: { [key: string]: string } = {
      enquiry: 'Enquiry',
      feedback: 'Feedback',
      enrollment: 'Enrollment',
      payment: 'Payment',
      student: 'Student',
      course: 'Course',
      cohort: 'Cohort',
      class: 'Class',
      organization: 'Organization',
      employee: 'Employee',
      user: 'User',
      notification: 'Notification',
      contact: 'Contact',
      'contact_list': 'Contact List',
      'contact-list': 'Contact List',
      'email_template': 'Email Template',
      'email-template': 'Email Template',
      campaign: 'Campaign',
      tracking: 'Tracking',
      subscription: 'Subscription',
      analytics: 'Analytics',
      'audit_log': 'Audit Log',
      'audit-log': 'Audit Log',
    };

    return (
      resourceMap[resource] ||
      resource.charAt(0).toUpperCase() + resource.slice(1)
    );
  }

  private getRecordName(resourceName: string, body?: any): string {
    // Try to get the most meaningful name field from the request body
    const nameFields = [
      'name',
      'title',
      'firstName',
      'fullName',
      'studentName',
      'courseName',
      'centerName',
      'organizationName',
    ];

    for (const field of nameFields) {
      if (body?.[field]) {
        return body[field];
      }
    }

    // Try to construct name from available fields
    if (resourceName === 'student' && body?.firstName && body?.lastName) {
      return `${body.firstName} ${body.lastName}`;
    }

    if (resourceName === 'employee' && body?.firstName && body?.lastName) {
      return `${body.firstName} ${body.lastName}`;
    }

    // Fallback to generic name
    return '';
  }

  private extractResourceFromPath(path: string): string {
    const pathParts = path.split('/').filter((part) => part);

    if (
      pathParts.length >= 3 &&
      pathParts[0] === 'api' &&
      pathParts[1] === 'v1'
    ) {
      let resource = pathParts[2].replace(/-/g, ' ').toLowerCase();

      // Convert plural resource names to singular
      resource = this.convertToSingular(resource);

      return resource;
    }

    return 'unknown resource';
  }

  private convertToSingular(resource: string): string {
    const pluralToSingular: { [key: string]: string } = {
      students: 'student',
      courses: 'course',
      organizations: 'organization',
      employees: 'employee',
      users: 'user',
      notifications: 'notification',
      enquiries: 'enquiry',
      feedbacks: 'feedback',
      enrollments: 'enrollment',
      payments: 'payment',
      cohorts: 'cohort',
      classes: 'class',
      contacts: 'contact',
      'contact-lists': 'contact-list',
      'email-templates': 'email-template',
      campaigns: 'campaign',
      trackings: 'tracking',
      subscriptions: 'subscription',
      analytics: 'analytics',
      'audit-logs': 'audit-log',
    };

    return pluralToSingular[resource] || resource;
  }

  private async logAuditEvent(
    req: AuditLogRequest,
    res: Response,
    auditData: any,
    responseBody?: any,
  ) {
    try {
      const user = req.user || this.userContextService.getCurrentUser();
      const responseTime = req.startTime ? Date.now() - req.startTime : 0;

      // Extract record ID from response for CREATE operations
      let finalRecordId = auditData.recordId;

      // For CREATE operations, try to extract record ID from response
      if (
        auditData.action === 'CREATE' &&
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        responseBody
      ) {
        try {
          // Handle BaseResponse format: { data: { id: ... } }
          if (responseBody?.data?.id) {
            finalRecordId = typeof responseBody.data.id === 'string' 
              ? responseBody.data.id 
              : String(responseBody.data.id);
          }
          // Handle direct data format: { id: ... }
          else if (responseBody?.id) {
            finalRecordId = typeof responseBody.id === 'string' 
              ? responseBody.id 
              : String(responseBody.id);
          }
        } catch (error) {
          this.logger.debug(
            'Could not extract record ID from response:',
            error,
          );
        }
      }

      // Add response information to details
      const enhancedDetails = {
        ...auditData.details,
        response: {
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
        },
      };

      // Determine organization ID and user ID
      let organizationId: string | undefined;
      let performedByUserId: string | undefined;

      if (user) {
        // Extract organization ID from JWT token
        if (user.organizationId) {
          organizationId = user.organizationId;
        }

        // Set user ID (all authenticated users should be logged)
        performedByUserId = user.sub;

        // Log user information for debugging
        this.logger.debug(
          `User context: ${user.email} (${user.role}) - ID: ${user.sub} - Organization: ${organizationId || 'N/A'}`,
        );
      } else {
        this.logger.warn('No user context found in audit log request');
      }

      // Create audit log entry
      await this.auditLogsService.createAuditLog({
        organizationId: organizationId,
        performedByUserId: performedByUserId,
        module: auditData.module,
        action: auditData.action,
        recordId: finalRecordId,
        details: enhancedDetails,
        description: auditData.description,
        eventTimestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Audit logged: ${auditData.action} on ${auditData.module} by ${user?.email || 'Anonymous'} - Record ID: ${finalRecordId || 'N/A'}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
    }
  }
}
