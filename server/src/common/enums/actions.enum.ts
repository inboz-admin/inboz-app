/**
 * Enum for all available actions in the RBAC system
 */
export enum ActionName {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

/**
 * Array of all action names for validation and iteration
 */
export const ALL_ACTIONS = Object.values(ActionName);

/**
 * Check if a string is a valid action name
 * @param action - The action string to validate
 * @returns true if action exists, false otherwise
 */
export function isValidAction(action: string): action is ActionName {
  return Object.values(ActionName).includes(action as ActionName);
}
