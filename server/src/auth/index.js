// Auth module - centralized authentication logic
export { attachCurrentUser, requireAuth, requireRole } from './middleware/auth.js';
export { default as auth } from './auth.js';