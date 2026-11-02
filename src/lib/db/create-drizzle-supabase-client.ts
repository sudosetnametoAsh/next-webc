import { createDrizzle } from "./create-drizzle-rls";
import { createClient } from "./supabase-server";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";
import { jwtDecode } from "jwt-decode";
import { queryClient } from "@/lib/db";

type SupabaseToken = {
  sub?: string;
  role?: string;
};

const config = {
  casing: "snake_case" as const,
  schema,
};

// Reuse shared global singleton connection pool to avoid connection exhaustion in Next.js
const admin = drizzle(queryClient, config);
const client = drizzle(queryClient, config);

export async function createDrizzleSupabaseClient() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No session found");
  }

  const token = jwtDecode<SupabaseToken>(session.access_token);

  return createDrizzle(token, { admin, client });
}

export type DrizzleSupabaseClient = Awaited<
  ReturnType<typeof createDrizzleSupabaseClient>
>;
