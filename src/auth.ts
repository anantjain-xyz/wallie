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