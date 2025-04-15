import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { updateUserProfile } from '../utils/clerk-listeners';
import { usePGlite } from '@electric-sql/pglite-react';

/**
 * Component that sets up Clerk event listeners
 * This should be mounted once in your application
 */
export const ClerkEventListener = () => {
  const { user } = useUser();
  const db = usePGlite();

  useEffect(() => {
    if (!db) return;

    // Initial update with current user data if available
    if (user) {
      // Convert Clerk user data to our expected format
      const userData = {
        id: user.id,
        primaryEmailAddress: user.primaryEmailAddress ? {
          emailAddress: user.primaryEmailAddress.emailAddress
        } : undefined,
        emailAddresses: user.emailAddresses,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl
      };
      updateUserProfile(userData, db);
    }

  }, [user, db]);

  // This component doesn't render anything
  return null;
};

export default ClerkEventListener; 