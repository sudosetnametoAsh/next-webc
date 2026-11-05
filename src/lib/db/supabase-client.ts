import { configureAuthenticatedRealtime } from "./authenticated-realtime";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  const client = createBrowserClient(supabaseUrl!, supabaseKey!);
  if (typeof window !== "undefined") configureAuthenticatedRealtime(client);
  return client;
};
