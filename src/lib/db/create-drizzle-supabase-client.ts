import { createDrizzle } from "./create-drizzle-rls";
import { createClient } from "./supabase-server";
import { drizzle } from "drizzle-orm/postgres-js"; // FIX 1: Use the postgres-js driver
import * as schema from "@/lib/db/schema";
import postgres from "postgres";
import { jwtDecode } from "jwt-decode";

type SupabaseToken = {
  sub?: string;
  role?: string;
};

const config = {
  casing: "snake_case" as const,
  schema,
};

// ByPass RLS
const admin = drizzle(postgres(process.env.ADMIN_DATABASE_URL!, { prepare: false }), config);

// Protected by RLS
const client = drizzle(postgres(process.env.DATABASE_URL!, { prepare: false }), config);

export async function createDrizzleSupabaseClient() {
  // FIX 2: Instantiate Supabase inside the function execution, during the actual request
  const supabase = await createClient();

  // FIX 3: Call getSession on the instantiated client
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No session found");
  }

  const token = jwtDecode<SupabaseToken>(session.access_token);

  return createDrizzle(token, { admin, client });
}
