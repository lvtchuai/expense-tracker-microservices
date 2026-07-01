/**
 * Service-to-service auth. Internal callers (e.g. import-worker) send
 * INTERNAL_HEADER with the shared INTERNAL_API_KEY instead of a user JWT.
 * The acting user id is passed explicitly since there's no user session.
 */
export const INTERNAL_HEADER = 'x-internal-key';
export const INTERNAL_USER_HEADER = 'x-internal-user-id';
