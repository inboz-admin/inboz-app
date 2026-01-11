import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';

/**
 * Service that manages user context using AsyncLocalStorage
 * This allows accessing the current user anywhere in the request lifecycle
 * without explicitly passing it through method parameters
 */
@Injectable()
export class UserContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<JwtPayload>();

  /**
   * Run a function with user context
   */
  run<T>(user: JwtPayload | undefined, fn: () => T): T {
    return this.asyncLocalStorage.run(user, fn);
  }

  /**
   * Get the current user from context
   */
  getCurrentUser(): JwtPayload | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get the current user ID from context
   */
  getCurrentUserId(): string | undefined {
    const user = this.getCurrentUser();
    return user?.sub;
  }

  /**
   * Get the current user email from context
   */
  getCurrentUserEmail(): string | undefined {
    const user = this.getCurrentUser();
    return user?.email;
  }

  /**
   * Get the current user role from context
   */
  getCurrentUserRole(): string | undefined {
    const user = this.getCurrentUser();
    return user?.role;
  }

  /**
   * Check if a user is currently authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
}
