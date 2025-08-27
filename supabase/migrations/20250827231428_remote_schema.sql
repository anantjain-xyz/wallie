

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agent_run" (
    "id" "uuid" NOT NULL,
    "issue_id" "uuid" NOT NULL,
    "app_user_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "model_provider" "text" NOT NULL,
    "model_name" "text" NOT NULL,
    "status" "text",
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."agent_run" REPLICA IDENTITY FULL;


ALTER TABLE "public"."agent_run" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_run_message" (
    "id" "uuid" NOT NULL,
    "agent_run_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."agent_run_message" REPLICA IDENTITY FULL;


ALTER TABLE "public"."agent_run_message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_user" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "username" "text",
    "full_name" "text",
    "profile_picture" "text",
    "workspace_id" "uuid" NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."app_user" REPLICA IDENTITY FULL;


ALTER TABLE "public"."app_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."atdatabases_migrations_applied" (
    "id" bigint NOT NULL,
    "index" integer NOT NULL,
    "name" "text" NOT NULL,
    "script" "text" NOT NULL,
    "applied_at" timestamp with time zone NOT NULL,
    "ignored_error" "text",
    "obsolete" boolean NOT NULL
);


ALTER TABLE "public"."atdatabases_migrations_applied" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."atdatabases_migrations_applied_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."atdatabases_migrations_applied_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."atdatabases_migrations_applied_id_seq" OWNED BY "public"."atdatabases_migrations_applied"."id";



CREATE TABLE IF NOT EXISTS "public"."atdatabases_migrations_version" (
    "id" integer NOT NULL,
    "version" "text"
);


ALTER TABLE "public"."atdatabases_migrations_version" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment" (
    "id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "issue_id" "uuid" NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_id" "uuid" NOT NULL
);

ALTER TABLE ONLY "public"."comment" REPLICA IDENTITY FULL;


ALTER TABLE "public"."comment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."github_branch" (
    "id" "uuid" NOT NULL,
    "issue_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "pull_request_link" "text",
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."github_branch" REPLICA IDENTITY FULL;


ALTER TABLE "public"."github_branch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."github_installation" (
    "id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "installation_id" bigint NOT NULL,
    "installation_url" "text" NOT NULL,
    "app_id" bigint NOT NULL,
    "target_type" "text" NOT NULL,
    "target_name" "text" NOT NULL,
    "permissions" "jsonb" NOT NULL,
    "repositories" "jsonb",
    "access_token" "text",
    "token_expires_at" timestamp with time zone,
    "suspended" boolean DEFAULT false NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."github_installation" REPLICA IDENTITY FULL;


ALTER TABLE "public"."github_installation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."github_repository" (
    "id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "github_installation_id" "uuid" NOT NULL,
    "installation_id" bigint NOT NULL,
    "repo_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "private" boolean NOT NULL,
    "html_url" "text" NOT NULL,
    "description" "text",
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_programming_language" "text"
);

ALTER TABLE ONLY "public"."github_repository" REPLICA IDENTITY FULL;


ALTER TABLE "public"."github_repository" OWNER TO "postgres";


COMMENT ON COLUMN "public"."github_repository"."default_programming_language" IS 'The default programming language used in this repository (e.g., TYPESCRIPT, PYTHON, etc.)';



CREATE TABLE IF NOT EXISTS "public"."issue" (
    "id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "status" "text" NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kanbanorder" "text" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "github_repository_id" "uuid",
    "assignee_id" "uuid",
    "estimate" integer,
    "external_id" integer,
    "plan" "text",
    "design" "text"
);

ALTER TABLE ONLY "public"."issue" REPLICA IDENTITY FULL;


ALTER TABLE "public"."issue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issue_link" (
    "id" "uuid" NOT NULL,
    "source_issue_id" "uuid" NOT NULL,
    "target_issue_id" "uuid" NOT NULL,
    "link_type" "text" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."issue_link" REPLICA IDENTITY FULL;


ALTER TABLE "public"."issue_link" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "allowlisted_domains" "text"[],
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "current_billing_cycle_start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "successful_agent_runs_this_cycle" integer DEFAULT 0 NOT NULL,
    "stripe_customer_id" "text"
);

ALTER TABLE ONLY "public"."workspace" REPLICA IDENTITY FULL;


ALTER TABLE "public"."workspace" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_secret" (
    "id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "value_preview" "text",
    "created_by" "text",
    "created" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_secret" OWNER TO "postgres";


ALTER TABLE ONLY "public"."atdatabases_migrations_applied" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."atdatabases_migrations_applied_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agent_run_message"
    ADD CONSTRAINT "agent_run_message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_run"
    ADD CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_workspace_email_key" UNIQUE ("workspace_id", "email");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_workspace_username_key" UNIQUE ("workspace_id", "username");



ALTER TABLE ONLY "public"."atdatabases_migrations_applied"
    ADD CONSTRAINT "atdatabases_migrations_applied_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."atdatabases_migrations_version"
    ADD CONSTRAINT "atdatabases_migrations_version_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."github_branch"
    ADD CONSTRAINT "github_branch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."github_installation"
    ADD CONSTRAINT "github_installation_installation_id_unique" UNIQUE ("installation_id");



ALTER TABLE ONLY "public"."github_installation"
    ADD CONSTRAINT "github_installation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."github_repository"
    ADD CONSTRAINT "github_repository_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."github_repository"
    ADD CONSTRAINT "github_repository_repo_installation_unique" UNIQUE ("repo_id", "github_installation_id");



ALTER TABLE ONLY "public"."issue_link"
    ADD CONSTRAINT "issue_link_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issue"
    ADD CONSTRAINT "issue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issue"
    ADD CONSTRAINT "issue_workspace_id_external_id_unique" UNIQUE ("workspace_id", "external_id");



ALTER TABLE ONLY "public"."workspace"
    ADD CONSTRAINT "workspace_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_secret"
    ADD CONSTRAINT "workspace_secret_key_workspace_unique" UNIQUE ("key", "workspace_id");



ALTER TABLE ONLY "public"."workspace_secret"
    ADD CONSTRAINT "workspace_secret_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace"
    ADD CONSTRAINT "workspace_url_key" UNIQUE ("url");



CREATE INDEX "agent_run_app_user_id_idx" ON "public"."agent_run" USING "btree" ("app_user_id");



CREATE INDEX "agent_run_issue_id_idx" ON "public"."agent_run" USING "btree" ("issue_id");



CREATE INDEX "agent_run_message_agent_run_id_idx" ON "public"."agent_run_message" USING "btree" ("agent_run_id");



CREATE INDEX "agent_run_message_workspace_id_idx" ON "public"."agent_run_message" USING "btree" ("workspace_id");



CREATE INDEX "agent_run_workspace_id_idx" ON "public"."agent_run" USING "btree" ("workspace_id");



CREATE INDEX "issue_external_id_idx" ON "public"."issue" USING "btree" ("external_id");



CREATE INDEX "issue_workspace_external_id_idx" ON "public"."issue" USING "btree" ("workspace_id", "external_id");



CREATE INDEX "workspace_secret_key_idx" ON "public"."workspace_secret" USING "btree" ("key");



CREATE INDEX "workspace_secret_workspace_id_idx" ON "public"."workspace_secret" USING "btree" ("workspace_id");



CREATE INDEX "workspace_tier_idx" ON "public"."workspace" USING "btree" ("tier");



ALTER TABLE ONLY "public"."agent_run"
    ADD CONSTRAINT "agent_run_app_user_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_run"
    ADD CONSTRAINT "agent_run_issue_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_run_message"
    ADD CONSTRAINT "agent_run_message_agent_run_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_run"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_run_message"
    ADD CONSTRAINT "agent_run_message_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_run"
    ADD CONSTRAINT "agent_run_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."app_user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_branch"
    ADD CONSTRAINT "github_branch_issue_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_branch"
    ADD CONSTRAINT "github_branch_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_installation"
    ADD CONSTRAINT "github_installation_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_repository"
    ADD CONSTRAINT "github_repository_installation_fk" FOREIGN KEY ("github_installation_id") REFERENCES "public"."github_installation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_repository"
    ADD CONSTRAINT "github_repository_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issue"
    ADD CONSTRAINT "issue_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."app_user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."issue"
    ADD CONSTRAINT "issue_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."app_user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issue"
    ADD CONSTRAINT "issue_github_repository_fk" FOREIGN KEY ("github_repository_id") REFERENCES "public"."github_repository"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."issue_link"
    ADD CONSTRAINT "issue_link_source_issue_id_fkey" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issue_link"
    ADD CONSTRAINT "issue_link_target_issue_id_fkey" FOREIGN KEY ("target_issue_id") REFERENCES "public"."issue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issue_link"
    ADD CONSTRAINT "issue_link_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issue"
    ADD CONSTRAINT "issue_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_secret"
    ADD CONSTRAINT "workspace_secret_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE CASCADE;



CREATE PUBLICATION "electric_publication_default" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "electric_publication_default" OWNER TO "postgres";




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."agent_run" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."agent_run_message" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."app_user" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."comment" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."github_branch" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."github_installation" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."github_repository" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."issue" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."issue_link" WHERE ((("workspace_id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("workspace_id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("workspace_id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



ALTER PUBLICATION "electric_publication_default" ADD TABLE ONLY "public"."workspace" WHERE ((("id" = '8c3db903-f616-4746-a1b4-8f92360b0e58'::"uuid") OR ("id" = '75474ef0-8f28-4c25-8586-392340a01665'::"uuid") OR ("id" = '32e7f764-617f-4c49-b926-3dce0703c3f3'::"uuid")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";












































































































































































































GRANT ALL ON TABLE "public"."agent_run" TO "anon";
GRANT ALL ON TABLE "public"."agent_run" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_run" TO "service_role";



GRANT ALL ON TABLE "public"."agent_run_message" TO "anon";
GRANT ALL ON TABLE "public"."agent_run_message" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_run_message" TO "service_role";



GRANT ALL ON TABLE "public"."app_user" TO "anon";
GRANT ALL ON TABLE "public"."app_user" TO "authenticated";
GRANT ALL ON TABLE "public"."app_user" TO "service_role";



GRANT ALL ON TABLE "public"."atdatabases_migrations_applied" TO "anon";
GRANT ALL ON TABLE "public"."atdatabases_migrations_applied" TO "authenticated";
GRANT ALL ON TABLE "public"."atdatabases_migrations_applied" TO "service_role";



GRANT ALL ON SEQUENCE "public"."atdatabases_migrations_applied_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."atdatabases_migrations_applied_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."atdatabases_migrations_applied_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."atdatabases_migrations_version" TO "anon";
GRANT ALL ON TABLE "public"."atdatabases_migrations_version" TO "authenticated";
GRANT ALL ON TABLE "public"."atdatabases_migrations_version" TO "service_role";



GRANT ALL ON TABLE "public"."comment" TO "anon";
GRANT ALL ON TABLE "public"."comment" TO "authenticated";
GRANT ALL ON TABLE "public"."comment" TO "service_role";



GRANT ALL ON TABLE "public"."github_branch" TO "anon";
GRANT ALL ON TABLE "public"."github_branch" TO "authenticated";
GRANT ALL ON TABLE "public"."github_branch" TO "service_role";



GRANT ALL ON TABLE "public"."github_installation" TO "anon";
GRANT ALL ON TABLE "public"."github_installation" TO "authenticated";
GRANT ALL ON TABLE "public"."github_installation" TO "service_role";



GRANT ALL ON TABLE "public"."github_repository" TO "anon";
GRANT ALL ON TABLE "public"."github_repository" TO "authenticated";
GRANT ALL ON TABLE "public"."github_repository" TO "service_role";



GRANT ALL ON TABLE "public"."issue" TO "anon";
GRANT ALL ON TABLE "public"."issue" TO "authenticated";
GRANT ALL ON TABLE "public"."issue" TO "service_role";



GRANT ALL ON TABLE "public"."issue_link" TO "anon";
GRANT ALL ON TABLE "public"."issue_link" TO "authenticated";
GRANT ALL ON TABLE "public"."issue_link" TO "service_role";



GRANT ALL ON TABLE "public"."workspace" TO "anon";
GRANT ALL ON TABLE "public"."workspace" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_secret" TO "anon";
GRANT ALL ON TABLE "public"."workspace_secret" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_secret" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
