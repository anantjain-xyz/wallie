-- Drop the pgjwt extension as it is not used in this project
-- JWT handling is done through Supabase's built-in request.jwt.claims mechanism

DROP EXTENSION IF EXISTS "pgjwt" CASCADE;

