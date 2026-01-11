import { UserContextService } from '../services/user-context.service';

/**
 * Method decorator that automatically injects current user ID into repository method calls
 * This can be applied to repository methods to reduce boilerplate
 */
export function AutoAudit() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Check if this is a repository method that accepts currentUserId
      const methodName = propertyName;
      const auditMethods = [
        'create',
        'update',
        'delete',
        'forceDelete',
        'restore',
      ];

      if (auditMethods.includes(methodName)) {
        // Get UserContextService instance
        const userContextService: UserContextService = (this as any)
          .userContextService;

        if (userContextService) {
          const currentUserId = userContextService.getCurrentUserId();

          // If currentUserId is not already provided and we have one from context
          const lastArgIndex = args.length - 1;
          if (
            currentUserId &&
            (args[lastArgIndex] === undefined || args[lastArgIndex] === null)
          ) {
            args[lastArgIndex] = currentUserId;
          }
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Class decorator that applies AutoAudit to all audit-related methods
 */
export function AutoAuditRepository() {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const auditMethods = [
      'create',
      'update',
      'delete',
      'forceDelete',
      'restore',
    ];

    auditMethods.forEach((methodName) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        constructor.prototype,
        methodName,
      );
      if (descriptor) {
        AutoAudit()(constructor.prototype, methodName, descriptor);
        Object.defineProperty(constructor.prototype, methodName, descriptor);
      }
    });

    return constructor;
  };
}
