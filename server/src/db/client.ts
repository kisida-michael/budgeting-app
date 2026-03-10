import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

const connection = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false
});

export const db = drizzle(connection, { schema });
export { connection };
