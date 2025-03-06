// Define User type based on Clerk's user object structure
type User = {
  id: string;
  primaryEmailAddress?: { emailAddress: string };
  emailAddresses?: Array<{ emailAddress: string }>;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
};

/**
 * Updates the app_user table with the latest user profile information
 * @param user The Clerk user object
 * @param db The PGlite database instance
 */
export const updateUserProfile = async (user: User, db: any) => {
  try {
    // Get primary email
    const primaryEmail = user.primaryEmailAddress?.emailAddress;
    if (!primaryEmail) {
      console.error('No primary email found for user');
      return;
    }
    
    // Extract user information
    const fullName = user.fullName || 
      (user.firstName && user.lastName ? 
        `${user.firstName} ${user.lastName}` : 
        user.firstName || user.lastName || null);
    
    const profilePicture = user.imageUrl || null;
    
    if (!db) {
      console.error('Database instance not provided');
      return;
    }
    
    // Update the user in the database
    // Set the modified timestamp, but let triggers handle modified_columns
    const result = await db.query(`
      UPDATE app_user
      SET 
        full_name = $1,
        profile_picture = $2,
        modified = NOW()
      WHERE email = $3
      RETURNING *
    `, [fullName, profilePicture, primaryEmail]);
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}; 