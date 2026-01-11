import { Injectable, Inject } from '@nestjs/common';
import { UserContextService } from '../services/user-context.service';

/**
 * Enhanced repository decorator that automatically injects UserContextService
 * This enables automatic current user detection in repositories without boilerplate
 */
export function EnhancedRepository() {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    // Add Injectable decorator if not present
    Injectable()(constructor);

    // Create new constructor that injects UserContextService
    const enhancedConstructor = class extends constructor {
      constructor(...args: any[]) {
        // Find UserContextService in the arguments
        const userContextService = args.find(
          (arg) => arg instanceof UserContextService,
        );

        // Call parent constructor with UserContextService injected
        super(...args, userContextService);
      }
    };

    // Copy metadata from original constructor
    Object.defineProperty(enhancedConstructor, 'name', {
      value: constructor.name,
    });

    return enhancedConstructor as T;
  };
}

/**
 * Inject UserContextService into repository constructors
 * Use this decorator on repository constructor parameters
 */
export const InjectUserContext = () => Inject(UserContextService);
