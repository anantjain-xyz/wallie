import { useAuth } from '@clerk/clerk-react';

export function useElectricAuth() {
  const { getToken } = useAuth();
  
  const getAuthHeaders = async () => {
    try {
      const token = await getToken();
      return {
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return {};
    }
  };

  return {
    getAuthHeaders
  };
}

export async function validateAuthToken(token: string) {
  // TODO: Implement your token validation logic here
  // For example, verifying the JWT token. This should be
  // used in a reverse proxy before the request reaches the
  // electric server.
  try {
    // For now, we'll just check if the token exists
    return !!token;
  } catch (error) {
    console.error('Failed to validate token:', error);
    return false;
  }
} 