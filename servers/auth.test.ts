import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProxyAuth } from './auth';
import { createClerkClient } from '@clerk/backend';
import postgres from 'postgres';
import type { Context } from 'hono';

// Create hoisted mocks
const mockGetUser = vi.hoisted(() => vi.fn().mockImplementation(async (userId: string) => null));
const createMockClerkClient = vi.hoisted(() => vi.fn().mockReturnValue({
  users: {
    getUser: mockGetUser
  }
}));

const mockSql = vi.hoisted(() => vi.fn().mockImplementation(async (...args) => []));
const createMockSql = vi.hoisted(() => vi.fn().mockReturnValue(mockSql));

// Mock postgres to return a function that can be mocked per test
vi.mock('postgres', () => ({
  default: createMockSql
}));

// Mock Clerk client
vi.mock('@clerk/backend', () => ({
  createClerkClient: createMockClerkClient
}));

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(),
  clerkMiddleware: vi.fn(() => vi.fn()),
}));

describe('validateProxyAuth', () => {
  let mockContext: Context;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock context
    mockContext = {
      req: {
        raw: {
          url: 'http://example.com/api?table=workspace&where=id=\'123\'',
        },
      },
    } as Context;
  });

  it('should return 401 when no userId is present', async () => {
    const { getAuth } = await import('@hono/clerk-auth');
    (getAuth as any).mockReturnValue({ userId: null });

    const response = await validateProxyAuth(mockContext);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error('Expected Response');
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });

  it('should return 401 when user has no email', async () => {
    const { getAuth } = await import('@hono/clerk-auth');
    (getAuth as any).mockReturnValue({ userId: 'user_123' });

    mockGetUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [],
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    });

    const response = await validateProxyAuth(mockContext);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error('Expected Response');
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized - User not found');
  });

  it('should return 401 when user not found in database', async () => {
    const { getAuth } = await import('@hono/clerk-auth');
    (getAuth as any).mockReturnValue({ userId: 'user_123' });

    mockGetUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [{ 
        emailAddress: 'test@example.com',
        id: 'email_123',
        verified: true
      }],
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    });

    mockSql.mockResolvedValue([]);

    const response = await validateProxyAuth(mockContext);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error('Expected Response');
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized - User not found');
  });

  it('should return null even when workspace ID in DB differs from URL (validateProxyAuth handles this)', async () => {
    const { getAuth } = await import('@hono/clerk-auth');
    (getAuth as any).mockReturnValue({ userId: 'user_123' });

    mockGetUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [{ 
        emailAddress: 'test@example.com',
        id: 'email_123',
        verified: true
      }],
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    });

    mockSql.mockResolvedValue([{ workspace_id: '456' }]); // Different workspace_id than requested

    const response = await validateProxyAuth(mockContext);
    expect(response).toBeNull();
  });

  it('should return null when authentication and workspace access are valid', async () => {
    const { getAuth } = await import('@hono/clerk-auth');
    (getAuth as any).mockReturnValue({ userId: 'user_123' });

    mockGetUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [{ 
        emailAddress: 'test@example.com',
        id: 'email_123',
        verified: true
      }],
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    });

    mockSql.mockResolvedValue([{ workspace_id: '123' }]);

    const response = await validateProxyAuth(mockContext);
    expect(response).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const { getAuth } = await import('@hono/clerk-auth');
    (getAuth as any).mockReturnValue({ userId: 'user_123' });

    mockGetUser.mockRejectedValue(new Error('Clerk API error'));

    const response = await validateProxyAuth(mockContext);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error('Expected Response');
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized - User not found');
  });
});