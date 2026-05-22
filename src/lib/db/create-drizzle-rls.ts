import { sql } from "drizzle-orm";
// import { PgDatabase } from "drizzle-orm/pg-core";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

type MySchema = typeof schema;
/**
 * Represents the structure of a decoded Supabase JWT.
 * This contains the user's identity and authorization claims.
 */
type SupabaseToken = {
  iss?: string;
  sub?: string; // The user's unique ID (matches auth.uid() in Postgres)
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  role?: string; // Usually 'authenticated' or 'anon'
};

/**
 * Creates a secure Drizzle client wrapper that enforces Supabase Row-Level Security (RLS).
 *
 * @param token - The decoded Supabase JWT for the current user.
 * @param clients - An object containing two Drizzle instances:
 *                  `admin`: Bypasses RLS (use carefully for server-side overrides).
 *                  `client`: The base client that will be wrapped with RLS enforcement.
 * @returns An object containing both the `admin` client and the secure `rls` transaction wrapper.
 */
export function createDrizzle<
  Database extends PostgresJsDatabase<MySchema>,
  Token extends SupabaseToken = SupabaseToken
>(token: Token, { admin, client }: { admin: Database; client: Database }) {
  return {
    admin,

    /**
     * Executes a database transaction securely under the current user's identity.
     * It temporarily sets PostgreSQL session variables so that Supabase RLS policies
     * (like auth.uid() and auth.jwt()) evaluate correctly during the query.
     */
    rls: (async (transaction, ...rest) => {
      return await client.transaction(async (tx) => {
        try {
          // 1. Inject the JWT claims into the Postgres session.
          // This makes the token data available to Supabase's auth.jwt() function in your policies.
          await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify(token)}, TRUE)`);

          // 2. Inject the user's ID specifically.
          // This ensures Supabase's auth.uid() function correctly identifies the requester.
          await tx.execute(sql`select set_config('request.jwt.claim.sub', ${token.sub ?? ""}, TRUE)`);

          // 3. Drop down from superuser to the specific user role.
          // We strictly validate this to prevent SQL injection. If they aren't authenticated, they get 'anon' access.
          const role = token.role === "authenticated" ? "authenticated" : "anon";
          await tx.execute(sql`set local role ${sql.raw(role)}`);

          // Execute the actual queries (e.g., fetching student clearances) using this secure context.
          return await transaction(tx);
        } finally {
          // 4. Teardown: Reset the session variables back to their defaults.
          // This is critical. Because Postgres connections are pooled and reused by the server,
          // failing to clean this up could accidentally leak one user's identity into the next user's request.
          await tx.execute(sql`select set_config('request.jwt.claims', NULL, TRUE)`);
          await tx.execute(sql`select set_config('request.jwt.claim.sub', NULL, TRUE)`);
          await tx.execute(sql`reset role`);
        }
      }, ...rest);
    }) as typeof client.transaction,
  };
}
