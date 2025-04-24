import { APPLICATION_STATUS } from '../constants/statuses';

/**
 * Type adapter utilities to handle mismatches between type definitions
 * across different parts of the application.
 */

// Define the key type for APPLICATION_STATUS
export type ApplicationStatusKey = keyof typeof APPLICATION_STATUS;

// Define the value type for APPLICATION_STATUS
export type ApplicationStatusValue = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

/**
 * Convert a status key to its corresponding enum value
 * @param statusKey The status key (e.g., "APPROVED", "PENDING")
 * @returns The corresponding enum value (e.g., "approved", "pending")
 */
export function asStatusValue(statusKey: ApplicationStatusKey): ApplicationStatusValue {
  return APPLICATION_STATUS[statusKey];
}

/**
 * Convert a status value to its corresponding key
 * @param statusValue The status value (e.g., "approved", "pending")
 * @returns The corresponding key (e.g., "APPROVED", "PENDING")
 */
export function asStatusKey(statusValue: ApplicationStatusValue): ApplicationStatusKey {
  for (const key in APPLICATION_STATUS) {
    if (APPLICATION_STATUS[key as ApplicationStatusKey] === statusValue) {
      return key as ApplicationStatusKey;
    }
  }
  // Default fallback
  return 'NEW';
}

/**
 * Compare a status key with an enum value safely
 * @param statusKey The status key (e.g., "APPROVED")
 * @param enumValue The enum value to compare with (e.g., APPLICATION_STATUS.APPROVED)
 * @returns True if they match, false otherwise
 */
export function statusEquals(statusKey: ApplicationStatusKey, enumValue: ApplicationStatusValue): boolean {
  return APPLICATION_STATUS[statusKey] === enumValue;
}

/**
 * Add requested_amount property to any Application object
 * This is a utility to handle missing properties in type definitions
 */
export function withRequestedAmount<T extends object>(app: T): T & { requested_amount: number } {
  return {
    ...app,
    requested_amount: (app as any).amount || (app as any).requested_amount || 0
  };
} 