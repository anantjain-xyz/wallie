export const SLUG_REGEX = /^[a-z0-9-]+$/;

// Reserved URL slugs to avoid conflicts with app routes/endpoints
export const RESERVED_SLUGS = new Set([
  'api',
  'settings',
  'create-workspace',
  'issue',
  'search',
  'subscription',
  'webhook',
  'secrets',
  'workspaces',
  'admin',
]);