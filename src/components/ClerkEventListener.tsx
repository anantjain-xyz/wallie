import { useEffect } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { updateUserProfile } from '../utils/clerk-listeners';
import { usePGlite } from '@electric-sql/pglite-react';

/**
 * Component that sets up Clerk event listeners
 * This should be mounted once in your application
 */
export const ClerkEventListener = () => {
  const clerk = useClerk();
  const { user } = useUser();
  const db = usePGlite();

  useEffect(() => {
    if (!clerk || !db) return;

    // Set up event listener for user updates
    // @ts-ignore - Clerk types are not fully compatible
    const unsubscribe = clerk.addListener((event: any) => {
      if (event.type === 'user.updated') {
        
        // Convert Clerk user data to our expected format
        const userData = {
          id: event.data.id,
          primaryEmailAddress: event.data.primaryEmailAddress ? {
            emailAddress: event.data.primaryEmailAddress.emailAddress
          } : undefined,
          emailAddresses: event.data.emailAddresses,
          fullName: event.data.fullName,
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          imageUrl: event.data.imageUrl
        };
        updateUserProfile(userData, db);
      }
    });

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

    // Clean up listener when component unmounts
    return () => {
      // @ts-ignore - Clerk types are not fully compatible
      unsubscribe();
    };
  }, [clerk, user, db]);

  // This component doesn't render anything
  return null;
};

export default ClerkEventListener; 