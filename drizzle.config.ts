import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/src/db/schema.ts",
  out: "./server/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/jsheehan_budget"
  }
});
