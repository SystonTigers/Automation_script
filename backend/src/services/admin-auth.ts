import { AuthError } from './auth';
import type { UserContext } from '../types';

/**
 * Validates that the authenticated user has admin role.
 * Throws AuthError(403) if user doesn't have admin privileges.
 */
export function requireAdmin(user: UserContext): void {
  if (!user.roles.includes('admin')) {
    throw new AuthError('Admin role required', 403);
  }
}

/**
 * Checks if user has admin role without throwing.
 */
export function isAdmin(user: UserContext): boolean {
  return user.roles.includes('admin');
}
