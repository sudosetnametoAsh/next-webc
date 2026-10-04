import { createDrizzle } from "./create-drizzle-rls";
import { createClient } from "./supabase-server";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";
import postgres from "postgres";
import { jwtDecode } from "jwt-decode";
import { redirect } from "next/navigation";

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
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect("/");
  }

  const token = jwtDecode<SupabaseToken>(session.access_token);

  return createDrizzle(token, { admin, client });
}

export type DrizzleSupabaseClient = Awaited<ReturnType<typeof createDrizzleSupabaseClient>>;
