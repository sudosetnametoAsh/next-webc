import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL!;
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient);
